from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import os, uuid
from pathlib import Path

from app.database import get_db
from app.models import Organization, Admin
from app.api.admin_auth import get_current_admin

router = APIRouter(prefix="/admin/organizations", tags=["admin-organizations"])

# =================== PYDANTIC SCHEMAS ===================

class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: Optional[str] = Field(None, max_length=100)
    custom_domain: Optional[str] = Field(None, max_length=255)
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: Optional[str] = Field(None, max_length=7)
    secondary_color: Optional[str] = Field(None, max_length=7)
    support_email: Optional[str] = None
    plan_tier: str = "basic"
    max_users: Optional[int] = None
    timezone: Optional[str] = "auto"
    has_long_term_sites: Optional[bool] = True
    has_short_term_interventions: Optional[bool] = False
    is_active: bool = True

class OrganizationCreate(OrganizationBase):
    features: Optional[List[str]] = []

class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    slug: Optional[str] = Field(None, max_length=100)
    custom_domain: Optional[str] = Field(None, max_length=255)
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: Optional[str] = Field(None, max_length=7)
    secondary_color: Optional[str] = Field(None, max_length=7)
    support_email: Optional[str] = None
    plan_tier: Optional[str] = None
    max_users: Optional[int] = None
    timezone: Optional[str] = None
    has_long_term_sites: Optional[bool] = None
    has_short_term_interventions: Optional[bool] = None
    is_active: Optional[bool] = None
    features: Optional[List[str]] = None

class OrganizationResponse(OrganizationBase):
    id: str
    features: Optional[List[str]] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ---- Local Admin schemas ----
class LocalAdminCreate(BaseModel):
    email: str
    full_name: str
    password: str
    role: str = "ADMIN"

class LocalAdminResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    organization_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# =================== HELPERS ===================
def check_super_admin(admin: Admin):
    # Un admin cu organization_id setat este un admin de tenant — niciodata super admin
    if getattr(admin, 'organization_id', None):
        raise HTTPException(status_code=403, detail="Acces interzis! Administratorii de companie nu pot gestiona platforma SaaS.")
    if getattr(admin, 'role', '') != 'SUPER_ADMIN' and not getattr(admin, 'is_super_admin', False):
        raise HTTPException(status_code=403, detail="Acces interzis! Doar Super Administratorii pot gestiona companiile (SaaS Tenants).")

# =================== LOGO UPLOAD ===================

LOGO_UPLOAD_DIR = Path("uploads/logos")
LOGO_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_LOGO_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"}

@router.post("/upload-logo")
async def upload_logo(
    file: UploadFile = File(...),
    current_admin: Admin = Depends(get_current_admin)
):
    """Upload a logo for an organization"""
    check_super_admin(current_admin)

    if file.content_type not in ALLOWED_LOGO_TYPES:
        raise HTTPException(status_code=400, detail="Format invalid. Acceptăm: PNG, JPG, SVG, WebP.")

    ext = Path(file.filename).suffix.lower()
    filename = f"{uuid.uuid4()}{ext}"
    file_path = LOGO_UPLOAD_DIR / filename

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="Fișierul este prea mare. Maxim 5MB.")

    with open(file_path, "wb") as f:
        f.write(content)

    return {"logo_url": f"/api/uploads/logos/{filename}"}

# =================== API ENDPOINTS ===================

@router.get("/", response_model=List[OrganizationResponse])
def get_organizations(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Get list of all organizations (Tenants)"""
    check_super_admin(current_admin)
    orgs = db.query(Organization).order_by(Organization.name).all()
    return orgs

@router.get("/{org_id}", response_model=OrganizationResponse)
def get_organization(
    org_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Get organization by ID"""
    check_super_admin(current_admin)
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Compania nu a fost găsită.")
    return org

@router.post("/", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    data: OrganizationCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Create a new organization (Tenant)"""
    check_super_admin(current_admin)
    
    # Validate uniqueness
    if data.slug:
        existing = db.query(Organization).filter(Organization.slug == data.slug).first()
        if existing:
            raise HTTPException(status_code=400, detail="Acest Slug este deja folosit de altă companie.")
            
    if data.custom_domain:
        existing = db.query(Organization).filter(Organization.custom_domain == data.custom_domain).first()
        if existing:
            raise HTTPException(status_code=400, detail="Acest Domeniu este deja folosit de altă companie.")
            
    new_org = Organization(**data.model_dump())
    db.add(new_org)
    db.commit()
    db.refresh(new_org)
    return new_org

@router.put("/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: str,
    data: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Update organization settings (White-labeling etc.)"""
    check_super_admin(current_admin)
    
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Compania nu a fost găsită.")
        
    # Validate uniqueness (exclude current org)
    if data.slug and data.slug != org.slug:
        existing = db.query(Organization).filter(
            Organization.slug == data.slug,
            Organization.id != org_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Acest Slug este deja folosit.")
            
    if data.custom_domain and data.custom_domain != org.custom_domain:
        existing = db.query(Organization).filter(
            Organization.custom_domain == data.custom_domain,
            Organization.id != org_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Acest Domeniu este deja folosit.")
            
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(org, key, value)

        
    db.commit()
    db.refresh(org)
    return org

@router.delete("/{org_id}")
def delete_organization(
    org_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Delete an organization"""
    check_super_admin(current_admin)
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Compania nu a fost găsită.")
        
    db.delete(org)
    db.commit()
    return {"message": "Compania a fost ștearsă cu succes."}


# =================== LOCAL ADMINS PER ORGANIZATION ===================

@router.get("/{org_id}/admins", response_model=List[LocalAdminResponse])
def get_org_admins(
    org_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """List all local admins for a specific organization"""
    check_super_admin(current_admin)
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Compania nu a fost găsită.")
    admins = db.query(Admin).filter(
        Admin.organization_id == org_id,
        Admin.is_super_admin == False
    ).all()
    return admins

@router.post("/{org_id}/admins", response_model=LocalAdminResponse, status_code=status.HTTP_201_CREATED)
def create_org_admin(
    org_id: str,
    data: LocalAdminCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Create a local admin for a specific organization"""
    check_super_admin(current_admin)

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Compania nu a fost găsită.")

    existing = db.query(Admin).filter(Admin.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Există deja un cont cu acest email.")

    import hashlib
    password_hash = hashlib.sha256(data.password.encode()).hexdigest()

    new_admin = Admin(
        email=data.email,
        full_name=data.full_name,
        password_hash=password_hash,
        role=data.role,
        organization_id=org_id,
        is_active=True,
        is_super_admin=False,
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    return new_admin

@router.delete("/{org_id}/admins/{admin_id}")
def delete_org_admin(
    org_id: str,
    admin_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Remove a local admin from an organization"""
    check_super_admin(current_admin)
    admin = db.query(Admin).filter(
        Admin.id == admin_id,
        Admin.organization_id == org_id,
        Admin.is_super_admin == False
    ).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin-ul nu a fost găsit în această companie.")
    db.delete(admin)
    db.commit()
    return {"message": "Admin-ul a fost șters."}

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import Organization, Admin
from app.api.admin_auth import hash_password
from datetime import datetime, timedelta
import re

router = APIRouter(prefix="/api/public", tags=["public"])

class TenantConfigResponse(BaseModel):
    id: str
    name: str
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    timezone: Optional[str] = None
    has_long_term_sites: Optional[bool] = True
    has_short_term_interventions: Optional[bool] = False
    features: Optional[list] = []

@router.get("/tenant-config", response_model=TenantConfigResponse)
def get_tenant_config(domain: Optional[str] = None, slug: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Fetch public configuration for a tenant based on their domain or slug.
    Used by the frontend before login to brand the login page.
    """
    if not domain and not slug:
        raise HTTPException(status_code=400, detail="Must provide domain or slug")

    org = None
    if domain:
        org = db.query(Organization).filter(Organization.custom_domain == domain).first()
        if not org and '.' in domain:
            extracted_slug = domain.split('.')[0]
            org = db.query(Organization).filter(Organization.slug == extracted_slug).first()
            
    if not org and slug:
        org = db.query(Organization).filter(Organization.slug == slug).first()

    if not org or not org.is_active:
        raise HTTPException(status_code=404, detail="Tenant not found or inactive")

    return {
        "id": org.id,
        "name": org.name,
        "logo_url": org.logo_url,
        "favicon_url": org.favicon_url,
        "primary_color": org.primary_color,
        "secondary_color": org.secondary_color,
        "timezone": getattr(org, 'timezone', None),
        "has_long_term_sites": getattr(org, 'has_long_term_sites', True),
        "has_short_term_interventions": getattr(org, 'has_short_term_interventions', False),
        "features": getattr(org, "features", []) or [],
    }

class DemoSignupRequest(BaseModel):
    company_name: str
    admin_name: str
    admin_email: str
    admin_password: str
    phone: Optional[str] = None

def generate_slug(name: str) -> str:
    # Convert to lowercase, remove non-alphanumeric, replace spaces with hyphens
    slug = re.sub(r'[^a-z0-9\s-]', '', name.lower())
    slug = re.sub(r'[\s-]+', '-', slug).strip('-')
    return slug

@router.post("/demo-signup")
def create_demo_signup(request: DemoSignupRequest, db: Session = Depends(get_db)):
    """
    Create a new tenant organization with a 30-day trial and its primary admin owner.
    """
    if not request.company_name or not request.admin_email or not request.admin_password:
        raise HTTPException(status_code=400, detail="Missing required fields")

    # Generate and validate slug
    base_slug = generate_slug(request.company_name)
    if not base_slug:
        raise HTTPException(status_code=400, detail="Invalid company name for URL generation")
    
    # Check if slug exists, append number if needed
    slug = base_slug
    counter = 1
    while db.query(Organization).filter(Organization.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    # Check if email is already used by an admin
    if db.query(Admin).filter(Admin.email == request.admin_email).first():
        raise HTTPException(status_code=400, detail="Email is already in use")

    try:
        # 1. Create Organization with 30-day trial
        trial_end = datetime.utcnow() + timedelta(days=30)
        new_org = Organization(
            name=request.company_name,
            slug=slug,
            plan_tier="basic",
            trial_ends_at=trial_end,
            is_active=True
        )
        db.add(new_org)
        db.flush()  # to get new_org.id

        # 2. Create Owner Admin
        hashed_pw = hash_password(request.admin_password)
        new_admin = Admin(
            email=request.admin_email,
            password_hash=hashed_pw,
            full_name=request.admin_name,
            role="OWNER",
            organization_id=new_org.id,
            is_active=True,
            is_super_admin=False
        )
        db.add(new_admin)
        
        db.commit()
        return {"message": "Success", "slug": slug, "trial_ends_at": trial_end.isoformat()}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create demo account: {str(e)}")

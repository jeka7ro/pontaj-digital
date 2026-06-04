from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import Organization

router = APIRouter(prefix="/api/public", tags=["public"])

class TenantConfigResponse(BaseModel):
    id: str
    name: str
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None

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
        # Check by custom domain or by subdomain (if domain is a full subdomain)
        # Assuming slug is extracted from domain in frontend, but backend can also check both
        org = db.query(Organization).filter(Organization.custom_domain == domain).first()
        if not org and '.' in domain:
            # Maybe the domain is 'jeka.pontaj.app', extract 'jeka'
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
        "secondary_color": org.secondary_color
    }

"""
Sites API endpoints for employees (non-admin)
Reads from construction_sites table (same as admin) so all sites are visible.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import ConstructionSite, User
from app.api.auth import get_current_user

router = APIRouter(prefix="/sites", tags=["sites"])


class SiteResponse(BaseModel):
    id: str
    name: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius: Optional[int] = None
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[SiteResponse])
def get_sites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all active sites for current user's organization.
    Reads from construction_sites table so admin-created sites are visible.
    """
    sites = db.query(ConstructionSite).filter(
        ConstructionSite.organization_id == current_user.organization_id,
        ConstructionSite.status == "active"
    ).all()
    
    return [SiteResponse(
        id=str(site.id),
        name=site.name,
        address=site.address,
        latitude=site.latitude,
        longitude=site.longitude,
        geofence_radius=site.geofence_radius or 100
    ) for site in sites]


@router.get("/{site_id}", response_model=SiteResponse)
def get_site(
    site_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get single site by ID
    """
    site = db.query(ConstructionSite).filter(
        ConstructionSite.id == site_id,
        ConstructionSite.organization_id == current_user.organization_id
    ).first()
    
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    return SiteResponse(
        id=str(site.id),
        name=site.name,
        address=site.address,
        latitude=site.latitude,
        longitude=site.longitude,
        geofence_radius=site.geofence_radius or 100
    )

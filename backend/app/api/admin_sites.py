"""
Admin API endpoints for construction sites management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, time
import requests
import logging

from app.database import get_db
from app.models import ConstructionSite, Admin
from app.api.admin_auth import get_current_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/sites", tags=["admin-sites"])


def geocode_address(address: str, county: str = None) -> dict:
    """Geocode an address using OpenStreetMap Nominatim (free, no API key needed)"""
    try:
        query = address
        if county:
            query += f", {county}"
        query += ", Romania"
        
        response = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1, "countrycodes": "ro"},
            headers={"User-Agent": "PontajDigital/1.0"},
            timeout=5
        )
        results = response.json()
        if results:
            return {
                "latitude": float(results[0]["lat"]),
                "longitude": float(results[0]["lon"])
            }
    except Exception as e:
        logger.warning(f"Geocoding failed for '{address}': {e}")
    return {}


# Pydantic schemas
class SiteCreate(BaseModel):
    organization_id: str
    name: str = Field(..., min_length=2, max_length=255)
    address: Optional[str] = None
    county: Optional[str] = None
    description: Optional[str] = None
    status: str = "active"  # active, completed, suspended
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius: Optional[int] = Field(100, ge=10, le=5000)
    
    # Solar panel installation specific
    client_name: Optional[str] = Field(None, max_length=255)
    panel_count: Optional[int] = Field(None, ge=0)
    system_power_kw: Optional[float] = Field(None, ge=0)
    installation_type: Optional[str] = None  # residential, commercial, industrial
    
    # Work schedule
    work_start_time: Optional[str] = "07:00"   # HH:MM format
    work_end_time: Optional[str] = "16:00"     # HH:MM format
    max_overtime_minutes: Optional[int] = Field(120, ge=0, le=480)


class SiteUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    address: Optional[str] = None
    county: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # active, completed, suspended
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius: Optional[int] = Field(None, ge=10, le=5000)
    
    # Solar panel installation specific
    client_name: Optional[str] = Field(None, max_length=255)
    panel_count: Optional[int] = Field(None, ge=0)
    system_power_kw: Optional[float] = Field(None, ge=0)
    installation_type: Optional[str] = None
    
    # Work schedule
    work_start_time: Optional[str] = None   # HH:MM format
    work_end_time: Optional[str] = None     # HH:MM format
    max_overtime_minutes: Optional[int] = Field(None, ge=0, le=480)


def site_to_dict(site) -> dict:
    """Convert a ConstructionSite ORM object to a JSON-serializable dict."""
    return {
        "id": site.id,
        "name": site.name,
        "address": site.address,
        "county": site.county,
        "description": site.description,
        "status": site.status,
        "latitude": site.latitude,
        "longitude": site.longitude,
        "geofence_radius": site.geofence_radius,
        "created_at": site.created_at.isoformat() if site.created_at else None,
        "client_name": site.client_name,
        "panel_count": site.panel_count,
        "system_power_kw": site.system_power_kw,
        "installation_type": site.installation_type,
        "work_start_time": site.work_start_time.strftime('%H:%M') if site.work_start_time else "07:00",
        "work_end_time": site.work_end_time.strftime('%H:%M') if site.work_end_time else "16:00",
        "max_overtime_minutes": site.max_overtime_minutes if site.max_overtime_minutes is not None else 120,
    }


class SitesListResponse(BaseModel):
    sites: list
    total: int
    page: int
    page_size: int


@router.get("/", response_model=SitesListResponse)
def get_sites(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Get paginated list of construction sites
    """
    query = db.query(ConstructionSite)
    
    # Apply filters
    if search:
        query = query.filter(
            ConstructionSite.name.ilike(f"%{search}%") |
            ConstructionSite.address.ilike(f"%{search}%")
        )
    
    if status:
        query = query.filter(ConstructionSite.status == status)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    sites = query.order_by(ConstructionSite.created_at.desc()).offset(offset).limit(page_size).all()
    
    return {
        "sites": [site_to_dict(site) for site in sites],
        "total": total,
        "page": page,
        "page_size": page_size
    }


# IMPORTANT: Stats routes MUST be before /{site_id} to avoid 'stats' being matched as a site_id
@router.get("/stats/summary")
def get_sites_stats(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Get construction sites statistics
    """
    total_sites = db.query(func.count(ConstructionSite.id)).scalar()
    active_sites = db.query(func.count(ConstructionSite.id)).filter(ConstructionSite.status == "active").scalar()
    completed_sites = db.query(func.count(ConstructionSite.id)).filter(ConstructionSite.status == "completed").scalar()
    suspended_sites = db.query(func.count(ConstructionSite.id)).filter(ConstructionSite.status == "suspended").scalar()
    
    return {
        "total_sites": total_sites,
        "active_sites": active_sites,
        "completed_sites": completed_sites,
        "suspended_sites": suspended_sites
    }


@router.get("/stats")
def get_sites_stats_alias(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Alias for /stats/summary for dashboard compatibility
    """
    return get_sites_stats(db, current_admin)


@router.get("/{site_id}")
def get_site(
    site_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Get single construction site by ID
    """
    site = db.query(ConstructionSite).filter(ConstructionSite.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Construction site not found")
    
    return site_to_dict(site)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_site(
    site_data: SiteCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Create new construction site
    """
    # Check if site with same name exists
    existing_site = db.query(ConstructionSite).filter(ConstructionSite.name == site_data.name).first()
    if existing_site:
        raise HTTPException(status_code=400, detail="Site with this name already exists")
    
    # Auto-geocode if address provided but no coordinates
    lat = site_data.latitude
    lng = site_data.longitude
    if site_data.address and not (lat and lng):
        geo = geocode_address(site_data.address, site_data.county)
        lat = geo.get("latitude")
        lng = geo.get("longitude")
    
    new_site = ConstructionSite(
        organization_id=site_data.organization_id,
        name=site_data.name,
        address=site_data.address,
        county=site_data.county,
        description=site_data.description,
        status=site_data.status,
        latitude=lat,
        longitude=lng,
        geofence_radius=site_data.geofence_radius or 100,
        client_name=site_data.client_name,
        panel_count=site_data.panel_count,
        system_power_kw=site_data.system_power_kw,
        installation_type=site_data.installation_type,
        work_start_time=time.fromisoformat(site_data.work_start_time) if site_data.work_start_time else time(7, 0),
        work_end_time=time.fromisoformat(site_data.work_end_time) if site_data.work_end_time else time(16, 0),
        max_overtime_minutes=site_data.max_overtime_minutes if site_data.max_overtime_minutes is not None else 120
    )
    
    db.add(new_site)
    db.commit()
    db.refresh(new_site)
    
    return site_to_dict(new_site)


@router.put("/{site_id}")
def update_site(
    site_id: str,
    site_data: SiteUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Update construction site
    """
    site = db.query(ConstructionSite).filter(ConstructionSite.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Construction site not found")
    
    # Update fields
    if site_data.name is not None:
        # Check if new name conflicts with another site
        existing = db.query(ConstructionSite).filter(
            ConstructionSite.name == site_data.name,
            ConstructionSite.id != site_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Site with this name already exists")
        site.name = site_data.name
    
    if site_data.address is not None:
        site.address = site_data.address
    
    if site_data.county is not None:
        site.county = site_data.county
    
    if site_data.description is not None:
        site.description = site_data.description
    
    if site_data.status is not None:
        site.status = site_data.status
    
    # Update geo fields
    if site_data.latitude is not None:
        site.latitude = site_data.latitude
    if site_data.longitude is not None:
        site.longitude = site_data.longitude
    if site_data.geofence_radius is not None:
        site.geofence_radius = site_data.geofence_radius
    
    # Auto-geocode if address changed but no new coordinates provided
    if site_data.address is not None and site_data.latitude is None:
        geo = geocode_address(site_data.address, site_data.county or site.county)
        if geo:
            site.latitude = geo.get("latitude")
            site.longitude = geo.get("longitude")
    
    # Update solar panel fields
    if site_data.client_name is not None:
        site.client_name = site_data.client_name
    
    if site_data.panel_count is not None:
        site.panel_count = site_data.panel_count
    
    if site_data.system_power_kw is not None:
        site.system_power_kw = site_data.system_power_kw
    
    if site_data.installation_type is not None:
        site.installation_type = site_data.installation_type
    
    # Update schedule fields
    if site_data.work_start_time is not None:
        site.work_start_time = time.fromisoformat(site_data.work_start_time)
    if site_data.work_end_time is not None:
        site.work_end_time = time.fromisoformat(site_data.work_end_time)
    if site_data.max_overtime_minutes is not None:
        site.max_overtime_minutes = site_data.max_overtime_minutes
    
    db.commit()
    db.refresh(site)
    
    return site_to_dict(site)


@router.delete("/{site_id}")
def delete_site(
    site_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Delete construction site (soft delete by setting status to suspended)
    """
    site = db.query(ConstructionSite).filter(ConstructionSite.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Construction site not found")
    
    # Soft delete
    site.status = "suspended"
    db.commit()
    
    return {"message": "Site deleted successfully"}



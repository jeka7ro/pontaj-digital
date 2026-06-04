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
    organization_id: Optional[str] = None
    name: str = Field(..., min_length=2, max_length=255)
    address: Optional[str] = None
    county: Optional[str] = None
    description: Optional[str] = None
    status: str = "active"  # active, completed, suspended
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius: Optional[int] = Field(100, ge=10, le=5000)
    
    client_id: Optional[str] = None
    client_name: Optional[str] = Field(None, max_length=255)
    panel_count: Optional[int] = Field(None, ge=0)
    system_power_kw: Optional[float] = Field(None, ge=0)
    installation_type: Optional[str] = None  # residential, commercial, industrial
    
    # Work schedule
    work_start_time: Optional[str] = "07:00"   # HH:MM format
    work_end_time: Optional[str] = "16:00"     # HH:MM format
    lunch_break_start: Optional[str] = "12:00"
    lunch_break_end: Optional[str] = "13:00"
    max_overtime_minutes: Optional[int] = Field(120, ge=0, le=480)


class SiteTeamsUpdate(BaseModel):
    team_ids: list[str]

class SiteUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    address: Optional[str] = None
    county: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # active, completed, suspended
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius: Optional[int] = Field(None, ge=10, le=5000)
    
    client_id: Optional[str] = None
    client_name: Optional[str] = Field(None, max_length=255)
    panel_count: Optional[int] = Field(None, ge=0)
    system_power_kw: Optional[float] = Field(None, ge=0)
    installation_type: Optional[str] = None
    
    # Work schedule
    work_start_time: Optional[str] = None   # HH:MM format
    work_end_time: Optional[str] = None     # HH:MM format
    lunch_break_start: Optional[str] = None
    lunch_break_end: Optional[str] = None
    max_overtime_minutes: Optional[int] = Field(None, ge=0, le=480)


def site_to_dict(site, db=None) -> dict:
    """Convert a ConstructionSite ORM object to a JSON-serializable dict."""
    assigned_workers = 0
    assigned_team_ids = []
    if db:
        from app.models import Team, TeamMember, User
        from sqlalchemy import func
        
        # Combine direct users and team users to get total unique workers
        direct_users = db.query(User.id).filter(User.site_id == site.id).all()
        direct_ids = {u[0] for u in direct_users}
        
        team_users = db.query(TeamMember.user_id).join(Team, Team.id == TeamMember.team_id).filter(Team.site_id == site.id).all()
        team_ids_set = {u[0] for u in team_users}
        
        assigned_workers = len(direct_ids.union(team_ids_set))
        
        teams_db = db.query(Team).filter(Team.site_id == site.id).all()
        assigned_team_ids = [t.id for t in teams_db]

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
        "client_id": site.client_id,
        "client_name": site.client.name if site.client_id and hasattr(site, 'client') and site.client else site.client_name,
        "panel_count": site.panel_count,
        "system_power_kw": site.system_power_kw,
        "installation_type": site.installation_type,
        "work_start_time": (site.work_start_time[:5] if isinstance(site.work_start_time, str) else site.work_start_time.strftime('%H:%M')) if site.work_start_time else "07:00",
        "work_end_time": (site.work_end_time[:5] if isinstance(site.work_end_time, str) else site.work_end_time.strftime('%H:%M')) if site.work_end_time else "16:00",
        "lunch_break_start": (site.lunch_break_start[:5] if isinstance(site.lunch_break_start, str) else site.lunch_break_start.strftime('%H:%M')) if site.lunch_break_start else "12:00",
        "lunch_break_end": (site.lunch_break_end[:5] if isinstance(site.lunch_break_end, str) else site.lunch_break_end.strftime('%H:%M')) if site.lunch_break_end else "13:00",
        "max_overtime_minutes": site.max_overtime_minutes if site.max_overtime_minutes is not None else 120,
        "assigned_workers": assigned_workers,
        "assigned_worker_ids": list(direct_ids.union(team_ids_set)) if db else [],
        "team_ids": assigned_team_ids,
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
        "sites": [site_to_dict(site, db) for site in sites],
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
    total_sites = db.query(func.count(ConstructionSite.id)).filter(ConstructionSite.status != "suspended").scalar()
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
    
    return site_to_dict(site, db)


@router.get("/{site_id}/details")
def get_site_details(
    site_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Get detailed site information including related entities (vehicles, warehouse, attendance, photos)
    """
    site = db.query(ConstructionSite).filter(ConstructionSite.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Construction site not found")
    
    from app.models import (
        VehicleSiteAssignment, Vehicle, 
        WarehouseTransaction, WarehouseItem, 
        TimesheetSegment, Timesheet, User,
        SitePhoto
    )
    from sqlalchemy.orm import joinedload
    
    # Teams and direct users assigned
    from app.models import Team, TeamMember
    teams_db = db.query(Team).filter(Team.site_id == site_id).all()
    teams_list = []
    for team in teams_db:
        members = db.query(User).join(TeamMember, TeamMember.user_id == User.id).filter(TeamMember.team_id == team.id).all()
        teams_list.append({
            "id": team.id,
            "name": team.name,
            "members": [{"id": m.id, "name": m.full_name, "role": m.role} for m in members]
        })
        
    direct_users_db = db.query(User).filter(User.site_id == site_id).all()
    direct_users_list = [{"id": m.id, "name": m.full_name, "role": m.role} for m in direct_users_db]
    
    # Vehicles assigned
    vehicles_assigned = db.query(VehicleSiteAssignment, Vehicle).join(
        Vehicle, VehicleSiteAssignment.vehicle_id == Vehicle.id
    ).filter(
        VehicleSiteAssignment.site_id == site_id,
        VehicleSiteAssignment.is_active == True
    ).all()
    
    vehicles_list = [
        {
            "id": v.id,
            "name": v.name,
            "type": v.type,
            "plate_number": v.plate_number,
            "chassis_number": v.chassis_number,
            "year": v.year,
            "assigned_at": str(va.created_at)
        }
        for va, v in vehicles_assigned
    ]
    
    # Date filtering base queries
    from datetime import datetime
    sd = datetime.fromisoformat(start_date) if start_date else None
    ed = datetime.fromisoformat(end_date) if end_date else None
    
    # Warehouse transactions
    wh_query = db.query(WarehouseTransaction, WarehouseItem, User).join(
        WarehouseItem, WarehouseTransaction.item_id == WarehouseItem.id
    ).outerjoin(
        User, WarehouseTransaction.assigned_to_user_id == User.id
    ).filter(WarehouseTransaction.site_id == site_id)
    
    if sd: wh_query = wh_query.filter(WarehouseTransaction.created_at >= sd)
    if ed: wh_query = wh_query.filter(WarehouseTransaction.created_at <= ed)
    
    wh_transactions = wh_query.order_by(WarehouseTransaction.created_at.desc()).all()
    
    warehouse_list = [
        {
            "id": t.id,
            "tx_type": t.transaction_type,
            "quantity": t.quantity,
            "created_at": str(t.created_at),
            "item_name": item.name,
            "item_sku": item.category,
            "user_name": u.full_name if u else "N/A"
        }
        for t, item, u in wh_transactions
    ]
    
    # Attendance (Timesheet Segments) — with real activities
    from app.models import TimesheetLine, Activity as ActivityModel

    ts_query = db.query(TimesheetSegment, Timesheet, User).join(
        Timesheet, TimesheetSegment.timesheet_id == Timesheet.id
    ).join(
        User, Timesheet.owner_user_id == User.id
    ).filter(TimesheetSegment.site_id == site_id)
    
    if sd: ts_query = ts_query.filter(Timesheet.date >= sd.date())
    if ed: ts_query = ts_query.filter(Timesheet.date <= ed.date())
    
    ts_segments = ts_query.order_by(TimesheetSegment.check_in_time.desc()).all()

    # Build a map: segment_id -> list of activity names
    seg_ids = [seg.id for seg, _, _ in ts_segments]
    activity_map = {}
    if seg_ids:
        lines = db.query(TimesheetLine, ActivityModel).join(
            ActivityModel, TimesheetLine.activity_id == ActivityModel.id
        ).filter(TimesheetLine.segment_id.in_(seg_ids)).all()
        for line, act in lines:
            if line.segment_id not in activity_map:
                activity_map[line.segment_id] = []
            entry = act.name
            if line.quantity_numeric:
                entry += f" ({line.quantity_numeric} {line.unit_type or ''})"
            activity_map[line.segment_id].append(entry)

    attendance_list = [
        {
            "id": seg.id,
            "date": str(ts.date),
            "user_name": u.full_name,
            "check_in": str(seg.check_in_time) if seg.check_in_time else None,
            "check_out": str(seg.check_out_time) if seg.check_out_time else None,
            "activities": activity_map.get(seg.id, []),
        }
        for seg, ts, u in ts_segments
    ]
    
    # Photos
    ph_query = db.query(SitePhoto, User).outerjoin(
        User, SitePhoto.uploaded_by_user_id == User.id
    ).filter(SitePhoto.site_id == site_id)
    
    if sd: ph_query = ph_query.filter(SitePhoto.created_at >= sd)
    if ed: ph_query = ph_query.filter(SitePhoto.created_at <= ed)
    
    photos = ph_query.order_by(SitePhoto.created_at.desc()).all()
    
    photo_list = [
        {
            "id": p.id,
            "photo_path": p.photo_path,
            "description": p.description,
            "created_at": str(p.created_at),
            "uploader_name": u.full_name if u else "N/A"
        }
        for p, u in photos
    ]
    
    return {
        "site": site_to_dict(site, db),
        "teams": teams_list,
        "direct_users": direct_users_list,
        "vehicles": vehicles_list,
        "warehouse_transactions": warehouse_list,
        "attendance": attendance_list,
        "photos": photo_list
    }


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
    
    org_id = site_data.organization_id or current_admin.organization_id
    if not org_id:
        from app.models import Organization
        org = db.query(Organization).first()
        if org:
            org_id = org.id
        else:
            raise HTTPException(status_code=400, detail="No organization available in the system")

    new_site = ConstructionSite(
        organization_id=org_id,
        name=site_data.name,
        address=site_data.address,
        county=site_data.county,
        description=site_data.description,
        status=site_data.status,
        latitude=lat,
        longitude=lng,
        geofence_radius=site_data.geofence_radius or 100,
        client_id=site_data.client_id,
        client_name=site_data.client_name,
        panel_count=site_data.panel_count,
        system_power_kw=site_data.system_power_kw,
        installation_type=site_data.installation_type,
        work_start_time=time.fromisoformat(site_data.work_start_time) if site_data.work_start_time else time(7, 0),
        work_end_time=time.fromisoformat(site_data.work_end_time) if site_data.work_end_time else time(16, 0),
        lunch_break_start=time.fromisoformat(site_data.lunch_break_start) if site_data.lunch_break_start else time(12, 0),
        lunch_break_end=time.fromisoformat(site_data.lunch_break_end) if site_data.lunch_break_end else time(13, 0),
        max_overtime_minutes=site_data.max_overtime_minutes if site_data.max_overtime_minutes is not None else 120
    )
    
    db.add(new_site)
    db.commit()
    db.refresh(new_site)
    
    return site_to_dict(new_site, db)


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
    if site_data.client_id is not None:
        site.client_id = site_data.client_id
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
    if site_data.lunch_break_start is not None:
        site.lunch_break_start = time.fromisoformat(site_data.lunch_break_start)
    if site_data.lunch_break_end is not None:
        site.lunch_break_end = time.fromisoformat(site_data.lunch_break_end)
    if site_data.max_overtime_minutes is not None:
        site.max_overtime_minutes = site_data.max_overtime_minutes
    
    db.commit()
    db.refresh(site)
    
    return site_to_dict(site, db)


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
    
    # Hybrid Delete Logic
    from app.models import TimesheetSegment, Team, User
    
    has_timesheets = db.query(TimesheetSegment).filter(TimesheetSegment.site_id == site_id).first()
    
    if has_timesheets:
        # Soft delete if there are timesheets to preserve history
        site.status = "suspended"
        db.commit()
        return {"message": "Site suspended (cannot hard delete due to existing timesheets)"}
    else:
        # Hard delete: clear simple foreign keys first
        db.query(Team).filter(Team.site_id == site_id).update({"site_id": None}, synchronize_session=False)
        db.query(User).filter(User.site_id == site_id).update({"site_id": None}, synchronize_session=False)
        
        # Then safely delete the site
        db.delete(site)
        db.commit()
        return {"message": "Site permanently deleted"}
    
    return {"message": "Site deleted successfully"}


@router.get("/map-data/all")
def get_map_data(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Returns all active sites with GPS coordinates and live counts
    for the Leaflet map dashboard.
    """
    from app.models import Timesheet, TimesheetSegment, VehicleSiteAssignment
    from app.timezone import get_local_today
    import sqlalchemy

    today = get_local_today()
    sites = db.query(ConstructionSite).filter(ConstructionSite.status == "active").all()
    result = []

    for site in sites:
        # Count active workers today (segments with no check_out)
        active_workers = db.execute(
            sqlalchemy.text(
                """
                SELECT COUNT(DISTINCT ts.owner_user_id)
                FROM timesheets ts
                JOIN timesheet_segments seg ON seg.timesheet_id = ts.id
                WHERE ts.date = :today
                  AND seg.site_id = :site_id
                  AND seg.check_out_time IS NULL
                """
            ),
            {"today": today.isoformat(), "site_id": site.id}
        ).scalar() or 0

        # Count vehicles assigned to this site
        vehicle_count = db.query(VehicleSiteAssignment).filter(
            VehicleSiteAssignment.site_id == site.id,
            VehicleSiteAssignment.is_active == True
        ).count()

        result.append({
            "id": site.id,
            "name": site.name,
            "address": site.address,
            "county": site.county,
            "latitude": site.latitude,
            "longitude": site.longitude,
            "geofence_radius": site.geofence_radius or 100,
            "status": site.status,
            "active_workers": int(active_workers),
            "vehicle_count": vehicle_count,
            "client_id": site.client_id,
            "panel_count": site.panel_count,
            "system_power_kw": site.system_power_kw,
            "client_name": site.client_name,
        })

    return result

@router.put("/{site_id}/teams")
def set_site_teams(
    site_id: str,
    data: SiteTeamsUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Assign teams to a site"""
    site = db.query(ConstructionSite).filter(ConstructionSite.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Construction site not found")

    from app.models import Team
    
    # Unassign all teams currently assigned to this site
    db.query(Team).filter(Team.site_id == site_id).update({"site_id": None}, synchronize_session=False)
    
    # Assign the new ones
    if data.team_ids:
        db.query(Team).filter(Team.id.in_(data.team_ids)).update({"site_id": site_id}, synchronize_session=False)
        
    db.commit()
    
    return site_to_dict(site, db)

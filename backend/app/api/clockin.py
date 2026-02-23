"""
Clock-In/Out API endpoints with GPS tracking and geofencing
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, date, time as dtime, timedelta
from typing import Optional
from math import radians, cos, sin, asin, sqrt

from app.database import get_db
from app.models import User, ConstructionSite, Timesheet, TimesheetSegment, GeofencePause, Role
from app.api.auth import get_current_user

router = APIRouter()


# Pydantic Models
class ClockInRequest(BaseModel):
    site_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    self_declaration: bool = False  # "pe proprie raspundere"


class ClockOutRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class BreakRequest(BaseModel):
    latitude: float
    longitude: float


class LocationPingRequest(BaseModel):
    latitude: float
    longitude: float


class ActiveShiftResponse(BaseModel):
    timesheet_id: str
    segment_id: str
    site_id: str
    site_name: str
    check_in_time: datetime
    is_on_break: bool
    break_start_time: Optional[datetime] = None
    elapsed_hours: float
    break_hours: float

    class Config:
        from_attributes = True


# Helper Functions
def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two GPS coordinates using Haversine formula
    Returns distance in meters
    """
    R = 6371000  # Earth radius in meters
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    return R * c


def verify_geofence(employee_lat: float, employee_lon: float, 
                   site_lat: float, site_lon: float, radius: int) -> tuple[bool, float]:
    """
    Check if employee is within site geofence
    Returns (is_within, distance_in_meters)
    """
    distance = calculate_distance(employee_lat, employee_lon, site_lat, site_lon)
    return distance <= radius, distance


def get_geofence_pause_seconds(db: Session, segment_id: str) -> float:
    """Calculate total geofence pause time for a segment in seconds"""
    pauses = db.query(GeofencePause).filter(
        GeofencePause.segment_id == segment_id
    ).all()
    total = 0.0
    now = datetime.now()
    for p in pauses:
        end = p.pause_end or now
        total += (end - p.pause_start).total_seconds()
    return total


def is_geofence_applicable(db: Session, user: User) -> bool:
    """Check if geofence auto-pause applies to this user's role.
    Only applies to WORKER and TEAM_LEAD roles."""
    role = db.query(Role).filter(Role.id == user.role_id).first()
    if not role:
        return False
    return role.code in ("WORKER", "TEAM_LEAD")


# API Endpoints
@router.post("/timesheets/clock-in")
def clock_in(
    request: ClockInRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new work shift with GPS verification"""
    
    # Check if user already has an active shift
    today = date.today()
    active_timesheet = db.query(Timesheet).filter(
        Timesheet.owner_user_id == current_user.id,
        Timesheet.date == today,
        Timesheet.status == "DRAFT"
    ).first()
    
    if active_timesheet:
        # Check if there's an active segment (no check_out_time)
        active_segment = db.query(TimesheetSegment).filter(
            TimesheetSegment.timesheet_id == active_timesheet.id,
            TimesheetSegment.check_out_time == None
        ).first()
        
        if active_segment:
            raise HTTPException(
                status_code=400,
                detail="Ai deja o tură activă. Închide tura curentă înainte de a începe una nouă."
            )
    
    # Get site details from construction_sites table
    site = db.query(ConstructionSite).filter(ConstructionSite.id == request.site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Șantier negăsit")
    
    # ----- GPS REQUIREMENT -----
    gps_available = request.latitude is not None and request.longitude is not None
    
    # If no GPS and no self-declaration, require GPS
    if not gps_available and not request.self_declaration:
        raise HTTPException(
            status_code=400,
            detail="Locația GPS este necesară pentru pontare. Activează GPS-ul sau bifează declarația pe proprie răspundere."
        )
    
    # ----- SCHEDULE ENFORCEMENT -----
    # Only block brand-new shifts; allow continuation if worker already worked today
    now = datetime.now()
    current_time = now.time()
    schedule_info = {}
    
    has_existing_segments = False
    if active_timesheet:
        existing_seg_count = db.query(TimesheetSegment).filter(
            TimesheetSegment.timesheet_id == active_timesheet.id
        ).count()
        has_existing_segments = existing_seg_count > 0
    
    if site.work_start_time and site.work_end_time and not has_existing_segments:
        # Allow clock-in 30 minutes before schedule start
        earliest_dt = datetime.combine(today, site.work_start_time) - timedelta(minutes=30)
        earliest_time = earliest_dt.time()
        
        # Latest clock-in = work_end_time (no point starting after schedule ends)
        latest_time = site.work_end_time
        
        if current_time < earliest_time:
            raise HTTPException(
                status_code=400,
                detail=f"Programul șantierului începe la {site.work_start_time.strftime('%H:%M')}. Poți face pontajul cu maxim 30 de minute înainte ({earliest_time.strftime('%H:%M')})."
            )
        
        if current_time > latest_time:
            raise HTTPException(
                status_code=400,
                detail=f"Programul șantierului s-a încheiat la {site.work_end_time.strftime('%H:%M')}. Nu poți începe o tură nouă."
            )
        
        schedule_info = {
            "work_start": site.work_start_time.strftime('%H:%M'),
            "work_end": site.work_end_time.strftime('%H:%M'),
            "max_overtime_minutes": site.max_overtime_minutes or 120
        }
    
    # ----- GEOFENCE VERIFICATION -----
    is_within_geofence = True
    distance_from_site = None
    self_declared = False
    
    if gps_available and site.latitude and site.longitude:
        is_within_geofence, distance_from_site = verify_geofence(
            request.latitude, request.longitude,
            site.latitude, site.longitude,
            site.geofence_radius or 300
        )
        
        # TEMPORARY: Allow check-in from anywhere for testing (no distance blocking)
        if not is_within_geofence:
            self_declared = True
    elif not gps_available and request.self_declaration:
        # No GPS but self-declared — allowed but marked
        self_declared = True
        is_within_geofence = False
    
    # Create timesheet if doesn't exist
    if not active_timesheet:
        active_timesheet = Timesheet(
            organization_id=current_user.organization_id,
            date=today,
            owner_type="USER",
            owner_user_id=current_user.id,
            status="DRAFT"
        )
        db.add(active_timesheet)
        db.flush()
    
    # Create new segment (clock-in)
    segment = TimesheetSegment(
        timesheet_id=active_timesheet.id,
        site_id=request.site_id,
        check_in_time=datetime.now(),
        check_out_time=None,
        check_in_latitude=request.latitude,
        check_in_longitude=request.longitude,
        is_within_geofence=is_within_geofence and not self_declared,
        distance_from_site=distance_from_site
    )
    
    db.add(segment)
    db.commit()
    db.refresh(segment)
    
    return {
        "timesheet_id": active_timesheet.id,
        "segment_id": segment.id,
        "check_in_time": segment.check_in_time,
        "is_within_geofence": is_within_geofence,
        "self_declared": self_declared,
        "gps_available": gps_available,
        "distance_from_site": distance_from_site,
        "site_name": site.name,
        **schedule_info
    }


@router.post("/timesheets/clock-out")
def clock_out(
    request: ClockOutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """End current work shift with GPS verification"""
    
    # Find active segment
    today = date.today()
    active_timesheet = db.query(Timesheet).filter(
        Timesheet.owner_user_id == current_user.id,
        Timesheet.date == today,
        Timesheet.status == "DRAFT"
    ).first()
    
    if not active_timesheet:
        raise HTTPException(status_code=404, detail="Nu ai o tură activă")
    
    active_segment = db.query(TimesheetSegment).filter(
        TimesheetSegment.timesheet_id == active_timesheet.id,
        TimesheetSegment.check_out_time == None
    ).order_by(TimesheetSegment.check_in_time.desc()).first()
    
    if not active_segment:
        raise HTTPException(status_code=404, detail="Nu ai o tură activă")
    
    # End any active break
    if active_segment.break_start_time and not active_segment.break_end_time:
        active_segment.break_end_time = datetime.now()
    
    # Close any active geofence pause
    active_geo_pause = db.query(GeofencePause).filter(
        GeofencePause.segment_id == active_segment.id,
        GeofencePause.pause_end == None
    ).first()
    if active_geo_pause:
        active_geo_pause.pause_end = datetime.now()
    
    # Update segment with clock-out
    active_segment.check_out_time = datetime.now()
    if request.latitude is not None:
        active_segment.check_out_latitude = request.latitude
    if request.longitude is not None:
        active_segment.check_out_longitude = request.longitude
    
    # Calculate total hours
    duration = active_segment.check_out_time - active_segment.check_in_time
    total_hours = duration.total_seconds() / 3600
    
    # Calculate break hours
    break_hours = 0
    if active_segment.break_start_time and active_segment.break_end_time:
        break_duration = active_segment.break_end_time - active_segment.break_start_time
        break_hours = break_duration.total_seconds() / 3600
    
    # Calculate geofence pause hours
    geofence_pause_secs = get_geofence_pause_seconds(db, active_segment.id)
    geofence_pause_hours = geofence_pause_secs / 3600
    
    # ----- OVERTIME CALCULATION -----
    overtime_minutes = 0
    overtime_warning = None
    site = db.query(ConstructionSite).filter(ConstructionSite.id == active_segment.site_id).first()
    
    if site and site.work_end_time:
        schedule_end_dt = datetime.combine(date.today(), site.work_end_time)
        if active_segment.check_out_time > schedule_end_dt:
            overtime_minutes = int((active_segment.check_out_time - schedule_end_dt).total_seconds() / 60)
            active_segment.overtime_minutes = overtime_minutes
            
            max_ot = site.max_overtime_minutes or 120
            if overtime_minutes > max_ot:
                overtime_warning = f"Ai depășit limita de overtime ({max_ot} min). Orele suplimentare necesită aprobare."
    
    db.commit()
    
    return {
        "segment_id": active_segment.id,
        "check_out_time": active_segment.check_out_time,
        "total_hours": round(total_hours, 2),
        "break_hours": round(break_hours, 2),
        "geofence_pause_hours": round(geofence_pause_hours, 2),
        "worked_hours": round(total_hours - break_hours - geofence_pause_hours, 2),
        "overtime_minutes": overtime_minutes,
        "overtime_warning": overtime_warning
    }


@router.post("/timesheets/start-break")
def start_break(
    request: BreakRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start meal break"""
    
    # Find active segment
    today = date.today()
    active_timesheet = db.query(Timesheet).filter(
        Timesheet.owner_user_id == current_user.id,
        Timesheet.date == today,
        Timesheet.status == "DRAFT"
    ).first()
    
    if not active_timesheet:
        raise HTTPException(status_code=404, detail="Nu ai o tură activă")
    
    active_segment = db.query(TimesheetSegment).filter(
        TimesheetSegment.timesheet_id == active_timesheet.id,
        TimesheetSegment.check_out_time == None
    ).order_by(TimesheetSegment.check_in_time.desc()).first()
    
    if not active_segment:
        raise HTTPException(status_code=404, detail="Nu ai o tură activă")
    
    if active_segment.break_start_time and not active_segment.break_end_time:
        raise HTTPException(status_code=400, detail="Ai deja o pauză activă")
    
    # Start break
    active_segment.break_start_time = datetime.now()
    active_segment.break_start_latitude = request.latitude
    active_segment.break_start_longitude = request.longitude
    
    db.commit()
    
    return {
        "segment_id": active_segment.id,
        "break_start_time": active_segment.break_start_time
    }


@router.post("/timesheets/end-break")
def end_break(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """End meal break"""
    
    # Find active segment with active break
    today = date.today()
    active_timesheet = db.query(Timesheet).filter(
        Timesheet.owner_user_id == current_user.id,
        Timesheet.date == today,
        Timesheet.status == "DRAFT"
    ).first()
    
    if not active_timesheet:
        raise HTTPException(status_code=404, detail="Nu ai o tură activă")
    
    active_segment = db.query(TimesheetSegment).filter(
        TimesheetSegment.timesheet_id == active_timesheet.id,
        TimesheetSegment.break_start_time != None,
        TimesheetSegment.break_end_time == None
    ).order_by(TimesheetSegment.check_in_time.desc()).first()
    
    if not active_segment:
        raise HTTPException(status_code=404, detail="Nu ai o pauză activă")
    
    # End break
    active_segment.break_end_time = datetime.now()
    
    # Calculate break duration
    break_duration = active_segment.break_end_time - active_segment.break_start_time
    break_minutes = break_duration.total_seconds() / 60
    
    db.commit()
    
    return {
        "segment_id": active_segment.id,
        "break_end_time": active_segment.break_end_time,
        "break_duration_minutes": round(break_minutes, 1)
    }


@router.get("/timesheets/active-shift")
def get_active_shift(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current active shift if any"""
    
    today = date.today()
    active_timesheet = db.query(Timesheet).filter(
        Timesheet.owner_user_id == current_user.id,
        Timesheet.date == today,
        Timesheet.status == "DRAFT"
    ).first()
    
    if not active_timesheet:
        return JSONResponse(content=None)
    
    active_segment = db.query(TimesheetSegment).filter(
        TimesheetSegment.timesheet_id == active_timesheet.id,
        TimesheetSegment.check_out_time == None
    ).order_by(TimesheetSegment.check_in_time.desc()).first()
    
    if not active_segment:
        return JSONResponse(content=None)
    
    site = db.query(ConstructionSite).filter(ConstructionSite.id == active_segment.site_id).first()
    
    # ---- AUTO-CLOSE: if past schedule end + max overtime ----
    now = datetime.now()
    if site and site.work_end_time:
        schedule_end = datetime.combine(today, site.work_end_time)
        max_ot = site.max_overtime_minutes or 120
        hard_deadline = schedule_end + timedelta(minutes=max_ot)
        
        if now > hard_deadline:
            # Auto-close the segment at the hard deadline
            active_segment.check_out_time = hard_deadline
            
            # Close any active break
            if active_segment.break_start_time and not active_segment.break_end_time:
                active_segment.break_end_time = hard_deadline
            
            # Close any active geofence pause
            active_geo_pause = db.query(GeofencePause).filter(
                GeofencePause.segment_id == active_segment.id,
                GeofencePause.pause_end == None
            ).first()
            if active_geo_pause:
                active_geo_pause.pause_end = hard_deadline
            
            db.commit()
            return JSONResponse(content=None)  # No active shift anymore
    
    # Calculate elapsed time
    now = datetime.now()
    elapsed = now - active_segment.check_in_time
    elapsed_hours = elapsed.total_seconds() / 3600
    
    # Calculate break time
    break_hours = 0
    if active_segment.break_start_time:
        if active_segment.break_end_time:
            break_duration = active_segment.break_end_time - active_segment.break_start_time
            break_hours = break_duration.total_seconds() / 3600
        else:
            # Break is active
            break_duration = now - active_segment.break_start_time
            break_hours = break_duration.total_seconds() / 3600
    
    # Calculate geofence pause time
    geofence_pause_secs = get_geofence_pause_seconds(db, active_segment.id)
    geofence_pause_hours = geofence_pause_secs / 3600
    
    # Check if currently outside geofence
    active_geo_pause = db.query(GeofencePause).filter(
        GeofencePause.segment_id == active_segment.id,
        GeofencePause.pause_end == None
    ).first()
    
    # Detect GPS loss: no ping in last 2 minutes
    gps_lost = False
    if active_segment.last_ping_at:
        since_last_ping = (now - active_segment.last_ping_at).total_seconds()
        gps_lost = since_last_ping > 120  # 2 minutes
    else:
        # No pings ever received — check if more than 2 min since check-in
        since_checkin = (now - active_segment.check_in_time).total_seconds()
        gps_lost = since_checkin > 120
    
    return {
        "timesheet_id": active_timesheet.id,
        "segment_id": active_segment.id,
        "site_id": active_segment.site_id,
        "site_name": site.name if site else "Unknown",
        "site_latitude": site.latitude if site else None,
        "site_longitude": site.longitude if site else None,
        "site_geofence_radius": site.geofence_radius if site else 300,
        "check_in_time": str(active_segment.check_in_time),
        "is_on_break": bool(active_segment.break_start_time and not active_segment.break_end_time),
        "break_start_time": str(active_segment.break_start_time) if active_segment.break_start_time else None,
        "elapsed_hours": round(elapsed_hours, 2),
        "break_hours": round(break_hours, 2),
        "geofence_pause_hours": round(geofence_pause_hours, 2),
        "is_outside_geofence": bool(active_geo_pause),
        "gps_lost": gps_lost,
        "last_ping_at": str(active_segment.last_ping_at) if active_segment.last_ping_at else None,
        "geofence_pause_distance": active_geo_pause.distance_at_pause if active_geo_pause else None,
        # Schedule info
        "work_start_time": site.work_start_time.strftime('%H:%M') if site and site.work_start_time else None,
        "work_end_time": site.work_end_time.strftime('%H:%M') if site and site.work_end_time else None,
        "max_overtime_minutes": site.max_overtime_minutes if site else 120,
        "schedule_end_datetime": str(datetime.combine(today, site.work_end_time)) if site and site.work_end_time else None,
        "overtime_limit_datetime": str(datetime.combine(today, site.work_end_time) + timedelta(minutes=site.max_overtime_minutes or 120)) if site and site.work_end_time else None
    }


@router.post("/timesheets/location-ping")
def location_ping(
    request: LocationPingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Periodic location ping to enforce geofence auto-pause.
    Called every 30s by the frontend while a shift is active.
    If worker is >300m from site, creates a GeofencePause.
    When they return within range, closes the pause."""
    
    # Only applies to WORKER and TEAM_LEAD
    if not is_geofence_applicable(db, current_user):
        return {"geofence_applicable": False, "message": "Geofence nu se aplică pentru rolul tău"}
    
    # Find active segment
    today = date.today()
    active_timesheet = db.query(Timesheet).filter(
        Timesheet.owner_user_id == current_user.id,
        Timesheet.date == today,
        Timesheet.status == "DRAFT"
    ).first()
    
    if not active_timesheet:
        return {"geofence_applicable": False, "message": "Nicio tură activă"}
    
    active_segment = db.query(TimesheetSegment).filter(
        TimesheetSegment.timesheet_id == active_timesheet.id,
        TimesheetSegment.check_out_time == None
    ).order_by(TimesheetSegment.check_in_time.desc()).first()
    
    if not active_segment:
        return {"geofence_applicable": False, "message": "Nicio tură activă"}
    
    # Get site coordinates
    site = db.query(ConstructionSite).filter(ConstructionSite.id == active_segment.site_id).first()
    if not site or not site.latitude or not site.longitude:
        return {
            "geofence_applicable": False,
            "message": "Șantierul nu are coordonate GPS configurate"
        }
    
    # Record last ping time
    active_segment.last_ping_at = datetime.now()
    db.commit()
    
    # Calculate distance
    distance = calculate_distance(
        request.latitude, request.longitude,
        site.latitude, site.longitude
    )
    
    geofence_radius = site.geofence_radius or 300
    is_within = distance <= geofence_radius
    
    # Check if there's an active geofence pause
    active_pause = db.query(GeofencePause).filter(
        GeofencePause.segment_id == active_segment.id,
        GeofencePause.pause_end == None
    ).first()
    
    status_changed = False
    
    if not is_within and not active_pause:
        # Worker left the zone — create a pause
        new_pause = GeofencePause(
            segment_id=active_segment.id,
            pause_start=datetime.now(),
            distance_at_pause=round(distance, 1),
            latitude=request.latitude,
            longitude=request.longitude
        )
        db.add(new_pause)
        db.commit()
        status_changed = True
        
        return {
            "geofence_applicable": True,
            "is_within_geofence": False,
            "distance": round(distance, 1),
            "geofence_radius": geofence_radius,
            "status": "PAUSED",
            "status_changed": True,
            "message": f"Ai ieșit din raza șantierului ({int(distance)}m). Orele nu se mai numără."
        }
    
    elif is_within and active_pause:
        # Worker returned — close the pause
        active_pause.pause_end = datetime.now()
        db.commit()
        
        pause_duration = (active_pause.pause_end - active_pause.pause_start).total_seconds()
        
        return {
            "geofence_applicable": True,
            "is_within_geofence": True,
            "distance": round(distance, 1),
            "geofence_radius": geofence_radius,
            "status": "RESUMED",
            "status_changed": True,
            "pause_duration_seconds": round(pause_duration, 0),
            "message": f"Ai revenit în raza șantierului. Cronometrul a repornit."
        }
    
    else:
        # No change
        total_pause_secs = get_geofence_pause_seconds(db, active_segment.id)
        
        return {
            "geofence_applicable": True,
            "is_within_geofence": is_within,
            "distance": round(distance, 1),
            "geofence_radius": geofence_radius,
            "status": "ACTIVE" if is_within else "PAUSED",
            "status_changed": False,
            "total_geofence_pause_seconds": round(total_pause_secs, 0),
            "message": None
        }


@router.get("/timesheets/my-today")
def my_today_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if user has completed segments today (for 'Continuă tura' UX)"""
    today = date.today()
    ts = db.query(Timesheet).filter(
        Timesheet.owner_user_id == current_user.id,
        Timesheet.date == today,
        Timesheet.status == "DRAFT"
    ).first()
    
    if not ts:
        return {"has_completed_segments": False}
    
    completed = db.query(TimesheetSegment).filter(
        TimesheetSegment.timesheet_id == ts.id,
        TimesheetSegment.check_out_time != None
    ).count()
    
    return {"has_completed_segments": completed > 0}

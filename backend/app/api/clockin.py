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

from app.timezone import get_local_now, get_local_today

from app.database import get_db
from app.models import User, ConstructionSite, Timesheet, TimesheetSegment, GeofencePause, Role, TimesheetLine, Activity
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
def ensure_time(t):
    if not t: return None
    if isinstance(t, str):
        try:
            return dtime.fromisoformat(t[:8]) if len(t) >= 5 else None
        except ValueError:
            return None
    return t

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
    now = get_local_now()
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
    today = get_local_today()
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
    now = get_local_now()
    current_time = now.time()
    schedule_info = {}
    
    work_start_time = ensure_time(site.work_start_time)
    work_end_time = ensure_time(site.work_end_time)
    
    if work_start_time and work_end_time:
        # Block clock-in after schedule ends
        if current_time > work_end_time:
            raise HTTPException(
                status_code=400,
                detail=f"Programul șantierului s-a încheiat la {work_end_time.strftime('%H:%M')}. Nu poți începe o tură nouă."
            )
        
        # Block clock-in too early (30 min before start)
        earliest_dt = datetime.combine(today, work_start_time) - timedelta(minutes=30)
        if current_time < earliest_dt.time():
            raise HTTPException(
                status_code=400,
                detail=f"Programul șantierului începe la {work_start_time.strftime('%H:%M')}. Poți face pontajul cu maxim 30 de minute înainte."
            )
        
        max_overtime = int(site.max_overtime_minutes) if site.max_overtime_minutes else 120
        schedule_info = {
            "work_start": work_start_time.strftime('%H:%M'),
            "work_end": work_end_time.strftime('%H:%M'),
            "max_overtime_minutes": max_overtime
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
    actual_time = get_local_now()
    effective_checkin = actual_time
    is_early_checkin = False
    billable_start_time = None
    
    # Clamp check-in time: if before site start, record as site start for billing
    if work_start_time:
        site_start_dt = datetime.combine(today, work_start_time)
        if actual_time < site_start_dt:
            effective_checkin = site_start_dt
            is_early_checkin = True
            billable_start_time = site_start_dt.strftime('%H:%M')

    segment = TimesheetSegment(
        timesheet_id=active_timesheet.id,
        site_id=request.site_id,
        check_in_time=effective_checkin,
        actual_check_in_time=actual_time,
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
        "actual_check_in_time": segment.actual_check_in_time,
        "is_within_geofence": is_within_geofence,
        "self_declared": self_declared,
        "gps_available": gps_available,
        "distance_from_site": distance_from_site,
        "site_name": site.name,
        "is_early_checkin": is_early_checkin,
        "billable_start_time": billable_start_time,
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
    today = get_local_today()
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
    
    site = db.query(ConstructionSite).filter(ConstructionSite.id == active_segment.site_id).first()
    
    # End any active break
    if active_segment.break_start_time and not active_segment.break_end_time:
        active_segment.break_end_time = get_local_now()
    
    # Close any active geofence pause
    active_geo_pause = db.query(GeofencePause).filter(
        GeofencePause.segment_id == active_segment.id,
        GeofencePause.pause_end == None
    ).first()
    if active_geo_pause:
        active_geo_pause.pause_end = get_local_now()
    
    # Update segment with clock-out
    active_segment.check_out_time = get_local_now()
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
    
    # Auto lunch break calculation (Temporarily disabled to avoid user confusion)
    # lunch_break_start = ensure_time(site.lunch_break_start) if site else None
    # lunch_break_end = ensure_time(site.lunch_break_end) if site else None
    
    # if site and lunch_break_start and lunch_break_end:
    #     lunch_start_dt = datetime.combine(get_local_today(), lunch_break_start)
    #     lunch_end_dt = datetime.combine(get_local_today(), lunch_break_end)
    #     
    #     overlap_start = max(active_segment.check_in_time, lunch_start_dt)
    #     overlap_end = min(active_segment.check_out_time, lunch_end_dt)
    #     
    #     if overlap_start < overlap_end:
    #         auto_break_hours = (overlap_end - overlap_start).total_seconds() / 3600
    #         if auto_break_hours > break_hours:
    #             break_hours = auto_break_hours
    
    # Calculate geofence pause hours
    geofence_pause_secs = get_geofence_pause_seconds(db, active_segment.id)
    geofence_pause_hours = geofence_pause_secs / 3600
    
    # ----- OVERTIME CALCULATION -----
    overtime_minutes = 0
    overtime_warning = None
    
    work_end_time = ensure_time(site.work_end_time) if site else None
    if site and work_end_time:
        schedule_end_dt = datetime.combine(get_local_today(), work_end_time)
        if active_segment.check_out_time > schedule_end_dt:
            overtime_minutes = int((active_segment.check_out_time - schedule_end_dt).total_seconds() / 60)
            active_segment.overtime_minutes = overtime_minutes
            
            max_ot = int(site.max_overtime_minutes) if site.max_overtime_minutes else 120
            if overtime_minutes > max_ot:
                overtime_warning = f"Ai depășit limita de overtime ({max_ot} min). Orele suplimentare necesită aprobare."
    
    db.commit()
    
    return {
        "segment_id": active_segment.id,
        "check_out_time": active_segment.check_out_time,
        "total_hours": round(total_hours, 2),
        "break_hours": round(break_hours, 2),
        "geofence_pause_hours": round(geofence_pause_hours, 2),
        "worked_hours": max(0, round(total_hours - break_hours - geofence_pause_hours, 2)),
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
    today = get_local_today()
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
    active_segment.break_start_time = get_local_now()
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
    today = get_local_today()
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
    active_segment.break_end_time = get_local_now()
    
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
    try:
        today = get_local_today()
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
        
        work_start_time = ensure_time(site.work_start_time) if site else None
        work_end_time = ensure_time(site.work_end_time) if site else None
        
        # ---- AUTO-CLOSE at schedule end ----
        now = get_local_now()
        if site and work_end_time:
            schedule_end = datetime.combine(today, work_end_time)
            
            # Only auto-close if segment started BEFORE schedule end (prevents zombies)
            if active_segment.check_in_time < schedule_end and now > schedule_end:
                active_segment.check_out_time = schedule_end
                
                # Close any active break
                if active_segment.break_start_time and not active_segment.break_end_time:
                    active_segment.break_end_time = schedule_end
                
                # Close any active geofence pause
                active_geo_pause = db.query(GeofencePause).filter(
                    GeofencePause.segment_id == active_segment.id,
                    GeofencePause.pause_end == None
                ).first()
                if active_geo_pause:
                    active_geo_pause.pause_end = schedule_end
                
                db.commit()
                return JSONResponse(content=None)  # Shift closed at schedule end
        
        # Calculate elapsed time
        now = get_local_now()
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
                
        # Auto lunch break implementation (Temporarily disabled)
        # lunch_break_start = ensure_time(site.lunch_break_start) if site else None
        # lunch_break_end = ensure_time(site.lunch_break_end) if site else None
        # 
        # if site and lunch_break_start and lunch_break_end:
        #     lunch_start_dt = datetime.combine(today, lunch_break_start)
        #     lunch_end_dt = datetime.combine(today, lunch_break_end)
        #     
        #     overlap_start = max(active_segment.check_in_time, lunch_start_dt)
        #     overlap_end = min(now, lunch_end_dt)
        #     
        #     if overlap_start < overlap_end:
        #         auto_break_hours = (overlap_end - overlap_start).total_seconds() / 3600
        #         if auto_break_hours > break_hours:
        #             break_hours = auto_break_hours
        
        # Calculate geofence pause time
        geofence_pause_secs = get_geofence_pause_seconds(db, active_segment.id)
        geofence_pause_hours = geofence_pause_secs / 3600
        
        # Check if currently outside geofence
        active_geo_pause = db.query(GeofencePause).filter(
            GeofencePause.segment_id == active_segment.id,
            GeofencePause.pause_end == None
        ).first()
        
        # Detect GPS loss: no ping in last 5 minutes (daca a trimis ping vreodata)
        gps_lost = False
        if active_segment.last_ping_at:
            since_last_ping = (now - active_segment.last_ping_at).total_seconds()
            gps_lost = since_last_ping > 300  # 5 minute fara ping = GPS pierdut
        # Daca nu a trimis niciodata un ping, nu marcam GPS pierdut
        
        max_overtime = int(site.max_overtime_minutes) if site and site.max_overtime_minutes else 120
        
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
            "work_start_time": work_start_time.strftime('%H:%M') if work_start_time else None,
            "work_end_time": work_end_time.strftime('%H:%M') if work_end_time else None,
            "max_overtime_minutes": max_overtime,
            "schedule_end_datetime": str(datetime.combine(today, work_end_time)) if work_end_time else None,
            "overtime_limit_datetime": str(datetime.combine(today, work_end_time) + timedelta(minutes=max_overtime)) if work_end_time else None
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Active shift error: {error_details}")


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
    today = get_local_today()
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
    active_segment.last_ping_at = get_local_now()
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
            pause_start=get_local_now(),
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
        active_pause.pause_end = get_local_now()
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
    today = get_local_today()
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


@router.get("/timesheets/my-history")
def my_history(
    target_date: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get employee's own timesheet details for a specific date"""
    if target_date:
        d = date.fromisoformat(target_date)
    else:
        d = get_local_today()
    
    ts = db.query(Timesheet).filter(
        Timesheet.owner_user_id == current_user.id,
        Timesheet.date == d
    ).first()
    
    if not ts:
        return {"date": str(d), "found": False, "segments": [], "activities": [], "total_worked": 0, "total_break": 0}
    
    segments = db.query(TimesheetSegment).filter(
        TimesheetSegment.timesheet_id == ts.id
    ).order_by(TimesheetSegment.check_in_time.asc()).all()
    
    total_worked = 0
    total_break = 0
    seg_list = []
    
    for seg in segments:
        if seg.check_out_time:
            seg_hours = (seg.check_out_time - seg.check_in_time).total_seconds() / 3600
        else:
            seg_hours = (get_local_now() - seg.check_in_time).total_seconds() / 3600
        
        brk = 0
        if seg.break_start_time:
            be = seg.break_end_time or get_local_now()
            brk = (be - seg.break_start_time).total_seconds() / 3600
            
        site = db.query(ConstructionSite).filter(ConstructionSite.id == seg.site_id).first()
        
        # Auto lunch break logic (Temporarily disabled)
        # lunch_break_start = ensure_time(site.lunch_break_start) if site else None
        # lunch_break_end = ensure_time(site.lunch_break_end) if site else None
        # 
        # if site and lunch_break_start and lunch_break_end:
        #     lunch_start_dt = datetime.combine(d, lunch_break_start)
        #     lunch_end_dt = datetime.combine(d, lunch_break_end)
        #     
        #     check_out = seg.check_out_time or get_local_now()
        #     overlap_start = max(seg.check_in_time, lunch_start_dt)
        #     overlap_end = min(check_out, lunch_end_dt)
        #     
        #     if overlap_start < overlap_end:
        #         auto_brk = (overlap_end - overlap_start).total_seconds() / 3600
        #         if auto_brk > brk:
        #             brk = auto_brk
        
        geo_pause = get_geofence_pause_seconds(db, seg.id) / 3600
        worked = max(0, seg_hours - brk - geo_pause)
        total_worked += worked
        total_break += brk
        
        seg_list.append({
            "check_in": str(seg.check_in_time),
            "check_out": str(seg.check_out_time) if seg.check_out_time else None,
            "site_name": site.name if site else "N/A",
            "worked_hours": round(worked, 2),
            "break_hours": round(brk, 2),
            "geofence_pause_hours": round(geo_pause, 2),
            "is_active": seg.check_out_time is None
        })
    
    # Activities
    lines = db.query(TimesheetLine).filter(TimesheetLine.timesheet_id == ts.id).all()
    act_list = []
    for ln in lines:
        act = db.query(Activity).filter(Activity.id == ln.activity_id).first()
        if act:
            act_list.append({
                "name": act.name,
                "quantity": float(ln.quantity_numeric),
                "unit_type": ln.unit_type
            })
    
    return {
        "date": str(d),
        "found": True,
        "segments": seg_list,
        "activities": act_list,
        "total_worked": round(total_worked, 2),
        "total_break": round(total_break, 2),
        "status": ts.status
    }


@router.get("/timesheets/my-dates")
def my_dates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of dates where employee has timesheets (last 60 days)"""
    from sqlalchemy import func
    cutoff = get_local_today() - timedelta(days=60)
    
    dates = db.query(Timesheet.date).filter(
        Timesheet.owner_user_id == current_user.id,
        Timesheet.date >= cutoff
    ).distinct().order_by(Timesheet.date.desc()).all()
    
    return {"dates": [str(d[0]) for d in dates]}


@router.delete("/timesheets/cleanup-zombies")
def cleanup_zombie_segments(
    target_date: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete zombie segments (< 2min duration) for a given date. Admin only."""
    # Check admin role
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not role or role.code not in ("ADMIN", "SITE_MANAGER"):
        raise HTTPException(status_code=403, detail="Acces interzis")
    
    d = date.fromisoformat(target_date) if target_date else get_local_today()
    
    # Find all timesheets for this date
    timesheets = db.query(Timesheet).filter(Timesheet.date == d).all()
    
    deleted = 0
    for ts in timesheets:
        segments = db.query(TimesheetSegment).filter(
            TimesheetSegment.timesheet_id == ts.id,
            TimesheetSegment.check_out_time != None
        ).all()
        
        for seg in segments:
            duration = (seg.check_out_time - seg.check_in_time).total_seconds()
            if duration < 120:  # Less than 2 minutes
                db.delete(seg)
                deleted += 1
    
    db.commit()
    return {"deleted": deleted, "date": str(d)}

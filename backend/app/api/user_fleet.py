from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import date
import uuid

from app.database import get_db
from app.models import Vehicle, VehicleSiteAssignment, VehicleUserAssignment, EquipmentDailyLog, User
from app.api.auth import get_current_user

router = APIRouter(prefix="/user/fleet", tags=["user-fleet"])

class EquipmentLogCreate(BaseModel):
    vehicle_id: str
    is_used: bool = False
    refueled: bool = False
    refuel_liters: Optional[float] = None
    notes: Optional[str] = None

def get_vehicle_with_ids(vehicle: Vehicle, db: Session) -> dict:
    """Build response dict with associated site_ids and user_ids."""
    site_ids = [
        a.site_id for a in db.query(VehicleSiteAssignment)
        .filter(VehicleSiteAssignment.vehicle_id == vehicle.id, VehicleSiteAssignment.is_active == True)
        .all()
    ]
    user_ids = [
        a.user_id for a in db.query(VehicleUserAssignment)
        .filter(VehicleUserAssignment.vehicle_id == vehicle.id, VehicleUserAssignment.is_active == True)
        .all()
    ]
    return {
        "id": vehicle.id,
        "name": vehicle.name,
        "plate_number": vehicle.plate_number,
        "chassis_number": vehicle.chassis_number,
        "type": vehicle.type,
        "status": vehicle.status,
        "notes": vehicle.notes,
        "site_ids": site_ids,
        "user_ids": user_ids
    }

@router.get("", response_model=List[dict])
def list_vehicles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all vehicles for the organization."""
    vehicles = db.query(Vehicle).filter(
        Vehicle.organization_id == current_user.organization_id,
        Vehicle.status == "active"
    ).order_by(Vehicle.name).all()
    
    return [get_vehicle_with_ids(v, db) for v in vehicles]

@router.post("/equipment-logs", status_code=201)
def add_equipment_log(
    payload: EquipmentLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a daily log/fuel record from the mobile app."""
    log_date = date.today()
    
    # Check if a log already exists for this vehicle and date
    existing = db.query(EquipmentDailyLog).filter(
        EquipmentDailyLog.vehicle_id == payload.vehicle_id,
        EquipmentDailyLog.date == log_date
    ).first()
    
    # Find active site for the user if they are clocked in
    # This might require checking timesheets or just leaving it null if not explicitly passed
    
    if existing:
        # We only update if the employee adds fuel or notes
        if payload.is_used: existing.is_used = True
        if payload.refueled: 
            existing.refueled = True
            existing.refuel_liters = (existing.refuel_liters or 0) + (payload.refuel_liters or 0)
        if payload.notes:
            existing.notes = (existing.notes + "\n" + payload.notes) if existing.notes else payload.notes
        existing.operator_id = current_user.id
        db.commit()
        return {"message": "Log updated", "id": existing.id}
    
    log = EquipmentDailyLog(
        id=str(uuid.uuid4()),
        vehicle_id=payload.vehicle_id,
        site_id=None, # In viitor se poate lega de pontajul curent
        operator_id=current_user.id,
        date=log_date,
        is_used=payload.is_used,
        refueled=payload.refueled,
        refuel_liters=payload.refuel_liters,
        notes=payload.notes
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"message": "Log created", "id": log.id}

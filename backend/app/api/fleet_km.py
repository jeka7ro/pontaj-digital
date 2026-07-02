from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
import uuid

from app.database import get_db
from app.models import VehicleDailyKm, Vehicle, Admin
from app.api.admin_auth import get_current_admin

router = APIRouter(prefix="/admin/fleet/km", tags=["admin-fleet-km"])

class DailyKmCreate(BaseModel):
    vehicle_id: str
    date: str
    site_id: Optional[str] = None
    km_driven: float
    notes: Optional[str] = None

class DailyKmResponse(BaseModel):
    id: str
    vehicle_id: str
    date: date
    site_id: Optional[str] = None
    km_driven: float
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/{vehicle_id}", response_model=List[DailyKmResponse])
def get_daily_km(
    vehicle_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    entries = db.query(VehicleDailyKm).filter(
        VehicleDailyKm.vehicle_id == vehicle_id
    ).order_by(VehicleDailyKm.date.desc(), VehicleDailyKm.created_at.desc()).all()
    return entries

@router.post("", response_model=DailyKmResponse, status_code=201)
def create_daily_km(
    payload: DailyKmCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    v = db.query(Vehicle).filter(
        Vehicle.id == payload.vehicle_id,
        Vehicle.organization_id == current_admin.organization_id
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicul negasit")

    entry = VehicleDailyKm(
        id=str(uuid.uuid4()),
        vehicle_id=payload.vehicle_id,
        date=date.fromisoformat(payload.date),
        site_id=payload.site_id,
        km_driven=payload.km_driven,
        notes=payload.notes,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

@router.delete("/{entry_id}", status_code=204)
def delete_daily_km(
    entry_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    entry = db.query(VehicleDailyKm).filter(VehicleDailyKm.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Inregistrare negasita")
    
    v = db.query(Vehicle).filter(Vehicle.id == entry.vehicle_id, Vehicle.organization_id == current_admin.organization_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Inregistrare negasita")

    db.delete(entry)
    db.commit()
    return None

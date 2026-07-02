from app.storage import upload_file, get_content_type
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime, time
import uuid
import os

from app.database import get_db
from app.models import VehicleFuelEntry, Vehicle, Admin
from app.api.admin_auth import get_current_admin

router = APIRouter(prefix="/admin/fleet/fuel", tags=["admin-fleet-fuel"])

class FuelEntryCreate(BaseModel):
    vehicle_id: str
    date: str
    time: Optional[str] = None
    supplier: str
    fuel_card: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    liters: float
    total_cost: float
    currency: Optional[str] = "EUR"
    site_id: Optional[str] = None
    notes: Optional[str] = None

class FuelEntryResponse(BaseModel):
    id: str
    vehicle_id: str
    date: date
    time: Optional[time] = None
    supplier: str
    fuel_card: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    liters: float
    total_cost: float
    currency: Optional[str] = "EUR"
    site_id: Optional[str] = None
    notes: Optional[str] = None
    receipt_photo_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/{vehicle_id}", response_model=List[FuelEntryResponse])
def get_fuel_entries(
    vehicle_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    entries = db.query(VehicleFuelEntry).filter(
        VehicleFuelEntry.vehicle_id == vehicle_id
    ).order_by(VehicleFuelEntry.date.desc(), VehicleFuelEntry.created_at.desc()).all()
    return entries

@router.post("", response_model=FuelEntryResponse, status_code=201)
def create_fuel_entry(
    payload: FuelEntryCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    v = db.query(Vehicle).filter(
        Vehicle.id == payload.vehicle_id,
        Vehicle.organization_id == current_admin.organization_id
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicul negasit")

    t = None
    if payload.time:
        try:
            t = time.fromisoformat(payload.time)
        except ValueError:
            pass

    entry = VehicleFuelEntry(
        id=str(uuid.uuid4()),
        vehicle_id=payload.vehicle_id,
        date=date.fromisoformat(payload.date),
        time=t,
        supplier=payload.supplier,
        fuel_card=payload.fuel_card,
        country=payload.country,
        city=payload.city,
        liters=payload.liters,
        total_cost=payload.total_cost,
        currency=payload.currency,
        site_id=payload.site_id,
        notes=payload.notes,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

@router.post("/{entry_id}/upload-receipt", response_model=FuelEntryResponse)
async def upload_receipt(
    entry_id: str,
    file: UploadFile = File(...),
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    entry = db.query(VehicleFuelEntry).filter(VehicleFuelEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Alimentare negasita")

    file_ext = file.filename.split(".")[-1]
    safe_filename = f"{uuid.uuid4().hex}.{file_ext}"
    content = await file.read()
    
    # Use global storage (Cloud/Supabase or local fallback)
    file_url = upload_file(content, f"receipts/{safe_filename}", get_content_type(safe_filename))
    entry.receipt_photo_url = file_url
    db.commit()
    db.refresh(entry)
    return entry

@router.delete("/{entry_id}", status_code=204)
def delete_fuel_entry(
    entry_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    entry = db.query(VehicleFuelEntry).filter(VehicleFuelEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Alimentare negasita")
    
    v = db.query(Vehicle).filter(Vehicle.id == entry.vehicle_id, Vehicle.organization_id == current_admin.organization_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Alimentare negasita")

    db.delete(entry)
    db.commit()
    return None

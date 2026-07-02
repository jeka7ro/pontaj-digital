"""
Admin API endpoints for Fleet Management (Vehicles & Machinery)
Supports Many-to-Many: Vehicle <-> Sites, Vehicle <-> Drivers
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
import os
from sqlalchemy import and_, desc
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, date, timedelta

import json
from sqlalchemy import func

from app.database import get_db
from app.models import Vehicle, VehicleSiteAssignment, VehicleUserAssignment, ConstructionSite, User, Admin, EquipmentDailyLog, VehicleFuelEntry, VehicleDailyKm, WarehouseTransaction, WarehouseItem
from app.api.admin_auth import get_current_admin

router = APIRouter(prefix="/admin/vehicles", tags=["admin-fleet"])


# =================== PYDANTIC SCHEMAS ===================

class VehicleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    plate_number: Optional[str] = Field(None, max_length=20)
    chassis_number: Optional[str] = Field(None, max_length=50)
    type: str = "van"
    year: Optional[int] = None
    status: str = "active"
    notes: Optional[str] = None
    documents: Optional[list] = None
    site_ids: List[str] = []
    user_ids: List[str] = []


class VehicleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    plate_number: Optional[str] = Field(None, max_length=20)
    chassis_number: Optional[str] = Field(None, max_length=50)
    type: Optional[str] = None
    year: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    documents: Optional[list] = None
    site_ids: Optional[List[str]] = None
    user_ids: Optional[List[str]] = None


class VehicleResponse(BaseModel):
    id: str
    name: str
    plate_number: Optional[str] = None
    type: str
    year: Optional[int] = None
    status: str
    notes: Optional[str] = None
    site_ids: List[str] = []
    user_ids: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True


class EquipmentLogCreate(BaseModel):
    vehicle_id: str
    site_id: Optional[str] = None
    operator_id: Optional[str] = None
    date: str  # YYYY-MM-DD
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
    
    # Calculate total km and fuel, and fetch fuel receipts
    total_km = sum([entry.km_driven or 0 for entry in db.query(VehicleDailyKm).filter(VehicleDailyKm.vehicle_id == vehicle.id).all()])
    
    fuel_entries = db.query(VehicleFuelEntry).filter(VehicleFuelEntry.vehicle_id == vehicle.id).all()
    total_fuel = sum([entry.liters or 0 for entry in fuel_entries])
    
    fuel_receipts = [
        {"url": e.receipt_photo_url, "name": f"Bon Combustibil {e.date}", "date": str(e.date)} 
        for e in fuel_entries if e.receipt_photo_url
    ]
    
    return {
        "id": vehicle.id,
        "name": vehicle.name,
        "plate_number": vehicle.plate_number,
        "chassis_number": vehicle.chassis_number,
        "type": vehicle.type,
        "year": vehicle.year,
        "status": vehicle.status,
        "notes": vehicle.notes,
        "documents": vehicle.documents,
        "site_ids": site_ids,
        "user_ids": user_ids,
        "total_km": total_km,
        "total_fuel": total_fuel,
        "fuel_receipts": fuel_receipts,
        "created_at": vehicle.created_at,
    }


def sync_assignments(vehicle_id: str, new_site_ids: List[str], new_user_ids: List[str], db: Session):
    """Sync site and user assignments for a vehicle (replace all)."""
    # Sites — deactivate all, then re-create active ones
    db.query(VehicleSiteAssignment).filter(
        VehicleSiteAssignment.vehicle_id == vehicle_id
    ).delete(synchronize_session=False)

    for sid in new_site_ids:
        db.add(VehicleSiteAssignment(vehicle_id=vehicle_id, site_id=sid, is_active=True))

    # Users — same
    db.query(VehicleUserAssignment).filter(
        VehicleUserAssignment.vehicle_id == vehicle_id
    ).delete(synchronize_session=False)

    for uid in new_user_ids:
        db.add(VehicleUserAssignment(vehicle_id=vehicle_id, user_id=uid, is_active=True))


# =================== ENDPOINTS ===================

@router.get("", response_model=List[dict])
def list_vehicles(
    status: Optional[str] = None,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all vehicles, optionally filtered by status."""
    q = db.query(Vehicle).filter(Vehicle.organization_id == current_admin.organization_id)
    if status:
        q = q.filter(Vehicle.status == status)
    vehicles = q.order_by(Vehicle.name).all()
    
    if not vehicles:
        return []
        
    vehicle_ids = [v.id for v in vehicles]
    
    # Batch fetch site assignments
    site_assignments = db.query(VehicleSiteAssignment).filter(
        VehicleSiteAssignment.vehicle_id.in_(vehicle_ids),
        VehicleSiteAssignment.is_active == True
    ).all()
    sites_by_vehicle = {}
    for a in site_assignments:
        sites_by_vehicle.setdefault(a.vehicle_id, []).append(a.site_id)
        
    # Batch fetch user assignments
    user_assignments = db.query(VehicleUserAssignment).filter(
        VehicleUserAssignment.vehicle_id.in_(vehicle_ids),
        VehicleUserAssignment.is_active == True
    ).all()
    users_by_vehicle = {}
    for a in user_assignments:
        users_by_vehicle.setdefault(a.vehicle_id, []).append(a.user_id)
        
    # Calculate totals per vehicle
    vehicle_km = db.query(VehicleDailyKm.vehicle_id, func.sum(VehicleDailyKm.km_driven).label('total_km')).filter(
        VehicleDailyKm.vehicle_id.in_(vehicle_ids)
    ).group_by(VehicleDailyKm.vehicle_id).all()
    km_by_vehicle = {row.vehicle_id: row.total_km for row in vehicle_km}

    vehicle_fuel = db.query(VehicleFuelEntry.vehicle_id, func.sum(VehicleFuelEntry.liters).label('total_fuel')).filter(
        VehicleFuelEntry.vehicle_id.in_(vehicle_ids)
    ).group_by(VehicleFuelEntry.vehicle_id).all()
    fuel_by_vehicle = {row.vehicle_id: row.total_fuel for row in vehicle_fuel}

    # Fetch fuel receipts for all vehicles in list
    receipts_query = db.query(VehicleFuelEntry).filter(
        VehicleFuelEntry.vehicle_id.in_(vehicle_ids),
        VehicleFuelEntry.receipt_photo_url.isnot(None)
    ).all()
    receipts_by_vehicle = {}
    for r in receipts_query:
        receipts_by_vehicle.setdefault(r.vehicle_id, []).append({
            "url": r.receipt_photo_url, 
            "name": f"Bon Combustibil {r.date}", 
            "date": str(r.date)
        })

    results = []
    for v in vehicles:
        results.append({
            "id": v.id,
            "name": v.name,
            "plate_number": v.plate_number,
            "chassis_number": v.chassis_number,
            "type": v.type,
            "year": v.year,
            "status": v.status,
            "notes": v.notes,
            "documents": v.documents,
            "fuel_receipts": receipts_by_vehicle.get(v.id, []),
            "site_ids": sites_by_vehicle.get(v.id, []),
            "user_ids": users_by_vehicle.get(v.id, []),
            "total_km": km_by_vehicle.get(v.id, 0),
            "total_fuel": fuel_by_vehicle.get(v.id, 0),
            "created_at": v.created_at,
        })
        
    return results


@router.get("/expiring-documents", response_model=List[dict])
def get_expiring_documents(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Retrieve all fleet documents expiring within 45 days, or already expired."""
    vehicles = db.query(Vehicle).filter(
        Vehicle.organization_id == current_admin.organization_id
    ).all()
    
    alerts = []
    threshold_date = date.today() + timedelta(days=45)
    today_str = date.today().isoformat()
    
    for v in vehicles:
        if v.documents:
            for doc in v.documents:
                exp_str = doc.get("expiry_date")
                if exp_str:
                    try:
                        exp = date.fromisoformat(exp_str)
                        if exp <= threshold_date:
                            days_left = (exp - date.today()).days
                            if days_left < 0:
                                status = 'expired'
                            elif days_left <= 7:
                                status = 'critical'
                            else:
                                status = 'warning'
                            alerts.append({
                                "vehicle_id": v.id,
                                "vehicle_name": v.name,
                                "registration": v.registration_number or v.chassis_number or "N/A",
                                "document_id": doc.get("id"),
                                "document_name": doc.get("name"),
                                "url": doc.get("url"),
                                "expiry_date": exp_str,
                                "days_left": days_left,
                                "status": status
                            })
                    except ValueError:
                        pass
    
    # Sort closest to expiration first
    alerts.sort(key=lambda x: x["days_left"])
    return alerts



@router.get("/by-site/{site_id}", response_model=List[dict])
def vehicles_for_site(
    site_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get all vehicles currently assigned to a specific site."""
    assignments = db.query(VehicleSiteAssignment).filter(
        VehicleSiteAssignment.site_id == site_id,
        VehicleSiteAssignment.is_active == True,
    ).all()
    result = []
    for a in assignments:
        v = db.query(Vehicle).filter(Vehicle.id == a.vehicle_id).first()
        if v:
            result.append(get_vehicle_with_ids(v, db))
    return result


@router.get("/fleet-report")
def fleet_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Aggregate equipment usage & fuel consumption per vehicle for a date range."""
    vehicles = db.query(Vehicle).filter(
        Vehicle.organization_id == current_admin.organization_id
    ).all()

    d_from = date.fromisoformat(date_from) if date_from else date.today().replace(day=1)
    d_to = date.fromisoformat(date_to) if date_to else date.today()

    result = []
    for v in vehicles:
        km_logs = db.query(VehicleDailyKm).filter(
            VehicleDailyKm.vehicle_id == v.id,
            VehicleDailyKm.date >= d_from,
            VehicleDailyKm.date <= d_to,
        ).all()
        
        fuel_logs = db.query(VehicleFuelEntry).filter(
            VehicleFuelEntry.vehicle_id == v.id,
            VehicleFuelEntry.date >= d_from,
            VehicleFuelEntry.date <= d_to,
        ).all()

        days_used = len(km_logs)
        total_fuel = sum((l.liters or 0) for l in fuel_logs)
        refuel_events = len(fuel_logs)

        last_op_name = None
        
        # We need to correctly sort checking dates
        all_logs = []
        for km in km_logs:
            # Note: driver_id might not exist on VehicleDailyKm, if it doesn't we skip or use operator if we add it
            d_id = getattr(km, 'driver_id', None) or getattr(km, 'user_id', None)
            d_date = getattr(km, 'date', None) or getattr(km, 'created_at')
            if d_id and d_date:
                all_logs.append({"date": d_date, "driver_id": d_id})
        for fl in fuel_logs:
            d_id = getattr(fl, 'driver_id', None) or getattr(fl, 'user_id', None)
            d_date = getattr(fl, 'date', None) or getattr(fl, 'created_at')
            if d_id and d_date:
                all_logs.append({"date": d_date, "driver_id": d_id})
            
        last_logs = sorted(all_logs, key=lambda l: l['date'], reverse=True)
        if last_logs and last_logs[0].get('driver_id'):
            op = db.query(User).filter(User.id == last_logs[0]['driver_id']).first()
            if op:
                last_op_name = f"{op.first_name} {op.last_name}"

        result.append({
            "vehicle_id": v.id,
            "vehicle_name": v.name,
            "registration": v.plate_number or v.chassis_number or "N/A",
            "type": v.type or "—",
            "status": v.status,
            "days_used": days_used,
            "days_idle": 0,
            "total_logs": len(km_logs) + len(fuel_logs),
            "total_fuel_liters": round(total_fuel, 2),
            "refuel_events": refuel_events,
            "last_operator": last_op_name,
            "date_from": str(d_from),
            "date_to": str(d_to),
        })

    result.sort(key=lambda x: x["days_used"], reverse=True)
    return result

@router.get("/{vehicle_id}", response_model=dict)
def get_vehicle(
    vehicle_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    v = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id,
        Vehicle.organization_id == current_admin.organization_id
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicul negasit")
    return get_vehicle_with_ids(v, db)


@router.post("", response_model=dict, status_code=201)
def create_vehicle(
    payload: VehicleCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    import uuid
    v = Vehicle(
        id=str(uuid.uuid4()),
        organization_id=current_admin.organization_id,
        name=payload.name,
        plate_number=payload.plate_number,
        chassis_number=payload.chassis_number,
        type=payload.type,
        year=payload.year,
        status=payload.status,
        notes=payload.notes,
        documents=payload.documents,
    )
    db.add(v)
    db.flush()  # get ID before sync
    sync_assignments(v.id, payload.site_ids, payload.user_ids, db)
    db.commit()
    db.refresh(v)
    return get_vehicle_with_ids(v, db)


@router.put("/{vehicle_id}", response_model=dict)
def update_vehicle(
    vehicle_id: str,
    payload: VehicleUpdate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    v = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id,
        Vehicle.organization_id == current_admin.organization_id
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicul negasit")

    if payload.name is not None:
        v.name = payload.name
    if payload.plate_number is not None:
        v.plate_number = payload.plate_number
    if hasattr(payload, 'chassis_number') and payload.chassis_number is not None:
        v.chassis_number = payload.chassis_number
    if payload.type is not None:
        v.type = payload.type
    if payload.year is not None:
        v.year = payload.year
    if payload.status is not None:
        v.status = payload.status
    if payload.notes is not None:
        v.notes = payload.notes
    if hasattr(payload, 'documents') and payload.documents is not None:
        v.documents = payload.documents

    if payload.site_ids is not None or payload.user_ids is not None:
        sync_assignments(
            v.id,
            payload.site_ids if payload.site_ids is not None else [],
            payload.user_ids if payload.user_ids is not None else [],
            db,
        )

    db.commit()
    db.refresh(v)
    return get_vehicle_with_ids(v, db)


@router.delete("/{vehicle_id}", status_code=204)
def delete_vehicle(
    vehicle_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    v = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id,
        Vehicle.organization_id == current_admin.organization_id
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicul negasit")

    # Cascade handled by DB relationships
    db.delete(v)
    db.commit()
    return None


@router.post("/{vehicle_id}/upload-document")
async def upload_vehicle_document(
    vehicle_id: str,
    file: UploadFile = File(...),
    custom_name: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    v = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id,
        Vehicle.organization_id == current_admin.organization_id
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicul negasit")

    # Create directory if it doesn't exist
    upload_dir = "uploads/vehicles"
    os.makedirs(upload_dir, exist_ok=True)
    
    import uuid
    file_ext = file.filename.split(".")[-1]
    safe_filename = f"{uuid.uuid4().hex}.{file_ext}"
    file_path = os.path.join(upload_dir, safe_filename)
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    doc_url = f"/api/{file_path}"
    
    docs = list(v.documents or [])
    new_doc = {
        "id": str(uuid.uuid4()),
        "name": custom_name.strip() if custom_name and custom_name.strip() else file.filename,
        "url": doc_url,
        "uploaded_at": str(date.today()),
        "expiry_date": expiry_date,
        "original_filename": file.filename
    }
    docs.append(new_doc)
    v.documents = docs
    
    db.commit()
    db.refresh(v)
    return get_vehicle_with_ids(v, db)

@router.get("/by-user/{user_id}", response_model=List[dict])
def vehicles_for_user(
    user_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get all vehicles assigned to a specific user (driver/operator)."""
    assignments = db.query(VehicleUserAssignment).filter(
        VehicleUserAssignment.user_id == user_id,
        VehicleUserAssignment.is_active == True,
    ).all()
    result = []
    for a in assignments:
        v = db.query(Vehicle).filter(Vehicle.id == a.vehicle_id).first()
        if v:
            result.append(get_vehicle_with_ids(v, db))
    return result


@router.post("/equipment-logs", status_code=201)
def add_equipment_log(
    payload: EquipmentLogCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    import uuid
    log_date = date.fromisoformat(payload.date)
    
    # Check if a log already exists for this vehicle and date
    existing = db.query(EquipmentDailyLog).filter(
        EquipmentDailyLog.vehicle_id == payload.vehicle_id,
        EquipmentDailyLog.date == log_date
    ).first()
    
    if existing:
        existing.site_id = payload.site_id
        existing.operator_id = payload.operator_id
        existing.is_used = payload.is_used
        existing.refueled = payload.refueled
        existing.refuel_liters = payload.refuel_liters
        existing.notes = payload.notes
        db.commit()
        return {"message": "Log updated", "id": existing.id}
    
    log = EquipmentDailyLog(
        id=str(uuid.uuid4()),
        vehicle_id=payload.vehicle_id,
        site_id=payload.site_id,
        operator_id=payload.operator_id,
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


@router.get("/equipment-logs/operator/{operator_id}")
def get_equipment_logs_for_operator(
    operator_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    from app.models import VehicleUserAssignment, VehicleFuelEntry
    logs = db.query(EquipmentDailyLog).filter(
        EquipmentDailyLog.operator_id == operator_id
    ).order_by(desc(EquipmentDailyLog.date)).all()
    
    # Also fetch fuel entries for vehicles assigned to this operator
    user_vehicle_ids = [row[0] for row in db.query(VehicleUserAssignment.vehicle_id).filter(
        VehicleUserAssignment.user_id == operator_id,
        VehicleUserAssignment.is_active == True
    ).all()]

    fuel_entries = []
    if user_vehicle_ids:
        fuel_entries = db.query(VehicleFuelEntry).filter(
            VehicleFuelEntry.vehicle_id.in_(user_vehicle_ids)
        ).order_by(desc(VehicleFuelEntry.date)).all()
    
    result = []
    # Pre-fetch vehicles
    all_vehicles = {v.id: v for v in db.query(Vehicle).filter(Vehicle.organization_id == current_admin.organization_id).all()}
    
    for log in logs:
        v = all_vehicles.get(log.vehicle_id)
        if not v:
            continue
            
        result.append({
            "id": log.id,
            "vehicle_id": log.vehicle_id,
            "vehicle_name": v.name,
            "plate_number": v.plate_number or v.chassis_number or "N/A",
            "site_id": log.site_id,
            "operator_id": log.operator_id,
            "date": str(log.date),
            "is_used": log.is_used,
            "refueled": log.refueled,
            "refuel_liters": log.refuel_liters,
            "notes": log.notes,
            "type": "equipment_log"
        })
        
    for entry in fuel_entries:
        v = all_vehicles.get(entry.vehicle_id)
        if not v:
            continue
            
        result.append({
            "id": entry.id,
            "vehicle_id": entry.vehicle_id,
            "vehicle_name": v.name,
            "plate_number": v.plate_number or v.chassis_number or "N/A",
            "site_id": entry.site_id,
            "operator_id": operator_id,
            "date": str(entry.date),
            "is_used": True,
            "refueled": True,
            "refuel_liters": entry.liters,
            "notes": f"Bon Combustibil: {entry.supplier} - {entry.liters}L. " + (entry.notes or ""),
            "type": "fuel_entry"
        })
        
    # Sort descending by date
    result.sort(key=lambda x: x["date"], reverse=True)
    return result


@router.get("/equipment-logs/{vehicle_id}/{date_str}")
def get_equipment_log(
    vehicle_id: str,
    date_str: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    log_date = date.fromisoformat(date_str)
    log = db.query(EquipmentDailyLog).filter(
        EquipmentDailyLog.vehicle_id == vehicle_id,
        EquipmentDailyLog.date == log_date
    ).first()
    
    if not log:
        return None
        
    return {
        "id": log.id,
        "vehicle_id": log.vehicle_id,
        "site_id": log.site_id,
        "operator_id": log.operator_id,
        "date": str(log.date),
        "is_used": log.is_used,
        "refueled": log.refueled,
        "refuel_liters": log.refuel_liters,
        "notes": log.notes
    }


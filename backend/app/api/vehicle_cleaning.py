from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json
import uuid
import os

from app.database import get_db
from app.models import VehicleCleaningSession, Vehicle, User, VehicleUserAssignment
from app.api.auth import get_current_user
from app.api.admin_auth import get_current_admin
from app.storage import upload_file

router = APIRouter(tags=["vehicle-cleaning"])

@router.get("/worker/assigned-vehicles")
def get_worker_assigned_vehicles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assignments = db.query(VehicleUserAssignment).filter(
        VehicleUserAssignment.user_id == current_user.id,
        VehicleUserAssignment.is_active == True
    ).all()
    
    vehicles = []
    for a in assignments:
        v = a.vehicle
        if v and v.status == 'active':
            vehicles.append({
                "id": v.id,
                "name": v.name,
                "plate_number": v.plate_number
            })
    return vehicles


@router.post("/worker/vehicle-cleaning")
async def submit_cleaning_session(
    vehicle_id: str = Form(...),
    photos: str = Form(...), # JSON stringified
    files: List[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        photos_data = json.loads(photos)
    except:
        photos_data = {"exterior": {}, "interior": {}}
        
    uploaded_urls = {}
    if files:
        for file in files:
            content = await file.read()
            ext = os.path.splitext(file.filename)[1].lower()
            
            # Simple path generation
            file_id = str(uuid.uuid4())
            path = f"cleaning_photos/{current_user.organization_id}/{datetime.now().strftime('%Y/%m')}/{file_id}{ext}"
            
            url = upload_file(content, path, file.content_type)
            uploaded_urls[file.filename] = url
            
    # Map uploaded URLs to the photos JSON structure
    for category in ["exterior", "interior"]:
        if category in photos_data:
            for key, val in photos_data[category].items():
                if val in uploaded_urls:
                    photos_data[category][key] = uploaded_urls[val]
                
    session = VehicleCleaningSession(
        organization_id=current_user.organization_id,
        vehicle_id=vehicle_id,
        user_id=current_user.id,
        photos=photos_data
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"status": "success", "session_id": session.id}

@router.get("/worker/vehicle-cleaning/history")
def get_worker_cleaning_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sessions = db.query(VehicleCleaningSession).filter(
        VehicleCleaningSession.user_id == current_user.id
    ).order_by(VehicleCleaningSession.created_at.desc()).all()
    
    result = []
    for s in sessions:
        result.append({
            "id": s.id,
            "vehicle_name": s.vehicle.name if s.vehicle else "Unknown",
            "vehicle_plate": s.vehicle.plate_number if s.vehicle else "",
            "created_at": s.created_at,
            "photos": s.photos
        })
    return result

@router.get("/admin/vehicle-cleaning")
def get_cleaning_sessions(
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    sessions = db.query(VehicleCleaningSession).filter(
        VehicleCleaningSession.organization_id == admin.organization_id
    ).order_by(VehicleCleaningSession.created_at.desc()).all()
    
    result = []
    for s in sessions:
        result.append({
            "id": s.id,
            "vehicle_id": s.vehicle_id,
            "vehicle_name": s.vehicle.name if s.vehicle else "Unknown",
            "vehicle_plate": s.vehicle.plate_number if s.vehicle else "",
            "user_name": s.user.full_name if s.user else "Unknown",
            "created_at": s.created_at,
            "photos": s.photos
        })
    return result

@router.delete("/admin/vehicle-cleaning/{session_id}")
def delete_cleaning_session(
    session_id: str,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    session = db.query(VehicleCleaningSession).filter(
        VehicleCleaningSession.id == session_id,
        VehicleCleaningSession.organization_id == admin.organization_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    db.delete(session)
    db.commit()
    return {"status": "success"}

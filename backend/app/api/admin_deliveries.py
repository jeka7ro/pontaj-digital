from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from pathlib import Path
from datetime import datetime

from app.database import get_db
from app.models import Delivery, ConstructionSite, Admin, User
from app.api.admin_auth import get_current_admin
from app.schemas.deliveries import DeliveryCreate, DeliveryResponse
from app.storage import upload_file, get_content_type

router = APIRouter(prefix="/admin/logistics/deliveries", tags=["admin-deliveries"])

@router.get("", response_model=List[DeliveryResponse])
def get_deliveries(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
    site_id: Optional[str] = None
):
    query = db.query(Delivery).filter(Delivery.organization_id == current_admin.organization_id)
    if site_id:
        query = query.filter(Delivery.site_id == site_id)
        
    deliveries = query.order_by(Delivery.delivery_date.desc()).all()
    
    # We will manually map site_name and created_by_name to avoid complex join mapping for now
    result = []
    for d in deliveries:
        d_resp = DeliveryResponse.model_validate(d)
        if d.site:
            d_resp.site_name = d.site.name
        if d.creator:
            d_resp.created_by_name = d.creator.full_name
        result.append(d_resp)
        
    return result

@router.post("/upload")
async def upload_delivery_photo(
    file: UploadFile = File(...),
    current_admin: Admin = Depends(get_current_admin)
):
    try:
        file_content = await file.read()
        storage_path = f"deliveries/{current_admin.organization_id}/{file.filename}"
        file_url = upload_file(file_content, storage_path, get_content_type(file.filename))
        return {"url": file_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=DeliveryResponse)
def create_delivery(
    delivery: DeliveryCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    # Verify site
    site = db.query(ConstructionSite).filter(
        ConstructionSite.id == delivery.site_id,
        ConstructionSite.organization_id == current_admin.organization_id
    ).first()
    
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
        
    db_delivery = Delivery(
        organization_id=current_admin.organization_id,
        site_id=delivery.site_id,
        delivery_date=delivery.delivery_date,
        materials_delivered=delivery.materials_delivered,
        photo_url=delivery.photo_url,
        created_by_id=current_admin.id
    )
    db.add(db_delivery)
    db.commit()
    db.refresh(db_delivery)
    
    d_resp = DeliveryResponse.model_validate(db_delivery)
    d_resp.site_name = site.name
    d_resp.created_by_name = current_admin.full_name
    return d_resp

@router.put("/{delivery_id}", response_model=DeliveryResponse)
def update_delivery(
    delivery_id: str,
    delivery: DeliveryCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    db_delivery = db.query(Delivery).filter(
        Delivery.id == delivery_id,
        Delivery.organization_id == current_admin.organization_id
    ).first()
    
    if not db_delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
        
    site = db.query(ConstructionSite).filter(
        ConstructionSite.id == delivery.site_id,
        ConstructionSite.organization_id == current_admin.organization_id
    ).first()
    
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
        
    db_delivery.site_id = delivery.site_id
    db_delivery.delivery_date = delivery.delivery_date
    db_delivery.materials_delivered = delivery.materials_delivered
    db_delivery.photo_url = delivery.photo_url
    
    db.commit()
    db.refresh(db_delivery)
    
    d_resp = DeliveryResponse.model_validate(db_delivery)
    d_resp.site_name = site.name
    if db_delivery.creator:
        d_resp.created_by_name = db_delivery.creator.full_name
    return d_resp

@router.delete("/{delivery_id}")
def delete_delivery(
    delivery_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    delivery = db.query(Delivery).filter(
        Delivery.id == delivery_id,
        Delivery.organization_id == current_admin.organization_id
    ).first()
    
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
        
    db.delete(delivery)
    db.commit()
    return {"message": "Delivery deleted successfully"}

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models import MaterialRequest, Admin, WarehouseItem, WarehouseTransaction
import json
from app.api.admin_auth import get_current_admin
from sqlalchemy.orm import joinedload

router = APIRouter(prefix="/admin/material-requests", tags=["Admin - Necesar Materiale"])

class MaterialRequestStatusUpdate(BaseModel):
    status: str
    response: Optional[str] = None
    carrier: Optional[str] = None
    linked_items_json: Optional[str] = None

def mr_to_dict(mr: MaterialRequest) -> dict:
    return {
        "id": mr.id,
        "items_text": mr.items_text,
        "notes": mr.notes,
        "status": mr.status,
        "admin_response": mr.admin_response,
        "responded_at": str(mr.responded_at) if mr.responded_at else None,
        "responder_name": mr.responder.full_name if mr.responder else None,
        "created_at": str(mr.created_at),
        "updated_at": str(mr.updated_at),
        "user_id": mr.user_id,
        "user_name": mr.user.full_name if mr.user else "N/A",
        "avatar_path": mr.user.avatar_path if mr.user else None,
        "site_id": mr.site_id,
        "site_name": mr.site.name if mr.site else "N/A"
    }

def check_mr_permission(admin: Admin):
    allowed_roles = ["LOGISTIC", "LOGISTICS", "LOGISTICA", "SEF_SANTIER", "ADMIN", "SUPER_ADMIN", "VERIFICATOR_SANTIER", "SUPERVIZOR"]
    # Check if role is among allowed OR if user is super admin
    if admin.is_super_admin:
        return
    if admin.role.upper() not in allowed_roles:
        raise HTTPException(status_code=403, detail="Nu aveți permisiunea de a vedea necesarul de materiale.")

@router.get("/")
def list_material_requests(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    check_mr_permission(current_admin)
    q = db.query(MaterialRequest).options(
        joinedload(MaterialRequest.site),
        joinedload(MaterialRequest.user)
    ).filter(MaterialRequest.organization_id == current_admin.organization_id)
    if status_filter and status_filter != "all":
        q = q.filter(MaterialRequest.status == status_filter)
    requests = q.order_by(MaterialRequest.created_at.desc()).all()
    return [mr_to_dict(c) for c in requests]

@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    try:
        check_mr_permission(current_admin)
    except HTTPException:
        return {"count": 0}
        
    count = db.query(MaterialRequest).filter(
        MaterialRequest.organization_id == current_admin.organization_id,
        MaterialRequest.status == "pending"
    ).count()
    return {"count": count}

@router.put("/{mr_id}/status")
def change_status(
    mr_id: str,
    body: MaterialRequestStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    check_mr_permission(current_admin)
    valid_statuses = ["pending", "approved", "rejected", "delivered", "completed", "disputed"]
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status invalid. Valori acceptate: {valid_statuses}")

    c = db.query(MaterialRequest).filter(
        MaterialRequest.id == mr_id,
        MaterialRequest.organization_id == current_admin.organization_id
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cerere negasita")

    c.status = body.status
    if body.response is not None:
        c.admin_response = body.response
        
    if body.status == "delivered":
        if body.carrier:
            c.admin_response = (c.admin_response or "") + f"\n[Predat prin: {body.carrier}]"
    
    if body.linked_items_json:
        c.items_json = body.linked_items_json
        
    c.responded_by = current_admin.id
    c.responded_at = datetime.utcnow()
    c.updated_at = datetime.utcnow()
    
    db.commit()
    
    db.refresh(c)
    return mr_to_dict(c)

@router.delete("/{mr_id}")
def delete_mr(
    mr_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    check_mr_permission(current_admin)
    c = db.query(MaterialRequest).filter(
        MaterialRequest.id == mr_id,
        MaterialRequest.organization_id == current_admin.organization_id
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cerere negasita")
    db.delete(c)
    db.commit()
    return {"ok": True}

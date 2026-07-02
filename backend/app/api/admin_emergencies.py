from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models import Emergency, Admin
from app.api.admin_auth import get_current_admin

router = APIRouter(prefix="/admin/emergencies", tags=["Admin - Urgente"])

class EmergencyStatusBody(BaseModel):
    status: str  # active, resolved
    admin_response: Optional[str] = None

def emergency_to_dict(e: Emergency) -> dict:
    return {
        "id": e.id,
        "description": e.description,
        "severity": e.severity,
        "status": e.status,
        "admin_response": e.admin_response,
        "resolved_at": str(e.resolved_at) if e.resolved_at else None,
        "resolver_name": e.resolver.full_name if e.resolver else None,
        "created_at": str(e.created_at),
        "updated_at": str(e.updated_at),
        "user_id": e.user_id,
        "user_name": e.user.full_name if e.user else "N/A",
        "site_id": e.site_id,
        "site_name": e.site.name if e.site else "N/A"
    }

def check_emergency_permission(admin: Admin):
    allowed_roles = ["LOGISTICS", "SEF_SANTIER", "ADMIN", "SUPER_ADMIN", "VERIFICATOR_SANTIER", "SUPERVIZOR"]
    if admin.is_super_admin:
        return
    if admin.role.upper() not in allowed_roles:
        raise HTTPException(status_code=403, detail="Nu aveți permisiunea de a vedea urgențele.")

@router.get("/")
def list_emergencies(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    check_emergency_permission(current_admin)
    q = db.query(Emergency).filter(Emergency.organization_id == current_admin.organization_id)
    if status_filter and status_filter != "all":
        q = q.filter(Emergency.status == status_filter)
    emergencies = q.order_by(Emergency.created_at.desc()).all()
    return [emergency_to_dict(c) for c in emergencies]

@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    try:
        check_emergency_permission(current_admin)
    except HTTPException:
        return {"count": 0}
        
    count = db.query(Emergency).filter(
        Emergency.organization_id == current_admin.organization_id,
        Emergency.status == "active"
    ).count()
    return {"count": count}

@router.put("/{emergency_id}/status")
def change_status(
    emergency_id: str,
    body: EmergencyStatusBody,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    check_emergency_permission(current_admin)
    valid_statuses = ["active", "resolved"]
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status invalid. Valori acceptate: {valid_statuses}")

    e = db.query(Emergency).filter(
        Emergency.id == emergency_id,
        Emergency.organization_id == current_admin.organization_id
    ).first()
    if not e:
        raise HTTPException(status_code=404, detail="Urgenta negasita")

    e.status = body.status
    if body.admin_response is not None:
        e.admin_response = body.admin_response
    
    if body.status == "resolved":
        e.resolved_by = current_admin.id
        e.resolved_at = datetime.utcnow()
        
    e.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(e)
    return emergency_to_dict(e)

@router.delete("/{emergency_id}")
def delete_emergency(
    emergency_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    check_emergency_permission(current_admin)
    e = db.query(Emergency).filter(
        Emergency.id == emergency_id,
        Emergency.organization_id == current_admin.organization_id
    ).first()
    if not e:
        raise HTTPException(status_code=404, detail="Urgenta negasita")
    db.delete(e)
    db.commit()
    return {"ok": True}

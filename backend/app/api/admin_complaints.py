from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models import Complaint, Admin, Organization
from app.api.admin_auth import get_current_admin

def check_complaint_permission(admin: Admin):
    allowed_roles = ["TESA", "ADMIN", "SUPER_ADMIN", "FINANCIAR", "SUPERVIZOR", "LOGISTICS"]
    if admin.is_super_admin:
        return
    if admin.role.upper() not in allowed_roles:
        raise HTTPException(status_code=403, detail="Nu aveți permisiunea de a gestiona sesizările.")

router = APIRouter(prefix="/admin/complaints", tags=["Admin - Sesizari"])


class ComplaintResponseBody(BaseModel):
    admin_response: str
    status: Optional[str] = "resolved"  # open, in_review, resolved, closed


class ComplaintStatusBody(BaseModel):
    status: str  # open, in_review, resolved, closed


def complaint_to_dict(c: Complaint) -> dict:
    return {
        "id": c.id,
        "title": c.title,
        "content": c.content,
        "status": c.status,
        "admin_response": c.admin_response,
        "responded_at": str(c.responded_at) if c.responded_at else None,
        "responder_name": c.responder.full_name if c.responder else None,
        "created_at": str(c.created_at),
        "updated_at": str(c.updated_at),
        "user_id": c.user_id,
        "user_name": c.user.full_name if c.user else "N/A",
    }


@router.get("/")
def list_complaints(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Lista tuturor sesizarilor organizatiei"""
    check_complaint_permission(current_admin)
    q = db.query(Complaint).filter(Complaint.organization_id == current_admin.organization_id)
    if status_filter and status_filter != "all":
        q = q.filter(Complaint.status == status_filter)
    complaints = q.order_by(Complaint.created_at.desc()).all()
    return [complaint_to_dict(c) for c in complaints]


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Numar de sesizari deschise (pentru badge sidebar)"""
    try:
        check_complaint_permission(current_admin)
    except HTTPException:
        return {"count": 0}
        
    count = db.query(Complaint).filter(
        Complaint.organization_id == current_admin.organization_id,
        Complaint.status.in_(["open", "in_review"])
    ).count()
    return {"count": count}


@router.get("/{complaint_id}")
def get_complaint(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    check_complaint_permission(current_admin)
    c = db.query(Complaint).filter(
        Complaint.id == complaint_id,
        Complaint.organization_id == current_admin.organization_id
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Sesizare negasita")
    return complaint_to_dict(c)


@router.put("/{complaint_id}/respond")
def respond_to_complaint(
    complaint_id: str,
    body: ComplaintResponseBody,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Admin raspunde la o sesizare"""
    check_complaint_permission(current_admin)
    c = db.query(Complaint).filter(
        Complaint.id == complaint_id,
        Complaint.organization_id == current_admin.organization_id
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Sesizare negasita")

    c.admin_response = body.admin_response
    c.status = body.status
    c.responded_by = current_admin.id
    c.user_seen_response = False
    c.responded_at = datetime.utcnow()
    c.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(c)
    return complaint_to_dict(c)


@router.put("/{complaint_id}/status")
def change_status(
    complaint_id: str,
    body: ComplaintStatusBody,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Schimba statusul unei sesizari"""
    check_complaint_permission(current_admin)
    valid_statuses = ["open", "in_review", "resolved", "closed"]
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status invalid. Valori acceptate: {valid_statuses}")

    c = db.query(Complaint).filter(
        Complaint.id == complaint_id,
        Complaint.organization_id == current_admin.organization_id
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Sesizare negasita")

    c.status = body.status
    c.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(c)
    return complaint_to_dict(c)


@router.delete("/{complaint_id}")
def delete_complaint(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    check_complaint_permission(current_admin)
    c = db.query(Complaint).filter(
        Complaint.id == complaint_id,
        Complaint.organization_id == current_admin.organization_id
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Sesizare negasita")
    db.delete(c)
    db.commit()
    return {"ok": True}

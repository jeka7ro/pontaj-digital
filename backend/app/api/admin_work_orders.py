"""
admin_work_orders.py — API pentru Comenzi de Lucru (Work Orders) B2B
Acces protejat — doar adminii autentificați ai organizației pot opera.
"""

import secrets
import os
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import WorkOrder, Organization, ConstructionSite, Client, Admin
from app.api.admin_auth import get_current_admin

router = APIRouter()

# ──────────────────────────────────────────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────────────────────────────────────────

class WorkOrderCreate(BaseModel):
    title: str
    notes: Optional[str] = None
    start_date: Optional[str] = None
    deadline_date: Optional[str] = None
    # Locație
    site_id: Optional[str] = None
    site_address: Optional[str] = None
    # Client
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    # Conținut
    requirements: Optional[list] = []
    materials: Optional[list] = []
    volumes: Optional[list] = []

class WorkOrderUpdate(WorkOrderCreate):
    title: Optional[str] = None


def _serialize(wo: WorkOrder) -> dict:
    """Serializează un WorkOrder pentru răspuns JSON."""
    site_name = None
    client_display = wo.client_name
    
    if wo.site:
        site_name = wo.site.name
    if wo.client and not client_display:
        client_display = wo.client.name

    return {
        "id": wo.id,
        "token": wo.token,
        "title": wo.title,
        "notes": wo.notes,
        "start_date": str(wo.start_date) if wo.start_date else None,
        "deadline_date": str(wo.deadline_date) if wo.deadline_date else None,
        "site_id": wo.site_id,
        "site_name": site_name,
        "site_address": wo.site_address or (wo.site.address if wo.site else None),
        "client_id": wo.client_id,
        "client_name": client_display,
        "client_email": wo.client_email,
        "client_phone": wo.client_phone,
        "requirements": wo.requirements or [],
        "materials": wo.materials or [],
        "volumes": wo.volumes or [],
        "status": wo.status,
        "confirmed_at": wo.confirmed_at.isoformat() if wo.confirmed_at else None,
        "confirmed_by_name": wo.confirmed_by_name,
        "pdf_path": wo.pdf_path,
        "created_at": wo.created_at.isoformat() if wo.created_at else None,
        "updated_at": wo.updated_at.isoformat() if wo.updated_at else None,
    }


# ──────────────────────────────────────────────────────────────────────────────
# LIST
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/work-orders")
def list_work_orders(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Lista tuturor comenzilor de lucru ale organizației."""
    q = db.query(WorkOrder).filter(WorkOrder.organization_id == current_admin.organization_id)
    if status:
        q = q.filter(WorkOrder.status == status)
    wos = q.order_by(WorkOrder.created_at.desc()).all()
    return [_serialize(wo) for wo in wos]


# ──────────────────────────────────────────────────────────────────────────────
# CREATE
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/work-orders")
def create_work_order(
    payload: WorkOrderCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Creează o comandă de lucru nouă în status draft."""
    # Dacă s-a selectat un client existent, preia datele lui
    client_name = payload.client_name
    client_email = payload.client_email
    client_phone = payload.client_phone

    if payload.client_id:
        cl = db.query(Client).filter(
            Client.id == payload.client_id,
            Client.organization_id == current_admin.organization_id
        ).first()
        if cl:
            client_name = client_name or cl.name
            client_email = client_email or cl.email
            client_phone = client_phone or cl.phone

    wo = WorkOrder(
        organization_id=current_admin.organization_id,
        token=secrets.token_urlsafe(32),
        title=payload.title,
        notes=payload.notes,
        start_date=payload.start_date,
        deadline_date=payload.deadline_date,
        site_id=payload.site_id,
        site_address=payload.site_address,
        client_id=payload.client_id,
        client_name=client_name,
        client_email=client_email,
        client_phone=client_phone,
        requirements=payload.requirements or [],
        materials=payload.materials or [],
        volumes=payload.volumes or [],
        status="draft",
        created_by=current_admin.id,
    )
    db.add(wo)
    db.commit()
    db.refresh(wo)
    return _serialize(wo)


# ──────────────────────────────────────────────────────────────────────────────
# GET ONE
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/work-orders/{wo_id}")
def get_work_order(
    wo_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")
    return _serialize(wo)


# ──────────────────────────────────────────────────────────────────────────────
# UPDATE
# ──────────────────────────────────────────────────────────────────────────────
@router.put("/work-orders/{wo_id}")
def update_work_order(
    wo_id: str,
    payload: WorkOrderUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")
    if wo.status == "confirmed":
        raise HTTPException(status_code=400, detail="Comanda confirmată nu poate fi editată.")

    fields = ["title", "notes", "start_date", "deadline_date",
              "site_id", "site_address", "client_id", "client_name",
              "client_email", "client_phone", "requirements", "materials", "volumes"]
    for f in fields:
        v = getattr(payload, f, None)
        if v is not None:
            setattr(wo, f, v)

    # Dacă s-a schimbat client_id, actualizează datele
    if payload.client_id:
        cl = db.query(Client).filter(
            Client.id == payload.client_id,
            Client.organization_id == current_admin.organization_id
        ).first()
        if cl:
            wo.client_name = wo.client_name or cl.name
            wo.client_email = wo.client_email or cl.email
            wo.client_phone = wo.client_phone or cl.phone

    db.commit()
    db.refresh(wo)
    return _serialize(wo)


# ──────────────────────────────────────────────────────────────────────────────
# DELETE
# ──────────────────────────────────────────────────────────────────────────────
@router.delete("/work-orders/{wo_id}")
def delete_work_order(
    wo_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")
    if wo.status not in ("draft", "cancelled"):
        raise HTTPException(status_code=400, detail="Pot fi șterse doar comenzile în draft sau anulate.")
    db.delete(wo)
    db.commit()
    return {"ok": True}


# ──────────────────────────────────────────────────────────────────────────────
# SEND — schimbă status în "sent"
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/work-orders/{wo_id}/send")
def send_work_order(
    wo_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Marchează comanda ca trimisă. Returneaza link-ul public."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")
    if wo.status == "confirmed":
        raise HTTPException(status_code=400, detail="Comanda a fost deja confirmată.")
    
    wo.status = "sent"
    db.commit()
    db.refresh(wo)

    # Construiește link-ul public
    org = db.query(Organization).filter(Organization.id == wo.organization_id).first()
    if org and org.slug:
        base_url = f"https://{org.slug}.pontaj.app"
    else:
        base_url = "http://localhost:5678"
    
    confirm_url = f"{base_url}/confirm/{wo.token}"
    
    return {**_serialize(wo), "confirm_url": confirm_url}


# ──────────────────────────────────────────────────────────────────────────────
# STATUS CHANGE
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/work-orders/{wo_id}/status")
def change_status(
    wo_id: str,
    request: dict,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Schimbă manual statusul comenzii (in_progress, completed, cancelled)."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")
    
    allowed = ["draft", "sent", "in_progress", "completed", "cancelled"]
    new_status = request.get("status")
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail=f"Status invalid. Permise: {allowed}")
    
    wo.status = new_status
    db.commit()
    db.refresh(wo)
    return _serialize(wo)


# ──────────────────────────────────────────────────────────────────────────────
# GET PUBLIC LINK
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/work-orders/{wo_id}/link")
def get_public_link(
    wo_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Returnează link-ul public al comenzii."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")

    org = db.query(Organization).filter(Organization.id == wo.organization_id).first()
    if org and org.slug:
        base_url = f"https://{org.slug}.pontaj.app"
    else:
        base_url = "http://localhost:5678"

    return {"confirm_url": f"{base_url}/confirm/{wo.token}", "token": wo.token}

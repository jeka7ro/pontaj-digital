"""
public_work_orders.py — Endpoint-uri publice (fără autentificare) pentru confirmarea comenzilor de lucru.
Clientul accesează pagina cu tokenul unic, vede detaliile și confirmă.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import WorkOrder, Organization

router = APIRouter()


def _public_serialize(wo: WorkOrder, org: Organization) -> dict:
    """Serializează un WorkOrder pentru pagina publică a clientului."""
    site_name = None
    site_address = wo.site_address
    if wo.site:
        site_name = wo.site.name
        site_address = site_address or wo.site.address

    return {
        # Informații despre companie (pentru branding pe pagina publică)
        "org_name": org.name if org else "Smart Timesheet",
        "org_logo": org.logo_url if org else None,
        "org_primary_color": org.primary_color if org else "#3b82f6",
        # Comanda
        "id": wo.id,
        "title": wo.title,
        "notes": wo.notes,
        "start_date": str(wo.start_date) if wo.start_date else None,
        "deadline_date": str(wo.deadline_date) if wo.deadline_date else None,
        "site_name": site_name,
        "site_address": site_address,
        "client_name": wo.client_name,
        "client_email": wo.client_email,
        "client_phone": wo.client_phone,
        "requirements": wo.requirements or [],
        "materials": wo.materials or [],
        "volumes": wo.volumes or [],
        "status": wo.status,
        "confirmed_at": wo.confirmed_at.isoformat() if wo.confirmed_at else None,
        "confirmed_by_name": wo.confirmed_by_name,
    }


# ──────────────────────────────────────────────────────────────────────────────
# GET — Citire detalii comandă (fără autentificare)
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/public/work-orders/{token}")
def get_public_work_order(token: str, db: Session = Depends(get_db)):
    """
    Returnează datele publice ale comenzii de lucru pe baza tokenului unic.
    Utilizat de pagina de confirmare a clientului.
    """
    wo = db.query(WorkOrder).filter(WorkOrder.token == token).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită sau link-ul este invalid.")
    if wo.status == "draft":
        raise HTTPException(status_code=403, detail="Această comandă nu a fost încă trimisă.")

    org = db.query(Organization).filter(Organization.id == wo.organization_id).first()
    return _public_serialize(wo, org)


# ──────────────────────────────────────────────────────────────────────────────
# POST — Confirmare comandă de către client
# ──────────────────────────────────────────────────────────────────────────────
class ConfirmPayload(BaseModel):
    confirmed_by_name: Optional[str] = None

@router.post("/public/work-orders/{token}/confirm")
def confirm_work_order(
    token: str,
    payload: ConfirmPayload,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Clientul confirmă comanda de lucru.
    Se setează: confirmed_at, confirmed_by_name, confirmed_ip, status = confirmed.
    """
    wo = db.query(WorkOrder).filter(WorkOrder.token == token).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")
    if wo.status == "draft":
        raise HTTPException(status_code=403, detail="Această comandă nu a fost încă trimisă.")
    if wo.status == "confirmed":
        raise HTTPException(status_code=400, detail="Comanda a fost deja confirmată.")
    if wo.status == "cancelled":
        raise HTTPException(status_code=400, detail="Comanda a fost anulată și nu mai poate fi confirmată.")

    # Obține IP-ul clientului
    client_ip = request.client.host if request.client else None
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()

    wo.status = "confirmed"
    wo.confirmed_at = datetime.utcnow()
    wo.confirmed_by_name = payload.confirmed_by_name or wo.client_name
    wo.confirmed_ip = client_ip

    db.commit()
    db.refresh(wo)

    org = db.query(Organization).filter(Organization.id == wo.organization_id).first()
    return _public_serialize(wo, org)

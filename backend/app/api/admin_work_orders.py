"""
admin_work_orders.py — API pentru Comenzi de Lucru (Work Orders) B2B
Acces protejat — doar adminii autentificați ai organizației pot opera.
"""

import secrets
import os
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import WorkOrder, WorkOrderAcknowledgement, WorkOrderCheckin, WorkOrderPhoto, Organization, ConstructionSite, Client, Admin, TimesheetSegment, Timesheet, User, Team, Vehicle, WarehouseItem, WarehouseTransaction
from app.api.admin_auth import get_current_admin
from datetime import date as date_today_import

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
    # Alocare echipa si vehicul
    assigned_team_id: Optional[str] = None
    assigned_vehicle_id: Optional[str] = None
    min_photos_required: Optional[int] = 2
    # Note acces — cod intrare, etaj, apartament (vizibil echipei, nu clientului)
    access_notes: Optional[str] = None

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
        "start_time": wo.start_time,
        "deadline_date": str(wo.deadline_date) if wo.deadline_date else None,
        "site_id": wo.site_id,
        "site_name": site_name,
        "site_address": wo.site_address or (wo.site.address if wo.site else None),
        # GPS coordonate santier
        "site_latitude": float(wo.site.latitude) if wo.site and wo.site.latitude else None,
        "site_longitude": float(wo.site.longitude) if wo.site and wo.site.longitude else None,
        "geo_radius": float(wo.site.geo_radius) if wo.site and wo.site.geo_radius else None,
        "client_id": wo.client_id,
        "client_name": client_display,
        "client_email": wo.client_email,
        "client_phone": wo.client_phone,
        "requirements": wo.requirements or [],
        "materials": wo.materials or [],
        "materials_consumed": wo.materials_consumed or [],
        "volumes": wo.volumes or [],
        "status": wo.status,
        "confirmed_at": wo.confirmed_at.isoformat() if wo.confirmed_at else None,
        "confirmed_by_name": wo.confirmed_by_name,
        "client_signature": wo.client_signature,
        "pdf_path": wo.pdf_path,
        "created_at": wo.created_at.isoformat() if wo.created_at else None,
        "updated_at": wo.updated_at.isoformat() if wo.updated_at else None,
        # Echipa si vehicul
        "assigned_team_id": wo.assigned_team_id,
        "assigned_team_name": wo.assigned_team.name if wo.assigned_team else None,
        "assigned_team_color": wo.assigned_team.color if wo.assigned_team else None,
        "assigned_vehicle_id": wo.assigned_vehicle_id,
        "assigned_vehicle_name": wo.assigned_vehicle.name if wo.assigned_vehicle else None,
        "assigned_vehicle_plate": wo.assigned_vehicle.plate_number if wo.assigned_vehicle else None,
        # Workflow acceptare
        "team_leader_accepted_at": wo.team_leader_accepted_at.isoformat() if wo.team_leader_accepted_at else None,
        "team_leader_confirmed_at": wo.team_leader_confirmed_at.isoformat() if wo.team_leader_confirmed_at else None,
        "team_leader_confirmation_note": wo.team_leader_confirmation_note,
        # Poze obligatorii
        "min_photos_required": wo.min_photos_required,
        # GPS sosire/plecare
        "checkin_at": wo.checkin_at.isoformat() if wo.checkin_at else None,
        "checkout_at": wo.checkout_at.isoformat() if wo.checkout_at else None,
        # Note acces
        "access_notes": wo.access_notes,
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

    client_id = payload.client_id
    if client_id:
        cl = db.query(Client).filter(
            Client.id == client_id,
            Client.organization_id == current_admin.organization_id
        ).first()
        if cl:
            client_name = client_name or cl.name
            client_email = client_email or cl.email
            client_phone = client_phone or cl.phone
    elif client_name:
        # Create client automatically
        cl = db.query(Client).filter(
            Client.name == client_name,
            Client.organization_id == current_admin.organization_id
        ).first()
        if not cl:
            cl = Client(
                organization_id=current_admin.organization_id,
                name=client_name,
                email=client_email,
                phone=client_phone,
            )
            db.add(cl)
            db.commit()
            db.refresh(cl)
        client_id = cl.id

    wo = WorkOrder(
        organization_id=current_admin.organization_id,
        token=secrets.token_urlsafe(32),
        title=payload.title,
        notes=payload.notes,
        start_date=payload.start_date,
        deadline_date=payload.deadline_date,
        site_id=payload.site_id,
        site_address=payload.site_address,
        client_id=client_id,
        client_name=client_name,
        client_email=client_email,
        client_phone=client_phone,
        requirements=payload.requirements or [],
        materials=payload.materials or [],
        volumes=payload.volumes or [],
        assigned_team_id=payload.assigned_team_id,
        assigned_vehicle_id=payload.assigned_vehicle_id,
        min_photos_required=payload.min_photos_required or 2,
        access_notes=payload.access_notes,
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
    # Admins can edit orders regardless of status

    fields = [
        "title", "notes", "start_date", "deadline_date",
        "site_id", "site_address", "client_id", "client_name",
        "client_email", "client_phone", "requirements", "materials", "volumes",
        "assigned_team_id", "assigned_vehicle_id", "min_photos_required", "access_notes"
    ]
    for f in fields:
        v = getattr(payload, f, None)
        if v is not None:
            setattr(wo, f, v)

    # Dacă s-a schimbat client_id, actualizează datele
    if wo.client_id:
        cl = db.query(Client).filter(
            Client.id == wo.client_id,
            Client.organization_id == current_admin.organization_id
        ).first()
        if cl:
            wo.client_name = wo.client_name or cl.name
            wo.client_email = wo.client_email or cl.email
            wo.client_phone = wo.client_phone or cl.phone
    elif wo.client_name:
        # Create client automatically if missing
        cl = db.query(Client).filter(
            Client.name == wo.client_name,
            Client.organization_id == current_admin.organization_id
        ).first()
        if not cl:
            cl = Client(
                organization_id=current_admin.organization_id,
                name=wo.client_name,
                email=wo.client_email,
                phone=wo.client_phone,
            )
            db.add(cl)
            db.commit()
            db.refresh(cl)
        wo.client_id = cl.id

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
# PHOTOS — Upload poze instructiuni (admin) si vizualizare
# ──────────────────────────────────────────────────────────────────────────────

PHOTO_UPLOAD_DIR = "uploads/work_order_photos"
os.makedirs(PHOTO_UPLOAD_DIR, exist_ok=True)


@router.post("/work-orders/{wo_id}/photos")
async def upload_instruction_photo(
    wo_id: str,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Adminul uploadaza poze cu instructiuni la comanda (cod intrare, detalii acces).
    Aceste poze sunt INTERNE — vazute de echipa, NU merg la clientul final.
    """
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    allowed = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Doar imagini JPG, PNG sau WebP.")

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fisier prea mare. Maxim 20MB.")

    ext = os.path.splitext(file.filename or "photo.jpg")[1].lower() or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(PHOTO_UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(content)

    photo = WorkOrderPhoto(
        id=str(uuid.uuid4()),
        work_order_id=wo_id,
        uploaded_by_id=None,  # admin (nu user)
        photo_path=file_path,
        description=description,
        file_size=len(content),
        photo_type="instruction"
    )
    db.add(photo)
    db.commit()

    return {
        "photo_id": photo.id,
        "photo_url": f"/api/{file_path}",
        "photo_type": "instruction",
        "message": "Poza de instructiuni adaugata cu succes."
    }


@router.get("/work-orders/{wo_id}/photos")
def list_work_order_photos(
    wo_id: str,
    photo_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Lista pozelor unei comenzi. Adminul vede toate tipurile."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    q = db.query(WorkOrderPhoto).filter(WorkOrderPhoto.work_order_id == wo_id)
    if photo_type:
        q = q.filter(WorkOrderPhoto.photo_type == photo_type)
    photos = q.order_by(WorkOrderPhoto.uploaded_at.asc()).all()

    return [{
        "id": p.id,
        "url": f"/api/{p.photo_path}",
        "description": p.description,
        "photo_type": p.photo_type,
        "uploaded_at": p.uploaded_at.isoformat(),
        "uploaded_by_id": p.uploaded_by_id
    } for p in photos]


@router.delete("/work-orders/{wo_id}/photos/{photo_id}")
def delete_instruction_photo(
    wo_id: str,
    photo_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Sterge o poza de instructiuni (admin poate sterge orice tip)."""
    photo = db.query(WorkOrderPhoto).filter(
        WorkOrderPhoto.id == photo_id,
        WorkOrderPhoto.work_order_id == wo_id
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Poza nu a fost gasita.")
    # Sterge fisierul de pe disk
    try:
        if os.path.exists(photo.photo_path):
            os.remove(photo.photo_path)
    except Exception:
        pass
    db.delete(photo)
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


# ──────────────────────────────────────────────────────────────────────────────
# GET SESSIONS (Pontaj) — ore lucrate pe această comandă
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/work-orders/{wo_id}/sessions")
def get_work_order_sessions(
    wo_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Returnează sesiunile de pontaj legate de o comandă de lucru, cu totalul de ore."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")

    segments = db.query(TimesheetSegment).filter(
        TimesheetSegment.work_order_id == wo_id
    ).order_by(TimesheetSegment.check_in_time.desc()).all()

    total_hours = 0.0
    result = []
    for seg in segments:
        if seg.check_out_time:
            h = (seg.check_out_time - seg.check_in_time).total_seconds() / 3600
            # scade pauzele
            if seg.break_start_time and seg.break_end_time:
                h -= (seg.break_end_time - seg.break_start_time).total_seconds() / 3600
            h = max(0.0, h)
        else:
            h = 0.0  # sesiune activă, fără checkout

        ts = db.query(Timesheet).filter(Timesheet.id == seg.timesheet_id).first()
        user = db.query(User).filter(User.id == ts.owner_user_id).first() if ts else None

        total_hours += h
        result.append({
            "segment_id": seg.id,
            "user_name": user.full_name if user else "Necunoscut",
            "date": str(ts.date) if ts else None,
            "check_in": seg.check_in_time.isoformat() if seg.check_in_time else None,
            "check_out": seg.check_out_time.isoformat() if seg.check_out_time else None,
            "hours": round(h, 2),
            "active": seg.check_out_time is None,
        })

    return {
        "work_order_id": wo_id,
        "total_hours": round(total_hours, 2),
        "sessions_count": len(result),
        "sessions": result,
    }


# ──────────────────────────────────────────────────────────────────────────────
# PATCH MATERIALS CONSUMED
# ──────────────────────────────────────────────────────────────────────────────
class MaterialsConsumedPayload(BaseModel):
    materials_consumed: list  # [{name, quantity, unit, note}]

@router.patch("/work-orders/{wo_id}/materials-consumed")
def update_materials_consumed(
    wo_id: str,
    payload: MaterialsConsumedPayload,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Salvează lista de materiale consumate pe o comandă de lucru.
    Scade automat cantitățile din magazie și creează tranzacții OUT."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")

    # Curăță și validează intrările
    cleaned = [
        {
            "name": str(m.get("name", "")).strip(),
            "quantity": str(m.get("quantity", "")).strip(),
            "unit": str(m.get("unit", "")).strip(),
            "note": str(m.get("note", "")).strip(),
        }
        for m in payload.materials_consumed
        if str(m.get("name", "")).strip()
    ]

    # ── Scade din magazie + creează tranzacții OUT ──────────────────────────
    deducted_items = []
    for mat in cleaned:
        name = mat["name"]
        try:
            qty = float(mat["quantity"]) if mat["quantity"] else 0.0
        except (ValueError, TypeError):
            qty = 0.0
        
        if qty <= 0:
            continue

        # Cauta articolul in magazie dupa nume (case-insensitive)
        item = db.query(WarehouseItem).filter(
            WarehouseItem.organization_id == current_admin.organization_id,
            WarehouseItem.name.ilike(name)
        ).first()

        if item:
            # Scade stocul (nu sub 0)
            item.total_quantity = max(0.0, (item.total_quantity or 0.0) - qty)
            item.updated_at = datetime.utcnow()

            # Creează tranzacție OUT
            tx = WarehouseTransaction(
                id=str(uuid.uuid4()),
                item_id=item.id,
                transaction_type="OUT",
                quantity=qty,
                date=date_today_import.today(),
                operated_by_id=current_admin.id,
                site_id=wo.site_id if wo.site_id else None,
                notes=f"Consumat pe comanda: {wo.title} (#{wo_id[:8]})",
            )
            db.add(tx)
            deducted_items.append({"name": name, "qty": qty, "item_id": item.id})

    wo.materials_consumed = cleaned
    wo.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(wo)
    return {
        "materials_consumed": wo.materials_consumed or [],
        "deducted_from_stock": deducted_items
    }

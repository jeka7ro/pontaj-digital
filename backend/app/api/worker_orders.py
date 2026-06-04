"""
worker_orders.py — API pentru Comenzi de Lucru accesibil muncitorului si sefului de echipa.
Autentificare: token JWT de angajat (acelasi ca la clockin/pontaj).
"""

import os
import uuid
import math
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    WorkOrder, WorkOrderAcknowledgement, WorkOrderCheckin, WorkOrderPhoto,
    User, Team, TeamMember, Role
)
from app.api.auth import get_current_user

router = APIRouter(prefix="/worker/orders", tags=["worker-orders"])

UPLOAD_DIR = "uploads/work_order_photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _haversine_distance(lat1, lon1, lat2, lon2) -> float:
    """Distance in meters between two GPS coordinates."""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _get_user_team_ids(db: Session, user_id: str, org_id: str) -> List[str]:
    """Return list of team IDs the user belongs to (active memberships)."""
    memberships = db.query(TeamMember).filter(
        TeamMember.user_id == user_id,
        TeamMember.is_active == True
    ).all()
    return [m.team_id for m in memberships]


def _is_team_leader(user: User, db: Session) -> bool:
    """Check if user has TEAM_LEADER role code."""
    role = db.query(Role).filter(Role.id == user.role_id).first()
    return role and role.code in ("TEAM_LEADER", "SEF_ECHIPA")


def _serialize_order(wo: WorkOrder, user_id: str, db: Session) -> dict:
    """Serialize a WorkOrder for the worker/leader view."""
    # Count photos
    photo_count = db.query(WorkOrderPhoto).filter(WorkOrderPhoto.work_order_id == wo.id).count()
    # My acknowledgement
    my_ack = db.query(WorkOrderAcknowledgement).filter(
        WorkOrderAcknowledgement.work_order_id == wo.id,
        WorkOrderAcknowledgement.user_id == user_id
    ).first()
    # My checkin
    my_checkin = db.query(WorkOrderCheckin).filter(
        WorkOrderCheckin.work_order_id == wo.id,
        WorkOrderCheckin.user_id == user_id,
        WorkOrderCheckin.checkout_at == None
    ).first()

    return {
        "id": wo.id,
        "token": wo.token,
        "title": wo.title,
        "notes": wo.notes,
        "start_date": str(wo.start_date) if wo.start_date else None,
        "deadline_date": str(wo.deadline_date) if wo.deadline_date else None,
        "site_address": wo.site_address or (wo.site.address if wo.site else None),
        "site_lat": wo.site.latitude if wo.site else None,
        "site_lng": wo.site.longitude if wo.site else None,
        "client_name": wo.client_name,
        "client_phone": wo.client_phone,
        "requirements": wo.requirements or [],
        "materials": wo.materials or [],
        "materials_consumed": wo.materials_consumed or [],
        "volumes": wo.volumes or [],
        "status": wo.status,
        "assigned_team_id": wo.assigned_team_id,
        "assigned_team_name": wo.assigned_team.name if wo.assigned_team else None,
        "assigned_vehicle_name": wo.assigned_vehicle.name if wo.assigned_vehicle else None,
        "assigned_vehicle_plate": wo.assigned_vehicle.plate_number if wo.assigned_vehicle else None,
        "min_photos_required": wo.min_photos_required,
        "photo_count": photo_count,
        "team_leader_accepted_at": wo.team_leader_accepted_at.isoformat() if wo.team_leader_accepted_at else None,
        "team_leader_confirmed_at": wo.team_leader_confirmed_at.isoformat() if wo.team_leader_confirmed_at else None,
        "team_leader_confirmation_note": wo.team_leader_confirmation_note,
        "checkin_at": wo.checkin_at.isoformat() if wo.checkin_at else None,
        "checkout_at": wo.checkout_at.isoformat() if wo.checkout_at else None,
        # Current user state
        "my_acknowledged": my_ack is not None,
        "my_acknowledged_at": my_ack.acknowledged_at.isoformat() if my_ack else None,
        "my_checkin_id": my_checkin.id if my_checkin else None,
        "my_checkin_at": my_checkin.checkin_at.isoformat() if my_checkin else None,
        "confirmed_at": wo.confirmed_at.isoformat() if wo.confirmed_at else None,
    }


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("")
def get_my_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returneaza comenzile alocate echipei mele.
    Seful de echipa vede toate comenzile organizatiei (planning complet).
    """
    is_leader = _is_team_leader(current_user, db)

    if is_leader:
        # Seful de echipa vede tot planning-ul organizatiei
        orders = db.query(WorkOrder).filter(
            WorkOrder.organization_id == current_user.organization_id,
            WorkOrder.status.notin_(["cancelled"])
        ).order_by(WorkOrder.start_date.asc()).all()
    else:
        # Muncitorul vede doar comenzile echipei lui
        team_ids = _get_user_team_ids(db, current_user.id, current_user.organization_id)
        if not team_ids:
            return []
        orders = db.query(WorkOrder).filter(
            WorkOrder.organization_id == current_user.organization_id,
            WorkOrder.assigned_team_id.in_(team_ids),
            WorkOrder.status.notin_(["cancelled"])
        ).order_by(WorkOrder.start_date.asc()).all()

    return [_serialize_order(wo, current_user.id, db) for wo in orders]


@router.get("/{order_id}")
def get_order_detail(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detaliul unei comenzi."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")
    return _serialize_order(wo, current_user.id, db)


@router.post("/{order_id}/acknowledge")
def acknowledge_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Muncitorul / Seful de echipa confirma ca a luat la cunostinta comanda.
    Seful de echipa marcheaza si acceptarea oficiala a comenzii.
    """
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    # Check duplicate
    existing = db.query(WorkOrderAcknowledgement).filter(
        WorkOrderAcknowledgement.work_order_id == order_id,
        WorkOrderAcknowledgement.user_id == current_user.id
    ).first()
    if existing:
        return {"message": "Deja confirmat.", "acknowledged_at": existing.acknowledged_at.isoformat()}

    is_leader = _is_team_leader(current_user, db)
    role_label = "team_leader" if is_leader else "worker"

    ack = WorkOrderAcknowledgement(
        id=str(uuid.uuid4()),
        work_order_id=order_id,
        user_id=current_user.id,
        role=role_label,
        acknowledged_at=datetime.utcnow()
    )
    db.add(ack)

    # Daca e seful de echipa, marcheaza acceptarea oficiala pe comanda
    if is_leader and not wo.team_leader_accepted_at:
        wo.team_leader_accepted_at = datetime.utcnow()
        wo.team_leader_accepted_by_id = current_user.id
        if wo.status == "draft":
            wo.status = "sent"

    db.commit()

    # Notificare Telegram (async, non-blocking)
    try:
        from app.services.telegram_notifier import notify_order_acknowledged
        notify_order_acknowledged(wo, current_user, role_label)
    except Exception:
        pass

    return {"message": "Confirmat cu succes.", "role": role_label}


class CheckinPayload(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None


@router.post("/{order_id}/checkin")
def checkin_order(
    order_id: str,
    payload: CheckinPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check-in GPS la locatia comenzii. Verifica distanta fata de adresa comenzii."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    # Check if already checked in (open checkin)
    open_checkin = db.query(WorkOrderCheckin).filter(
        WorkOrderCheckin.work_order_id == order_id,
        WorkOrderCheckin.user_id == current_user.id,
        WorkOrderCheckin.checkout_at == None
    ).first()
    if open_checkin:
        raise HTTPException(status_code=400, detail="Esti deja facut check-in la aceasta comanda.")

    # Verifica GPS match daca comanda are coordonate
    gps_match = None
    site_lat = wo.site.latitude if wo.site else None
    site_lng = wo.site.longitude if wo.site else None
    if site_lat and site_lng:
        distance = _haversine_distance(payload.latitude, payload.longitude, site_lat, site_lng)
        gps_match = distance <= 500  # 500m tolerance

    now = datetime.utcnow()
    checkin = WorkOrderCheckin(
        id=str(uuid.uuid4()),
        work_order_id=order_id,
        user_id=current_user.id,
        checkin_at=now,
        checkin_lat=payload.latitude,
        checkin_lng=payload.longitude,
        checkin_address=payload.address,
        gps_match=gps_match
    )
    db.add(checkin)

    # Prima sosire — actualizeaza snapshot-ul pe comanda
    if not wo.checkin_at:
        wo.checkin_at = now
        wo.checkin_lat = payload.latitude
        wo.checkin_lng = payload.longitude
        if wo.status in ("draft", "sent", "confirmed"):
            wo.status = "in_progress"

    db.commit()
    db.refresh(checkin)

    # Notificare Telegram
    try:
        from app.services.telegram_notifier import notify_checkin
        notify_checkin(wo, current_user, payload.latitude, payload.longitude, gps_match)
    except Exception:
        pass

    return {
        "checkin_id": checkin.id,
        "checkin_at": checkin.checkin_at.isoformat(),
        "gps_match": gps_match,
        "message": "Check-in inregistrat cu succes."
    }


@router.post("/{order_id}/checkout")
def checkout_order(
    order_id: str,
    payload: CheckinPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check-out GPS. Calculeaza minutele lucrate."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    open_checkin = db.query(WorkOrderCheckin).filter(
        WorkOrderCheckin.work_order_id == order_id,
        WorkOrderCheckin.user_id == current_user.id,
        WorkOrderCheckin.checkout_at == None
    ).first()
    if not open_checkin:
        raise HTTPException(status_code=400, detail="Nu esti facut check-in la aceasta comanda.")

    now = datetime.utcnow()
    delta = now - open_checkin.checkin_at
    worked_minutes = int(delta.total_seconds() / 60)

    open_checkin.checkout_at = now
    open_checkin.checkout_lat = payload.latitude
    open_checkin.checkout_lng = payload.longitude
    open_checkin.worked_minutes = worked_minutes

    # Actualizeaza snapshot-ul pe comanda
    wo.checkout_at = now
    wo.checkout_lat = payload.latitude
    wo.checkout_lng = payload.longitude

    db.commit()

    # Notificare Telegram
    try:
        from app.services.telegram_notifier import notify_checkout
        notify_checkout(wo, current_user, worked_minutes)
    except Exception:
        pass

    return {
        "checkout_at": now.isoformat(),
        "worked_minutes": worked_minutes,
        "message": "Check-out inregistrat. Ai lucrat {} ore {} minute.".format(
            worked_minutes // 60, worked_minutes % 60
        )
    }


@router.post("/{order_id}/photos")
async def upload_photo(
    order_id: str,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    photo_type: Optional[str] = Form("completion"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload foto la comanda.
    - Muncitor: photo_type='completion' (obligatorii, merg la client)
    - Sef echipa: photo_type='internal' (consum materiale, nu merg la client)
    """
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    if wo.status == "completed":
        raise HTTPException(status_code=400, detail="Comanda este deja finalizata.")

    # Seful de echipa poate adauga doar poze 'internal'
    is_leader = _is_team_leader(current_user, db)
    if is_leader and photo_type not in ("internal", "completion"):
        photo_type = "internal"
    if not is_leader:
        photo_type = "completion"

    # Valideaza tipul fisierului
    allowed = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Doar imagini JPG, PNG sau WebP.")

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Poza prea mare. Maxim 20MB.")

    ext = os.path.splitext(file.filename or "photo.jpg")[1].lower() or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as f:
        f.write(content)

    photo = WorkOrderPhoto(
        id=str(uuid.uuid4()),
        work_order_id=order_id,
        uploaded_by_id=current_user.id,
        photo_path=file_path,
        description=description,
        file_size=len(content),
        photo_type=photo_type
    )
    db.add(photo)
    db.commit()

    # Count only completion photos for min_required check
    completion_count = db.query(WorkOrderPhoto).filter(
        WorkOrderPhoto.work_order_id == order_id,
        WorkOrderPhoto.photo_type == "completion"
    ).count()

    return {
        "photo_id": photo.id,
        "photo_url": f"/api/{file_path}",
        "photo_type": photo_type,
        "completion_count": completion_count,
        "min_required": wo.min_photos_required,
        "can_close": completion_count >= wo.min_photos_required
    }


@router.get("/{order_id}/photos")
def get_photos(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista pozelor uploadate la o comanda."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    photos = db.query(WorkOrderPhoto).filter(WorkOrderPhoto.work_order_id == order_id).all()
    return [{
        "id": p.id,
        "url": f"/uploads/work_order_photos/{os.path.basename(p.photo_path)}" if p.photo_path else None,
        "description": p.description,
        "photo_type": p.photo_type or "completion",
        "uploaded_at": p.uploaded_at.isoformat(),
        "uploaded_by_id": p.uploaded_by_id
    } for p in photos]


class CloseOrderPayload(BaseModel):
    materials_consumed: Optional[list] = []
    volumes: Optional[list] = []
    notes: Optional[str] = None


@router.post("/{order_id}/close")
def close_order(
    order_id: str,
    payload: CloseOrderPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Muncitorul inchide comanda cu cantitatile reale.
    Necesita minim min_photos_required poze uploadate.
    """
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    if wo.status == "completed":
        raise HTTPException(status_code=400, detail="Comanda este deja finalizata.")

    # Verifica numarul minim de poze de tip 'completion' (nu cele interne)
    completion_count = db.query(WorkOrderPhoto).filter(
        WorkOrderPhoto.work_order_id == order_id,
        WorkOrderPhoto.photo_type == "completion"
    ).count()
    if completion_count < wo.min_photos_required:
        raise HTTPException(
            status_code=400,
            detail=f"Trebuie sa uploadezi minim {wo.min_photos_required} poze de finalizare inainte de inchidere. Ai {completion_count}."
        )

    wo.materials_consumed = payload.materials_consumed or wo.materials_consumed
    if payload.volumes:
        wo.volumes = payload.volumes
    if payload.notes:
        wo.notes = (wo.notes or "") + f"\n[Muncitor la finalizare]: {payload.notes}"
    wo.status = "completed"
    wo.updated_at = datetime.utcnow()

    db.commit()

    # Notificare Telegram
    try:
        from app.services.telegram_notifier import notify_order_closed
        notify_order_closed(wo, current_user)
    except Exception:
        pass

    return {"message": "Comanda finalizata cu succes. Adminul va trimite link-ul clientului pentru semnatura."}


class LeaderConfirmPayload(BaseModel):
    note: Optional[str] = None


@router.post("/{order_id}/leader-confirm")
def leader_confirm(
    order_id: str,
    payload: LeaderConfirmPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Seful de echipa confirma (optional) ca datele muncitorului sunt corecte."""
    if not _is_team_leader(current_user, db):
        raise HTTPException(status_code=403, detail="Doar seful de echipa poate confirma.")

    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    wo.team_leader_confirmed_at = datetime.utcnow()
    wo.team_leader_confirmed_by_id = current_user.id
    wo.team_leader_confirmation_note = payload.note
    db.commit()

    return {"message": "Confirmare inregistrata.", "confirmed_at": wo.team_leader_confirmed_at.isoformat()}


@router.get("/{order_id}/checkins")
def get_checkins(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Istoricul check-in/out pentru o comanda (vizibil sefului de echipa si adminului)."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    checkins = db.query(WorkOrderCheckin).filter(WorkOrderCheckin.work_order_id == order_id).all()
    result = []
    for c in checkins:
        user = db.query(User).filter(User.id == c.user_id).first()
        result.append({
            "id": c.id,
            "user_id": c.user_id,
            "user_name": user.full_name if user else "Necunoscut",
            "checkin_at": c.checkin_at.isoformat(),
            "checkin_lat": c.checkin_lat,
            "checkin_lng": c.checkin_lng,
            "checkin_address": c.checkin_address,
            "gps_match": c.gps_match,
            "checkout_at": c.checkout_at.isoformat() if c.checkout_at else None,
            "worked_minutes": c.worked_minutes,
        })
    return result

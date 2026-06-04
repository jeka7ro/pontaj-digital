"""
Modul Concedii & Absențe — admin_leaves.py
Gestionare cereri de concediu: creare, aprobare, respingere, calendar, statistici.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, extract, func
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime, date

from app.database import get_db
from app.models import LeaveRequest, LeaveBalance, User, Admin, Organization
from app.api.admin_auth import get_current_admin

router = APIRouter(prefix="/admin/leaves", tags=["Admin - Concedii"])


# ─── Permission helper ────────────────────────────────────────────────────────
def check_hr_permission(admin: Admin):
    allowed = ["ADMIN", "SUPER_ADMIN", "TESA", "FINANCIAR", "SUPERVIZOR"]
    if admin.is_super_admin:
        return
    if admin.role.upper() not in allowed:
        raise HTTPException(status_code=403, detail="Nu aveți permisiunea de a gestiona concediile.")


# ─── Schemas ─────────────────────────────────────────────────────────────────
class LeaveRequestCreate(BaseModel):
    user_id: str
    leave_type: str          # CO, CM, CFS, CNP, ABSENCE, OTHER
    start_date: str          # YYYY-MM-DD
    end_date: str
    notes: Optional[str] = None
    work_days: Optional[int] = None  # dacă None, calculăm backend


class LeaveRequestUpdate(BaseModel):
    status: str              # pending | approved | rejected
    admin_notes: Optional[str] = None


class LeaveBalanceUpdate(BaseModel):
    user_id: str
    year: int
    total_co_days: int       # zile CO alocate
    used_co_days: Optional[int] = None   # override manual


# ─── Serializers ─────────────────────────────────────────────────────────────
def leave_to_dict(lr: LeaveRequest) -> dict:
    return {
        "id": lr.id,
        "user_id": lr.user_id,
        "user_name": lr.user.full_name if lr.user else "N/A",
        "user_code": lr.user.employee_code if lr.user else None,
        "leave_type": lr.leave_type,
        "leave_type_label": LEAVE_TYPE_LABELS.get(lr.leave_type, lr.leave_type),
        "start_date": str(lr.start_date) if lr.start_date else None,
        "end_date": str(lr.end_date) if lr.end_date else None,
        "work_days": lr.work_days,
        "status": lr.status,
        "notes": lr.notes,
        "admin_notes": lr.admin_notes,
        "approved_by_id": lr.approved_by_id,
        "approved_by_name": lr.approved_by.full_name if lr.approved_by else None,
        "approved_at": str(lr.approved_at) if lr.approved_at else None,
        "created_at": str(lr.created_at),
        "updated_at": str(lr.updated_at),
    }


def balance_to_dict(b: LeaveBalance) -> dict:
    return {
        "id": b.id,
        "user_id": b.user_id,
        "user_name": b.user.full_name if b.user else "N/A",
        "user_code": b.user.employee_code if b.user else None,
        "year": b.year,
        "total_co_days": b.total_co_days,
        "used_co_days": b.used_co_days,
        "remaining_co_days": b.total_co_days - b.used_co_days,
        "updated_at": str(b.updated_at),
    }


LEAVE_TYPE_LABELS = {
    "CO": "Concediu Odihnă",
    "CM": "Concediu Medical",
    "CFS": "Concediu Fără Salariu",
    "CNP": "Concediu Naștere / Paternitate",
    "ABSENCE": "Absență nemotivată",
    "OTHER": "Altele",
}


def _calc_work_days(start: date, end: date) -> int:
    """Calculează zilele lucrătoare (L-V) între două date, inclusiv."""
    if end < start:
        return 0
    current = start
    days = 0
    while current <= end:
        if current.weekday() < 5:  # 0=Mon, 4=Fri
            days += 1
        from datetime import timedelta
        current += timedelta(days=1)
    return days


# ─── ENDPOINTS ────────────────────────────────────────────────────────────────

@router.get("/")
def list_leaves(
    status: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    leave_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    check_hr_permission(current_admin)
    q = db.query(LeaveRequest).filter(
        LeaveRequest.organization_id == current_admin.organization_id
    )
    if status and status != "all":
        q = q.filter(LeaveRequest.status == status)
    if user_id:
        q = q.filter(LeaveRequest.user_id == user_id)
    if leave_type and leave_type != "all":
        q = q.filter(LeaveRequest.leave_type == leave_type)
    if year:
        q = q.filter(extract("year", LeaveRequest.start_date) == year)
    if month:
        q = q.filter(extract("month", LeaveRequest.start_date) == month)

    leaves = q.order_by(LeaveRequest.created_at.desc()).all()
    return [leave_to_dict(lr) for lr in leaves]


@router.get("/pending-count")
def pending_count(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Badge sidebar — cereri în așteptare."""
    try:
        check_hr_permission(current_admin)
    except HTTPException:
        return {"count": 0}
    count = db.query(LeaveRequest).filter(
        LeaveRequest.organization_id == current_admin.organization_id,
        LeaveRequest.status == "pending",
    ).count()
    return {"count": count}


@router.get("/calendar")
def calendar_view(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Returnează concediile aprobate pentru luna/an dată — pentru calendar vizual."""
    check_hr_permission(current_admin)
    from datetime import date as date_cls
    first_day = date_cls(year, month, 1)
    import calendar as cal_mod
    last_day = date_cls(year, month, cal_mod.monthrange(year, month)[1])

    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.organization_id == current_admin.organization_id,
        LeaveRequest.status == "approved",
        LeaveRequest.start_date <= last_day,
        LeaveRequest.end_date >= first_day,
    ).all()
    return [leave_to_dict(lr) for lr in leaves]


@router.get("/stats")
def leave_stats(
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    check_hr_permission(current_admin)
    y = year or datetime.utcnow().year
    q = db.query(LeaveRequest).filter(
        LeaveRequest.organization_id == current_admin.organization_id,
        extract("year", LeaveRequest.start_date) == y,
    )
    total = q.count()
    approved = q.filter(LeaveRequest.status == "approved").count()
    pending = q.filter(LeaveRequest.status == "pending").count()
    rejected = q.filter(LeaveRequest.status == "rejected").count()

    # Zile CO consumate din balante
    balances = db.query(LeaveBalance).filter(
        LeaveBalance.organization_id == current_admin.organization_id,
        LeaveBalance.year == y,
    ).all()
    total_co_allocated = sum(b.total_co_days for b in balances)
    total_co_used = sum(b.used_co_days for b in balances)

    # Breakdown pe tip
    type_counts = {}
    for lr in q.all():
        t = lr.leave_type
        if t not in type_counts:
            type_counts[t] = {"count": 0, "days": 0}
        type_counts[t]["count"] += 1
        type_counts[t]["days"] += lr.work_days or 0

    return {
        "year": y,
        "total": total,
        "approved": approved,
        "pending": pending,
        "rejected": rejected,
        "total_co_allocated": total_co_allocated,
        "total_co_used": total_co_used,
        "by_type": type_counts,
    }


@router.post("/", status_code=201)
def create_leave(
    body: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    check_hr_permission(current_admin)

    # Validare utilizator din aceeași organizație
    user = db.query(User).filter(
        User.id == body.user_id,
        User.organization_id == current_admin.organization_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Angajatul nu a fost găsit.")

    start = date.fromisoformat(body.start_date)
    end = date.fromisoformat(body.end_date)
    if end < start:
        raise HTTPException(status_code=400, detail="Data de sfârşit nu poate fi înainte de data de start.")

    work_days = body.work_days if body.work_days is not None else _calc_work_days(start, end)

    # Verifică overlap cu cereri existente aprobate/pending
    overlap = db.query(LeaveRequest).filter(
        LeaveRequest.user_id == body.user_id,
        LeaveRequest.status.in_(["pending", "approved"]),
        LeaveRequest.start_date <= end,
        LeaveRequest.end_date >= start,
    ).first()
    if overlap:
        raise HTTPException(
            status_code=409,
            detail=f"Există deja o cerere de concediu care se suprapune ({overlap.start_date} – {overlap.end_date})."
        )

    lr = LeaveRequest(
        organization_id=current_admin.organization_id,
        user_id=body.user_id,
        leave_type=body.leave_type,
        start_date=start,
        end_date=end,
        work_days=work_days,
        notes=body.notes,
        status="approved",  # Admin creează direct aprobat
        approved_by_id=current_admin.id,
        approved_at=datetime.utcnow(),
    )
    db.add(lr)

    # Actualizează balanța dacă e CO
    if body.leave_type == "CO":
        _update_balance_on_approve(db, body.user_id, current_admin.organization_id, start.year, work_days)

    db.commit()
    db.refresh(lr)
    return leave_to_dict(lr)


@router.put("/{leave_id}")
def update_leave_status(
    leave_id: str,
    body: LeaveRequestUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    check_hr_permission(current_admin)
    valid = ["pending", "approved", "rejected"]
    if body.status not in valid:
        raise HTTPException(status_code=400, detail=f"Status invalid. Valori: {valid}")

    lr = db.query(LeaveRequest).filter(
        LeaveRequest.id == leave_id,
        LeaveRequest.organization_id == current_admin.organization_id,
    ).first()
    if not lr:
        raise HTTPException(status_code=404, detail="Cererea nu a fost găsită.")

    old_status = lr.status
    lr.status = body.status
    lr.admin_notes = body.admin_notes
    lr.updated_at = datetime.utcnow()

    if body.status == "approved" and old_status != "approved":
        lr.approved_by_id = current_admin.id
        lr.approved_at = datetime.utcnow()
        if lr.leave_type == "CO":
            _update_balance_on_approve(db, lr.user_id, current_admin.organization_id, lr.start_date.year, lr.work_days or 0)

    elif body.status != "approved" and old_status == "approved":
        # Revoke — restituie zilele
        if lr.leave_type == "CO":
            _update_balance_on_approve(db, lr.user_id, current_admin.organization_id, lr.start_date.year, -(lr.work_days or 0))

    db.commit()
    db.refresh(lr)
    return leave_to_dict(lr)


@router.delete("/{leave_id}")
def delete_leave(
    leave_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    check_hr_permission(current_admin)
    lr = db.query(LeaveRequest).filter(
        LeaveRequest.id == leave_id,
        LeaveRequest.organization_id == current_admin.organization_id,
    ).first()
    if not lr:
        raise HTTPException(status_code=404, detail="Cererea nu a fost găsită.")

    # Restituie zile dacă era aprobată
    if lr.status == "approved" and lr.leave_type == "CO":
        _update_balance_on_approve(db, lr.user_id, current_admin.organization_id, lr.start_date.year, -(lr.work_days or 0))

    db.delete(lr)
    db.commit()
    return {"ok": True}


# ─── BALANCE ENDPOINTS ────────────────────────────────────────────────────────

@router.get("/balances")
def list_balances(
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    check_hr_permission(current_admin)
    y = year or datetime.utcnow().year
    balances = db.query(LeaveBalance).filter(
        LeaveBalance.organization_id == current_admin.organization_id,
        LeaveBalance.year == y,
    ).all()
    return [balance_to_dict(b) for b in balances]


@router.put("/balances/upsert")
def upsert_balance(
    body: LeaveBalanceUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    check_hr_permission(current_admin)
    user = db.query(User).filter(
        User.id == body.user_id,
        User.organization_id == current_admin.organization_id,
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Angajatul nu a fost găsit.")

    b = db.query(LeaveBalance).filter(
        LeaveBalance.user_id == body.user_id,
        LeaveBalance.year == body.year,
    ).first()

    if b:
        b.total_co_days = body.total_co_days
        if body.used_co_days is not None:
            b.used_co_days = body.used_co_days
        b.updated_at = datetime.utcnow()
    else:
        b = LeaveBalance(
            organization_id=current_admin.organization_id,
            user_id=body.user_id,
            year=body.year,
            total_co_days=body.total_co_days,
            used_co_days=body.used_co_days or 0,
        )
        db.add(b)

    db.commit()
    db.refresh(b)
    return balance_to_dict(b)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _update_balance_on_approve(db: Session, user_id: str, org_id: str, year: int, days_delta: int):
    """Adaugă/scade zile CO consumate din balanță. Creează balanța dacă nu există."""
    b = db.query(LeaveBalance).filter(
        LeaveBalance.user_id == user_id,
        LeaveBalance.year == year,
    ).first()
    if not b:
        b = LeaveBalance(
            organization_id=org_id,
            user_id=user_id,
            year=year,
            total_co_days=21,  # default legal RO
            used_co_days=0,
        )
        db.add(b)
        db.flush()
    b.used_co_days = max(0, (b.used_co_days or 0) + days_delta)
    b.updated_at = datetime.utcnow()

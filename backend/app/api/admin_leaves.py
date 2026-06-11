from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, date
import uuid

from app.database import get_db
from app.models import LeaveRequest, User, Admin, Role, TeamMember, Team
from app.api.admin_auth import get_current_admin

router = APIRouter(prefix="/admin/leaves", tags=["admin-leaves"])

# =================== PYDANTIC SCHEMAS ===================

class LeaveCreate(BaseModel):
    user_id: str
    leave_type: str = Field(..., description="medical, odihna, fara_plata, altul")
    start_date: date
    end_date: date
    notes: Optional[str] = None
    status: str = "approved"
    approved_by_id: Optional[str] = None
    approved_by_name: Optional[str] = None

class LeaveUpdate(BaseModel):
    leave_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    approved_by_id: Optional[str] = None
    approved_by_name: Optional[str] = None

class LeaveResponse(BaseModel):
    id: str
    user_id: str
    full_name: str
    employee_code: str
    leave_type: str
    start_date: date
    end_date: date
    status: str
    notes: Optional[str]
    approved_by_id: Optional[str] = None
    approved_by_name: Optional[str] = None
    avatar_path: Optional[str]
    role_name: Optional[str] = None
    team_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# =================== ENDPOINTS ===================

@router.get("/admins")
def get_leave_admins(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Obține lista de admini pentru aprobare concedii (exclusiv super admini)"""
    admins = db.query(Admin).filter(
        Admin.organization_id == current_admin.organization_id,
        Admin.is_super_admin == False,
        Admin.is_active == True
    ).all()
    
    return [{"id": a.id, "full_name": a.full_name} for a in admins]

@router.get("", response_model=List[LeaveResponse])
def get_all_leaves(
    user_id: Optional[str] = None,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Obține lista tuturor concediilor. Opțional filtrat după user_id."""
    query = db.query(LeaveRequest).filter(
        LeaveRequest.organization_id == current_admin.organization_id
    )

    if user_id:
        query = query.filter(LeaveRequest.user_id == user_id)

    leaves = query.order_by(LeaveRequest.start_date.desc()).all()
    
    result = []
    for leave in leaves:
        user = db.query(User).filter(User.id == leave.user_id).first()
        if user:
            role = db.query(Role).filter(Role.id == user.role_id).first()
            role_name = role.name if role else "Necunoscut"
            
            team_member = db.query(TeamMember).filter(TeamMember.user_id == user.id).first()
            team_name = "Fără echipă"
            if team_member:
                team = db.query(Team).filter(Team.id == team_member.team_id).first()
                if team:
                    team_name = team.name

            result.append({
                "id": leave.id,
                "user_id": leave.user_id,
                "full_name": user.full_name,
                "employee_code": user.employee_code,
                "leave_type": leave.leave_type,
                "start_date": leave.start_date,
                "end_date": leave.end_date,
                "status": leave.status,
                "notes": leave.notes,
                "approved_by_id": leave.approved_by_id,
                "approved_by_name": leave.approved_by_name,
                "avatar_path": getattr(user, 'avatar_path', None),
                "role_name": role_name,
                "team_name": team_name,
                "created_at": leave.created_at
            })
            
    return result

@router.post("", response_model=LeaveResponse, status_code=status.HTTP_201_CREATED)
def create_leave(
    payload: LeaveCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Adaugă un concediu nou pentru un angajat"""
    
    # Verifica daca angajatul exista si apartine de aceeasi organizatie
    user = db.query(User).filter(
        User.id == payload.user_id,
        User.organization_id == current_admin.organization_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Angajatul nu a fost găsit")

    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="Data de final trebuie să fie după data de început")

    # Verifica daca mai exista un concediu activ in acea perioada
    overlap = db.query(LeaveRequest).filter(
        LeaveRequest.user_id == payload.user_id,
        LeaveRequest.start_date <= payload.end_date,
        LeaveRequest.end_date >= payload.start_date
    ).first()

    if overlap:
        raise HTTPException(status_code=400, detail="Angajatul are deja un concediu înregistrat în acest interval.")

    leave = LeaveRequest(
        id=str(uuid.uuid4()),
        organization_id=current_admin.organization_id,
        user_id=payload.user_id,
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status=payload.status,
        notes=payload.notes,
        approved_by_id=payload.approved_by_id,
        approved_by_name=payload.approved_by_name
    )
    
    db.add(leave)
    db.commit()
    db.refresh(leave)
    
    role = db.query(Role).filter(Role.id == user.role_id).first()
    role_name = role.name if role else "Necunoscut"
    
    team_member = db.query(TeamMember).filter(TeamMember.user_id == user.id).first()
    team_name = "Fără echipă"
    if team_member:
        team = db.query(Team).filter(Team.id == team_member.team_id).first()
        if team:
            team_name = team.name

    return {
        "id": leave.id,
        "user_id": leave.user_id,
        "full_name": user.full_name,
        "employee_code": user.employee_code,
        "leave_type": leave.leave_type,
        "start_date": leave.start_date,
        "end_date": leave.end_date,
        "status": leave.status,
        "notes": leave.notes,
        "approved_by_id": leave.approved_by_id,
        "approved_by_name": leave.approved_by_name,
        "avatar_path": user.avatar_path if hasattr(user, 'avatar_path') else None,
        "role_name": role_name,
        "team_name": team_name,
        "created_at": leave.created_at
    }

@router.put("/{leave_id}", response_model=LeaveResponse)
def update_leave(
    leave_id: str,
    payload: LeaveUpdate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Editează un concediu"""
    leave = db.query(LeaveRequest).filter(
        LeaveRequest.id == leave_id,
        LeaveRequest.organization_id == current_admin.organization_id
    ).first()
    
    if not leave:
        raise HTTPException(status_code=404, detail="Concediul nu a fost găsit")

    if payload.leave_type is not None:
        leave.leave_type = payload.leave_type
    if payload.start_date is not None:
        leave.start_date = payload.start_date
    if payload.end_date is not None:
        leave.end_date = payload.end_date
    if payload.status is not None:
        leave.status = payload.status
    if payload.notes is not None:
        leave.notes = payload.notes
    if payload.approved_by_id is not None:
        leave.approved_by_id = payload.approved_by_id
    if payload.approved_by_name is not None:
        leave.approved_by_name = payload.approved_by_name
        
    if leave.end_date < leave.start_date:
        raise HTTPException(status_code=400, detail="Data de final trebuie să fie după data de început")

    db.commit()
    db.refresh(leave)
    
    user = db.query(User).filter(User.id == leave.user_id).first()
    
    role = db.query(Role).filter(Role.id == user.role_id).first()
    role_name = role.name if role else "Necunoscut"
    
    team_member = db.query(TeamMember).filter(TeamMember.user_id == user.id).first()
    team_name = "Fără echipă"
    if team_member:
        team = db.query(Team).filter(Team.id == team_member.team_id).first()
        if team:
            team_name = team.name
    
    return {
        "id": leave.id,
        "user_id": leave.user_id,
        "full_name": user.full_name,
        "employee_code": user.employee_code,
        "leave_type": leave.leave_type,
        "start_date": leave.start_date,
        "end_date": leave.end_date,
        "status": leave.status,
        "notes": leave.notes,
        "avatar_path": user.avatar_path if hasattr(user, 'avatar_path') else None,
        "role_name": role_name,
        "team_name": team_name,
        "created_at": leave.created_at
    }

@router.delete("/{leave_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_leave(
    leave_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Șterge un concediu"""
    leave = db.query(LeaveRequest).filter(
        LeaveRequest.id == leave_id,
        LeaveRequest.organization_id == current_admin.organization_id
    ).first()
    
    if not leave:
        raise HTTPException(status_code=404, detail="Concediul nu a fost găsit")

    db.delete(leave)
    db.commit()
    
    return None

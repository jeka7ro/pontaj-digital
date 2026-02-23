"""
Admin API endpoints for roles management
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import Role, Admin
from app.api.admin_auth import get_current_admin

router = APIRouter(prefix="/admin/roles", tags=["admin-roles"])


class RoleResponse(BaseModel):
    id: str
    code: str
    name: str
    is_employee: bool
    is_active: bool

    class Config:
        from_attributes = True


@router.get("/", response_model=List[RoleResponse])
def get_roles(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Get all active roles"""
    roles = db.query(Role).filter(Role.is_active == True).all()
    return [RoleResponse(
        id=r.id,
        code=r.code,
        name=r.name,
        is_employee=r.is_employee,
        is_active=r.is_active
    ) for r in roles]

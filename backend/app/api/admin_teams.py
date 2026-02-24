"""
Admin API endpoints for team management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field

from app.database import get_db
from app.models import Team, TeamMember, User, ConstructionSite, Role, Admin
from app.api.admin_auth import get_current_admin

router = APIRouter(prefix="/admin/teams", tags=["admin-teams"])


class AdminTeamCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    team_leader_id: str
    site_id: Optional[str] = None
    member_ids: List[str] = Field(default_factory=list)


class AdminTeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    team_leader_id: Optional[str] = None
    site_id: Optional[str] = None
    is_active: Optional[bool] = None


def team_to_dict(team, db):
    """Convert a Team to a dict with leader & member details."""
    leader = db.query(User).filter(User.id == team.team_leader_id).first()
    site = db.query(ConstructionSite).filter(ConstructionSite.id == team.site_id).first() if team.site_id else None

    members_db = db.query(TeamMember).filter(TeamMember.team_id == team.id).all()
    members = []
    for tm in members_db:
        u = db.query(User).filter(User.id == tm.user_id).first()
        if u:
            role = db.query(Role).filter(Role.id == u.role_id).first()
            members.append({
                "user_id": u.id,
                "full_name": u.full_name,
                "employee_code": u.employee_code,
                "role_name": role.name if role else "N/A",
            })

    return {
        "id": team.id,
        "name": team.name,
        "team_leader_id": team.team_leader_id,
        "team_leader_name": leader.full_name if leader else "N/A",
        "site_id": team.site_id,
        "site_name": site.name if site else None,
        "is_active": team.is_active,
        "member_count": len(members),
        "members": members,
        "created_at": team.created_at.isoformat() if team.created_at else None,
    }


@router.get("/")
def list_teams(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """List all teams."""
    teams = db.query(Team).order_by(Team.created_at.desc()).all()
    return {"teams": [team_to_dict(t, db) for t in teams]}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_team(
    data: AdminTeamCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Create a new team (admin)."""
    leader = db.query(User).filter(User.id == data.team_leader_id).first()
    if not leader:
        raise HTTPException(status_code=404, detail="Liderul nu a fost găsit")

    team = Team(
        name=data.name,
        team_leader_id=data.team_leader_id,
        organization_id=leader.organization_id,
        site_id=data.site_id,
        is_active=True,
    )
    db.add(team)
    db.flush()

    # Add members
    for uid in data.member_ids:
        db.add(TeamMember(team_id=team.id, user_id=uid))

    db.commit()
    db.refresh(team)
    return team_to_dict(team, db)


@router.put("/{team_id}")
def update_team(
    team_id: str,
    data: AdminTeamUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Update a team."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Echipa nu a fost găsită")

    if data.name is not None:
        team.name = data.name
    if data.team_leader_id is not None:
        team.team_leader_id = data.team_leader_id
    if data.site_id is not None:
        team.site_id = data.site_id
    if data.is_active is not None:
        team.is_active = data.is_active

    db.commit()
    db.refresh(team)
    return team_to_dict(team, db)


@router.put("/{team_id}/members")
def set_team_members(
    team_id: str,
    member_ids: List[str],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Set the list of members for a team (replaces existing)."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Echipa nu a fost găsită")

    # Remove old members
    db.query(TeamMember).filter(TeamMember.team_id == team_id).delete()

    # Add new ones
    for uid in member_ids:
        db.add(TeamMember(team_id=team_id, user_id=uid))

    db.commit()
    return team_to_dict(team, db)


@router.delete("/{team_id}")
def delete_team(
    team_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Delete a team."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Echipa nu a fost găsită")

    db.query(TeamMember).filter(TeamMember.team_id == team_id).delete()
    db.delete(team)
    db.commit()
    return {"message": "Echipă ștearsă"}


@router.get("/available-users")
def get_available_users(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Get all users that can be team leaders or members."""
    users = db.query(User).filter(User.is_active == True).all()
    result = []
    for u in users:
        role = db.query(Role).filter(Role.id == u.role_id).first()
        result.append({
            "id": u.id,
            "full_name": u.full_name,
            "employee_code": u.employee_code,
            "role_name": role.name if role else "N/A",
            "role_code": role.code if role else None,
        })
    return {"users": result}

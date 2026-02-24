"""
Team Management API endpoints for team leaders
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, date, timedelta
import json

from app.database import get_db
from app.models import Team, TeamMember, TeamDailyComposition, User, Site
from app.api.auth import get_current_user

router = APIRouter(prefix="/teams", tags=["teams"])


# Pydantic Models
class TeamMemberInfo(BaseModel):
    user_id: str
    full_name: str
    employee_code: str
    role_name: str
    joined_date: Optional[date] = None
    
    class Config:
        from_attributes = True


class TeamCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    site_id: Optional[str] = None
    member_ids: List[str] = Field(default_factory=list)


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    site_id: Optional[str] = None
    is_active: Optional[bool] = None


class TeamResponse(BaseModel):
    id: str
    name: str
    team_leader_id: str
    team_leader_name: str
    site_id: Optional[str]
    site_name: Optional[str]
    is_active: bool
    member_count: int
    members: List[TeamMemberInfo]
    created_at: datetime
    
    class Config:
        from_attributes = True


class DailyCompositionCreate(BaseModel):
    team_id: str
    date: date
    site_id: Optional[str] = None
    member_ids: List[str]
    notes: Optional[str] = None


class DailyCompositionResponse(BaseModel):
    id: str
    team_id: str
    date: date
    site_id: Optional[str]
    site_name: Optional[str]
    member_ids: List[str]
    members: List[TeamMemberInfo]
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# API Endpoints

@router.get("/my-team")
def get_my_team(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the team the current user belongs to (as a member or leader)"""
    # Check if user is a member of any team
    membership = db.query(TeamMember).filter(
        TeamMember.user_id == current_user.id,
        TeamMember.is_active == True
    ).first()

    if membership:
        team = db.query(Team).filter(Team.id == membership.team_id, Team.is_active == True).first()
        if team:
            leader = db.query(User).filter(User.id == team.team_leader_id).first()
            return {
                "team_name": team.name,
                "team_leader_name": leader.full_name if leader else "Necunoscut"
            }

    # Check if user is a team leader
    team = db.query(Team).filter(
        Team.team_leader_id == current_user.id,
        Team.is_active == True
    ).first()
    if team:
        return {
            "team_name": team.name,
            "team_leader_name": current_user.full_name
        }

    return {"team_name": None, "team_leader_name": None}


@router.get("/", response_model=List[TeamResponse])
def get_teams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all teams for current user's organization"""
    
    # If user is team leader, show only their teams
    # Otherwise show all teams (for admins)
    query = db.query(Team).filter(
        Team.organization_id == current_user.organization_id,
        Team.is_active == True
    )
    
    if current_user.role.code in ('TEAM_LEAD',):
        query = query.filter(Team.team_leader_id == current_user.id)
    elif current_user.role.code not in ('ADMIN', 'SUPER_ADMIN', 'SITE_MANAGER'):
        # Workers can't see teams list
        return []
    
    teams = query.all()
    
    result = []
    for team in teams:
        # Get members
        members_query = db.query(TeamMember, User).join(User).filter(
            TeamMember.team_id == team.id,
            TeamMember.is_active == True
        ).all()
        
        members = [
            TeamMemberInfo(
                user_id=user.id,
                full_name=user.full_name,
                employee_code=user.employee_code,
                role_name=user.role.name,
                joined_date=member.joined_date
            )
            for member, user in members_query
        ]
        
        site = db.query(Site).filter(Site.id == team.site_id).first() if team.site_id else None
        
        result.append(TeamResponse(
            id=team.id,
            name=team.name,
            team_leader_id=team.team_leader_id,
            team_leader_name=team.team_leader.full_name,
            site_id=team.site_id,
            site_name=site.name if site else None,
            is_active=team.is_active,
            member_count=len(members),
            members=members,
            created_at=team.created_at
        ))
    
    return result


@router.post("/", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(
    team_data: TeamCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new team (only team leaders can create teams)"""
    
    # Check if user is team leader
    if current_user.role.code != 'TEAM_LEAD':
        raise HTTPException(status_code=403, detail="Only team leaders can create teams")
    
    # Check if team name already exists
    existing = db.query(Team).filter(
        Team.organization_id == current_user.organization_id,
        Team.name == team_data.name,
        Team.is_active == True
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Team with this name already exists")
    
    # Create team
    new_team = Team(
        organization_id=current_user.organization_id,
        name=team_data.name,
        team_leader_id=current_user.id,
        site_id=team_data.site_id
    )
    
    db.add(new_team)
    db.flush()
    
    # Add members
    today = date.today()
    for user_id in team_data.member_ids:
        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            continue
            
        member = TeamMember(
            team_id=new_team.id,
            user_id=user_id,
            joined_date=today
        )
        db.add(member)
    
    db.commit()
    db.refresh(new_team)
    
    # Get members for response
    members_query = db.query(TeamMember, User).join(User).filter(
        TeamMember.team_id == new_team.id,
        TeamMember.is_active == True
    ).all()
    
    members = [
        TeamMemberInfo(
            user_id=user.id,
            full_name=user.full_name,
            employee_code=user.employee_code,
            role_name=user.role.name,
            joined_date=member.joined_date
        )
        for member, user in members_query
    ]
    
    site = db.query(Site).filter(Site.id == new_team.site_id).first() if new_team.site_id else None
    
    return TeamResponse(
        id=new_team.id,
        name=new_team.name,
        team_leader_id=new_team.team_leader_id,
        team_leader_name=current_user.full_name,
        site_id=new_team.site_id,
        site_name=site.name if site else None,
        is_active=new_team.is_active,
        member_count=len(members),
        members=members,
        created_at=new_team.created_at
    )


@router.put("/{team_id}")
def update_team(
    team_id: str,
    team_data: TeamUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update team (rename, change site, etc.) — only team leader"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if team.team_leader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only team leader can update the team")

    if team_data.name is not None:
        team.name = team_data.name
    if team_data.site_id is not None:
        team.site_id = team_data.site_id
    if team_data.is_active is not None:
        team.is_active = team_data.is_active

    db.commit()
    db.refresh(team)
    return {"message": "Team updated", "name": team.name}


@router.put("/{team_id}/members")
def update_team_members(
    team_id: str,
    member_ids: List[str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update team members"""
    
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if user is team leader of this team
    if team.team_leader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only team leader can update members")
    
    # Get current members
    current_members = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.is_active == True
    ).all()
    
    current_member_ids = {m.user_id for m in current_members}
    new_member_ids = set(member_ids)
    
    today = date.today()
    
    # Remove members not in new list
    for member in current_members:
        if member.user_id not in new_member_ids:
            member.is_active = False
            member.left_date = today
    
    # Add new members
    for user_id in new_member_ids:
        if user_id not in current_member_ids:
            # Verify user exists
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                continue
                
            new_member = TeamMember(
                team_id=team_id,
                user_id=user_id,
                joined_date=today
            )
            db.add(new_member)
    
    db.commit()
    
    return {"message": "Team members updated successfully"}


@router.post("/daily-composition", response_model=DailyCompositionResponse)
def create_daily_composition(
    composition_data: DailyCompositionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create daily team composition"""
    
    team = db.query(Team).filter(Team.id == composition_data.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if user is team leader
    if team.team_leader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only team leader can create daily compositions")
    
    # Check if composition already exists for this date
    existing = db.query(TeamDailyComposition).filter(
        TeamDailyComposition.team_id == composition_data.team_id,
        TeamDailyComposition.date == composition_data.date
    ).first()
    
    if existing:
        # Update existing
        existing.member_ids = json.dumps(composition_data.member_ids)
        existing.site_id = composition_data.site_id
        existing.notes = composition_data.notes
        db.commit()
        db.refresh(existing)
        composition = existing
    else:
        # Create new
        composition = TeamDailyComposition(
            team_id=composition_data.team_id,
            date=composition_data.date,
            site_id=composition_data.site_id,
            member_ids=json.dumps(composition_data.member_ids),
            notes=composition_data.notes
        )
        db.add(composition)
        db.commit()
        db.refresh(composition)
    
    # Get member details
    member_ids_list = json.loads(composition.member_ids)
    members_query = db.query(User).filter(User.id.in_(member_ids_list)).all()
    
    members = [
        TeamMemberInfo(
            user_id=user.id,
            full_name=user.full_name,
            employee_code=user.employee_code,
            role_name=user.role.name
        )
        for user in members_query
    ]
    
    site = db.query(Site).filter(Site.id == composition.site_id).first() if composition.site_id else None
    
    return DailyCompositionResponse(
        id=composition.id,
        team_id=composition.team_id,
        date=composition.date,
        site_id=composition.site_id,
        site_name=site.name if site else None,
        member_ids=member_ids_list,
        members=members,
        notes=composition.notes,
        created_at=composition.created_at
    )


@router.get("/daily-composition/{team_id}")
def get_daily_compositions(
    team_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get daily compositions for a team"""
    
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    query = db.query(TeamDailyComposition).filter(
        TeamDailyComposition.team_id == team_id
    )
    
    if start_date:
        query = query.filter(TeamDailyComposition.date >= start_date)
    if end_date:
        query = query.filter(TeamDailyComposition.date <= end_date)
    
    compositions = query.order_by(TeamDailyComposition.date.desc()).all()
    
    result = []
    for comp in compositions:
        member_ids_list = json.loads(comp.member_ids)
        members_query = db.query(User).filter(User.id.in_(member_ids_list)).all()
        
        members = [
            TeamMemberInfo(
                user_id=user.id,
                full_name=user.full_name,
                employee_code=user.employee_code,
                role_name=user.role.name
            )
            for user in members_query
        ]
        
        site = db.query(Site).filter(Site.id == comp.site_id).first() if comp.site_id else None
        
        result.append(DailyCompositionResponse(
            id=comp.id,
            team_id=comp.team_id,
            date=comp.date,
            site_id=comp.site_id,
            site_name=site.name if site else None,
            member_ids=member_ids_list,
            members=members,
            notes=comp.notes,
            created_at=comp.created_at
        ))
    
    return result


@router.post("/copy-from-previous")
def copy_from_previous_day(
    team_id: str,
    target_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Copy team composition from previous day"""
    
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if user is team leader
    if team.team_leader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only team leader can copy compositions")
    
    # Find previous composition
    previous = db.query(TeamDailyComposition).filter(
        TeamDailyComposition.team_id == team_id,
        TeamDailyComposition.date < target_date
    ).order_by(TeamDailyComposition.date.desc()).first()
    
    if not previous:
        raise HTTPException(status_code=404, detail="No previous composition found")
    
    # Create new composition
    new_composition = TeamDailyComposition(
        team_id=team_id,
        date=target_date,
        site_id=previous.site_id,
        member_ids=previous.member_ids,
        notes=f"Copied from {previous.date}"
    )
    
    db.add(new_composition)
    db.commit()
    db.refresh(new_composition)
    
    return {
        "message": "Composition copied successfully",
        "composition_id": new_composition.id,
        "copied_from": str(previous.date)
    }


@router.get("/available-workers")
def get_available_workers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all workers in the organization (for adding to teams).
    
    Role hierarchy visibility:
    - WORKER: sees only WORKER
    - TEAM_LEAD: sees only WORKER
    - SITE_MANAGER: sees WORKER + TEAM_LEAD
    - ADMIN / SUPER_ADMIN: sees everyone
    """
    from app.models import Role

    # Determine which role codes the current user is allowed to see
    current_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    current_code = current_role.code if current_role else "WORKER"

    VISIBLE_ROLES = {
        "WORKER": ["WORKER"],
        "TEAM_LEAD": ["WORKER"],
        "SITE_MANAGER": ["WORKER", "TEAM_LEAD"],
        "ADMIN": ["WORKER", "TEAM_LEAD", "SITE_MANAGER", "ADMIN", "SUPER_ADMIN"],
        "SUPER_ADMIN": ["WORKER", "TEAM_LEAD", "SITE_MANAGER", "ADMIN", "SUPER_ADMIN"],
    }
    allowed_codes = VISIBLE_ROLES.get(current_code, ["WORKER"])

    # Get role IDs that match the allowed codes
    allowed_role_ids = [
        r.id for r in db.query(Role).filter(Role.code.in_(allowed_codes)).all()
    ]

    users = db.query(User).filter(
        User.organization_id == current_user.organization_id,
        User.is_active == True,
        User.id != current_user.id,
        User.role_id.in_(allowed_role_ids)
    ).all()

    result = []
    for u in users:
        role = db.query(Role).filter(Role.id == u.role_id).first()
        result.append({
            "id": str(u.id),
            "full_name": u.full_name,
            "employee_code": u.employee_code,
            "role_name": role.name if role else "Muncitor",
            "avatar_path": u.avatar_path
        })

    return {"workers": result}


@router.get("/{team_id}/status")
def get_team_status(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get live status for all team members (who's working, on break, etc.)"""
    from app.models import Timesheet, TimesheetSegment, TimesheetLine, Role

    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Get all active members
    members_query = db.query(TeamMember, User).join(User).filter(
        TeamMember.team_id == team_id,
        TeamMember.is_active == True
    ).all()

    today = date.today()
    now = datetime.utcnow()
    result = []

    for member, user in members_query:
        role = db.query(Role).filter(Role.id == user.role_id).first()

        # Find today's active timesheet
        timesheet = db.query(Timesheet).filter(
            Timesheet.owner_user_id == user.id,
            Timesheet.date == today
        ).first()

        status_info = {
            "user_id": str(user.id),
            "full_name": user.full_name,
            "employee_code": user.employee_code,
            "role_name": role.name if role else "Muncitor",
            "avatar_path": user.avatar_path,
            "status": "absent",  # default
            "check_in_time": None,
            "check_out_time": None,
            "worked_hours": 0,
            "break_hours": 0,
            "break_start_time": None,
            "break_end_time": None,
            "is_on_break": False,
            "site_name": None,
            "activities": []
        }

        if timesheet:
            # Get ALL segments for today (to aggregate total worked time)
            all_segments = db.query(TimesheetSegment).filter(
                TimesheetSegment.timesheet_id == timesheet.id
            ).order_by(TimesheetSegment.check_in_time.asc()).all()

            if all_segments:
                # Use earliest check-in time
                status_info["check_in_time"] = all_segments[0].check_in_time.isoformat()

                total_worked = 0
                total_break = 0
                is_on_break = False
                current_status = "finished"

                for seg in all_segments:
                    if seg.check_out_time:
                        # Completed segment
                        seg_elapsed = (seg.check_out_time - seg.check_in_time).total_seconds() / 3600
                        seg_break = 0
                        if seg.break_start_time and seg.break_end_time:
                            seg_break = (seg.break_end_time - seg.break_start_time).total_seconds() / 3600
                        total_worked += max(0, seg_elapsed - seg_break)
                        total_break += seg_break
                    else:
                        # Active segment (still working)
                        seg_elapsed = (now - seg.check_in_time).total_seconds() / 3600
                        seg_break = 0
                        if seg.break_start_time and seg.break_end_time:
                            seg_break = (seg.break_end_time - seg.break_start_time).total_seconds() / 3600
                        elif seg.break_start_time and not seg.break_end_time:
                            seg_break = (now - seg.break_start_time).total_seconds() / 3600
                            is_on_break = True
                        total_worked += max(0, seg_elapsed - seg_break)
                        total_break += seg_break
                        current_status = "on_break" if is_on_break else "working"

                status_info["status"] = current_status
                status_info["worked_hours"] = round(max(0, total_worked), 2)
                status_info["break_hours"] = round(max(0, total_break), 2)
                status_info["is_on_break"] = is_on_break
                status_info["check_out_time"] = all_segments[-1].check_out_time.isoformat() if all_segments[-1].check_out_time else None

                # Find the first segment with a valid break (start AND end from same segment)
                for seg in all_segments:
                    if seg.break_start_time:
                        status_info["break_start_time"] = seg.break_start_time.isoformat()
                        status_info["break_end_time"] = seg.break_end_time.isoformat() if seg.break_end_time else None
                        break  # use first segment's break only

                # Get site name from latest segment
                latest_seg = all_segments[-1]
                if latest_seg.site_id:
                    site = db.query(Site).filter(Site.id == latest_seg.site_id).first()
                    if site:
                        status_info["site_name"] = site.name

            # Get activities
            activities = db.query(TimesheetLine).filter(
                TimesheetLine.timesheet_id == timesheet.id
            ).all()
            from app.models import Activity as ActivityModel
            for act_line in activities:
                activity = db.query(ActivityModel).filter(ActivityModel.id == act_line.activity_id).first()
                if activity:
                    status_info["activities"].append({
                        "name": activity.name,
                        "quantity": float(act_line.quantity_numeric) if act_line.quantity_numeric else 0,
                        "unit_type": act_line.unit_type
                    })

        result.append(status_info)

    return {
        "team_id": team_id,
        "team_name": team.name,
        "members": result
    }

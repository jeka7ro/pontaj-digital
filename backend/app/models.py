from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer, Numeric, Date, Float, Time
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
from datetime import datetime, time

def generate_uuid():
    return str(uuid.uuid4())

# Models
class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    code = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    is_employee = Column(Boolean, default=False, nullable=False)
    permissions = Column(Text)  # JSON as text for SQLite
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    organization = relationship("Organization")

class User(Base):
    """Employee/User with complete personal information"""
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    role_id = Column(String(36), ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False)
    
    # Login credentials
    employee_code = Column(String(50), nullable=False, unique=True)
    pin_hash = Column(String(255))
    
    # Personal information
    full_name = Column(String(255), nullable=False)
    birth_date = Column(Date)
    cnp = Column(String(13), unique=True)  # Cod Numeric Personal (Romanian SSN)
    birth_place = Column(String(255))  # Loc naștere
    id_card_series = Column(String(20))  # Serie + Număr buletin (ex: RD 123456)
    
    # Contact information
    phone = Column(String(20))
    email = Column(String(255))
    address = Column(Text)
    
    # Avatar
    avatar_path = Column(String(500))  # Path to avatar image
    
    # ID Card
    id_card_path = Column(String(500))  # Path to ID card front image
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    organization = relationship("Organization")
    role = relationship("Role")

class Site(Base):
    __tablename__ = "sites"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    address = Column(Text)
    latitude = Column(Float)
    longitude = Column(Float)
    geofence_radius = Column(Integer, default=100)  # meters
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    organization = relationship("Organization")

class ActivityCategory(Base):
    """Activity categories / work stages (e.g., Baterea stâlpilor, Structura, Module)"""
    __tablename__ = "activity_categories"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    color = Column(String(7), default="#3b82f6")  # hex color
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    organization = relationship("Organization")
    activities = relationship("Activity", back_populates="category")


class Activity(Base):
    __tablename__ = "activities"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(String(36), ForeignKey("activity_categories.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)  # detailed work description
    unit_type = Column(String(50), nullable=False)
    quantity_rules = Column(Text)  # JSON as text
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    organization = relationship("Organization")
    category = relationship("ActivityCategory", back_populates="activities")


class Timesheet(Base):
    __tablename__ = "timesheets"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    owner_type = Column(String(10), nullable=False)  # USER or TEAM
    owner_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    owner_team_id = Column(String(36), ForeignKey("teams.id", ondelete="CASCADE"))
    team_category = Column(String(10))  # TEAM or NO_TEAM
    status = Column(String(20), default="DRAFT", nullable=False)
    note_text = Column(Text)
    locked_at = Column(DateTime)
    locked_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    unlocked_at = Column(DateTime)
    unlocked_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    unlock_reason = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    organization = relationship("Organization")
    owner_user = relationship("User", foreign_keys=[owner_user_id])
    locked_by = relationship("User", foreign_keys=[locked_by_user_id])
    unlocked_by = relationship("User", foreign_keys=[unlocked_by_user_id])

class TimesheetSegment(Base):
    __tablename__ = "timesheet_segments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    timesheet_id = Column(String(36), ForeignKey("timesheets.id", ondelete="CASCADE"), nullable=False)
    site_id = Column(String(36), ForeignKey("construction_sites.id", ondelete="RESTRICT"), nullable=False)
    check_in_time = Column(DateTime, nullable=False)
    break_start_time = Column(DateTime)
    break_end_time = Column(DateTime)
    check_out_time = Column(DateTime, nullable=True)
    segment_note = Column(Text)
    
    # GPS tracking for clock-in/out
    check_in_latitude = Column(Float)
    check_in_longitude = Column(Float)
    check_out_latitude = Column(Float)
    check_out_longitude = Column(Float)
    break_start_latitude = Column(Float)
    break_start_longitude = Column(Float)
    
    # Geofence validation
    is_within_geofence = Column(Boolean, default=True)
    distance_from_site = Column(Float)  # meters
    last_ping_at = Column(DateTime)  # last GPS location ping received
    
    # Overtime tracking
    overtime_minutes = Column(Integer, default=0)  # calculated overtime in minutes
    overtime_approved = Column(Boolean, default=False)
    overtime_approved_by = Column(String(36), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    overtime_approved_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    timesheet = relationship("Timesheet")
    site = relationship("ConstructionSite")
    geofence_pauses = relationship("GeofencePause", back_populates="segment", cascade="all, delete-orphan")


class GeofencePause(Base):
    """Tracks periods when a worker is outside the geofence radius (>300m from site).
    Hours during these pauses are NOT counted as worked time."""
    __tablename__ = "geofence_pauses"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    segment_id = Column(String(36), ForeignKey("timesheet_segments.id", ondelete="CASCADE"), nullable=False)
    pause_start = Column(DateTime, nullable=False)
    pause_end = Column(DateTime, nullable=True)  # NULL = still outside zone
    distance_at_pause = Column(Float)  # distance in meters when pause was triggered
    latitude = Column(Float)  # worker's position when pause started
    longitude = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    segment = relationship("TimesheetSegment", back_populates="geofence_pauses")


class TimesheetLine(Base):
    __tablename__ = "timesheet_lines"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    timesheet_id = Column(String(36), ForeignKey("timesheets.id", ondelete="CASCADE"), nullable=False)
    segment_id = Column(String(36), ForeignKey("timesheet_segments.id", ondelete="CASCADE"), nullable=False)
    activity_id = Column(String(36), ForeignKey("activities.id", ondelete="RESTRICT"), nullable=False)
    quantity_numeric = Column(Numeric(12, 4), nullable=False)
    unit_type = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    timesheet = relationship("Timesheet")
    segment = relationship("TimesheetSegment")
    activity = relationship("Activity")


class Admin(Base):
    """Admin users with email/password authentication"""
    __tablename__ = "admins"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ConstructionSite(Base):
    """Solar panel installation sites"""
    __tablename__ = "construction_sites"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    address = Column(Text)
    description = Column(Text)
    status = Column(String(50), default="active", nullable=False)  # active, completed, suspended
    
    # Solar panel installation specific fields
    client_name = Column(String(255))  # Client name
    panel_count = Column(Integer)  # Number of panels to install
    system_power_kw = Column(Float)  # System power in kW
    installation_type = Column(String(100))  # residential, commercial, industrial
    
    # Location / geofencing fields
    county = Column(String(100))  # Județ
    latitude = Column(Float)
    longitude = Column(Float)
    geofence_radius = Column(Integer, default=100)  # meters
    
    # Work schedule
    work_start_time = Column(Time, default=time(7, 0))   # Program start (default 07:00)
    work_end_time = Column(Time, default=time(16, 0))     # Program end (default 16:00)
    max_overtime_minutes = Column(Integer, default=120)    # Max overtime without approval (default 2h)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    organization = relationship("Organization")


class TimesheetPhoto(Base):
    """Photos uploaded by site managers during the day"""
    __tablename__ = "timesheet_photos"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    timesheet_id = Column(String(36), ForeignKey("timesheets.id", ondelete="CASCADE"), nullable=True)
    site_id = Column(String(36), ForeignKey("construction_sites.id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    
    # File information
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)  # Size in bytes
    thumbnail_path = Column(String(500))
    
    # Metadata
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    description = Column(Text)
    
    timesheet = relationship("Timesheet")
    site = relationship("ConstructionSite")
    uploader = relationship("User")


class Team(Base):
    """Teams managed by team leaders"""
    __tablename__ = "teams"
    __table_args__ = {'extend_existing': True}
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    team_leader_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    site_id = Column(String(36), ForeignKey("sites.id", ondelete="SET NULL"))
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    organization = relationship("Organization")
    team_leader = relationship("User", foreign_keys=[team_leader_id])
    site = relationship("Site")


class TeamMember(Base):
    """Team members (many-to-many relationship)"""
    __tablename__ = "team_members"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    joined_date = Column(Date, nullable=False)
    left_date = Column(Date)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    team = relationship("Team")
    user = relationship("User")


class TeamDailyComposition(Base):
    """Daily team compositions for tracking changes over time"""
    __tablename__ = "team_daily_compositions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    site_id = Column(String(36), ForeignKey("sites.id", ondelete="SET NULL"))
    member_ids = Column(Text, nullable=False)  # JSON array of user IDs
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    team = relationship("Team")
    site = relationship("Site")


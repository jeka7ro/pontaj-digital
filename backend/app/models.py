from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer, Numeric, Date, Float, Time, JSON
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
from datetime import datetime, time, date

def generate_uuid():
    return str(uuid.uuid4())

# Models
class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    
    # White-labeling & SaaS features
    slug = Column(String(100), unique=True, nullable=True)
    custom_domain = Column(String(255), unique=True, nullable=True)
    logo_url = Column(String(500), nullable=True)
    favicon_url = Column(String(500), nullable=True)
    primary_color = Column(String(7), default="#3b82f6", nullable=True)
    secondary_color = Column(String(7), nullable=True)
    support_email = Column(String(255), nullable=True)
    plan_tier = Column(String(50), default="basic", nullable=False)
    max_users = Column(Integer, nullable=True)
    features = Column(JSON, nullable=True)
    timezone = Column(String(50), default="auto", nullable=True)
    has_long_term_sites = Column(Boolean, default=True, nullable=True)
    has_short_term_interventions = Column(Boolean, default=False, nullable=True)
    
    # ── Program Transport (Parc Auto) ─────────────────────────────────────
    # Intervalul în care se permite crearea foilor de parcurs
    transport_start_time = Column(String(5), default="06:00", nullable=True)  # HH:MM
    transport_end_time   = Column(String(5), default="20:00", nullable=True)  # HH:MM
    # Zilele săptămânii permise: JSON array [0=Luni ... 6=Duminică]
    # Ex: [0,1,2,3,4] = Luni-Vineri  |  [0,1,2,3,4,5] = Luni-Sâmbătă
    transport_allowed_days = Column(JSON, default=lambda: [0,1,2,3,4], nullable=True)
    # Dacă False, se permite dar se marchează ca "out_of_schedule"
    transport_strict_schedule = Column(Boolean, default=False, nullable=True)

    calendar_token = Column(String(64), unique=True, nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    trial_ends_at = Column(DateTime, nullable=True)
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
    site_id = Column(String(36), ForeignKey("construction_sites.id", ondelete="SET NULL"), nullable=True)
    
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
    
    # Contract
    contract_path = Column(String(500))  # Path to work contract (PDF/JPG)
    
    # Financial (admin-only visibility)
    hourly_rate = Column(Numeric(8, 2), nullable=True)  # Tarif orar in Lei
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    organization = relationship("Organization")
    # Relationships
    role = relationship("Role")
    site = relationship("ConstructionSite")
    documents = relationship("EmployeeDocument", back_populates="user", cascade="all, delete-orphan")

class EmployeeDocument(Base):
    """Additional documents for an employee (medical certs, safety training, etc)"""
    __tablename__ = "employee_documents"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    user = relationship("User", back_populates="documents")

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
    actual_check_in_time = Column(DateTime, nullable=True)
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

    # ── Legătură cu comanda de lucru (opțional) ───────────────────────────────
    work_order_id = Column(String(36), ForeignKey("work_orders.id", ondelete="SET NULL"), nullable=True)
    work_order    = relationship("WorkOrder")
    
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
    role = Column(String(50), default='ADMIN', nullable=False)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_super_admin = Column(Boolean, default=False, nullable=False, server_default='false')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Client(Base):
    """Clients of the organization"""
    __tablename__ = "clients"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    cui = Column(String(50), nullable=True)
    reg_com = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    contact_person = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    organization = relationship("Organization")
    sites = relationship("ConstructionSite", back_populates="client")


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
    client_id = Column(String(36), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    client_name = Column(String(255))  # Client name (legacy or fallback)
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
    lunch_break_start = Column(Time, default=time(12, 0))   # Break start (default 12:00)
    lunch_break_end = Column(Time, default=time(13, 0))     # Break end (default 13:00)
    max_overtime_minutes = Column(Integer, default=120)    # Max overtime without approval (default 2h)
    
    # ── Lucrari de scurta durata ──────────────────────────────────────────────
    # Tipul proiectului: 'standard' (santier obisnuit) | 'short_term' (lucrare 3-15 zile)
    project_type = Column(String(20), default="standard", nullable=False)
    planned_start_date = Column(Date, nullable=True)   # Data planificata de incepere
    planned_end_date   = Column(Date, nullable=True)   # Termenul planificat de finalizare
    # planned_duration_days e calculat runtime (planned_end_date - planned_start_date)
    # Nu il stocam — evitam datele divergente

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    organization = relationship("Organization")
    client = relationship("Client", back_populates="sites")


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
    color = Column(String(7), nullable=True, default="#94a3b8") # HEX color
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


class SitePhoto(Base):
    """Photos taken by site managers on construction sites"""
    __tablename__ = "site_photos"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    site_id = Column(String(36), ForeignKey("construction_sites.id", ondelete="CASCADE"), nullable=False)
    uploaded_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    photo_path = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    site = relationship("ConstructionSite")
    uploaded_by = relationship("User")


# =================== FLEET MANAGEMENT ===================

class Vehicle(Base):
    """Fleet vehicles and machinery"""
    __tablename__ = "vehicles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)  # ex: "VW Transporter BV-12-XYZ", "Excavator Volvo"
    plate_number = Column(String(20), nullable=True)  # Numar inmatriculare
    chassis_number = Column(String(50), nullable=True) # Serie sasiu / utilaj
    type = Column(String(50), default="car", nullable=False)  # car, van, truck, excavator, generator, other
    year = Column(Integer, nullable=True)
    status = Column(String(20), default="active", nullable=False)  # active, service, inactive
    notes = Column(Text, nullable=True)
    documents = Column(JSON, nullable=True) # JSON list of document
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization")


class VehicleCategory(Base):
    """Dynamic categories for vehicles and equipment"""
    __tablename__ = "vehicle_categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    group = Column(String(50), nullable=False, default="equipment")  # 'car' or 'equipment'
    icon = Column(String(50), nullable=True)  # lucide react icon name (e.g. "Truck", "Tractor")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization")

class EquipmentDailyLog(Base):
    """Daily tracking for equipment (utilaje) use and refueling"""
    __tablename__ = "equipment_daily_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    vehicle_id = Column(String(36), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False)
    site_id = Column(String(36), ForeignKey("construction_sites.id", ondelete="SET NULL"), nullable=True)
    operator_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    date = Column(Date, nullable=False, default=date.today)
    
    is_used = Column(Boolean, default=False)
    refueled = Column(Boolean, default=False)
    refuel_liters = Column(Float, nullable=True)
    
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    vehicle = relationship("Vehicle")
    site = relationship("ConstructionSite")
    operator = relationship("User")


class VehicleSiteAssignment(Base):
    """Many-to-Many: Vehicle assigned to Construction Site(s)"""
    __tablename__ = "vehicle_site_assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    vehicle_id = Column(String(36), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False)
    site_id = Column(String(36), ForeignKey("construction_sites.id", ondelete="CASCADE"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    vehicle = relationship("Vehicle")
    site = relationship("ConstructionSite")


class VehicleUserAssignment(Base):
    """Many-to-Many: Vehicle assigned to User (driver/operator)"""
    __tablename__ = "vehicle_user_assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    vehicle_id = Column(String(36), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    assigned_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    vehicle = relationship("Vehicle")
    user = relationship("User")

# =================== WAREHOUSE MANAGEMENT ===================

class WarehouseItem(Base):
    """Virtual Warehouse Items (Magazie Virtuala)"""
    __tablename__ = "warehouse_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)  # SCULE, CONSUMABILE, STRUCTURA, COMBUSTIBIL
    unit = Column(String(20), nullable=False)      # e.g., buc, L, kg, m, rola
    total_quantity = Column(Float, default=0.0, nullable=False)
    
    # Tool specific tracking fields
    model = Column(String(255), nullable=True)
    inventory_code = Column(String(100), nullable=True)
    current_holder_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    current_site_id = Column(String(36), ForeignKey("construction_sites.id", ondelete="SET NULL"), nullable=True)
    checked_out_at = Column(DateTime, nullable=True)
    is_defective = Column(Boolean, default=False, nullable=False)
    is_lost = Column(Boolean, default=False, nullable=False)

    # Two-step return: worker requests return, admin confirms
    pending_return = Column(Boolean, default=False, nullable=False)
    pending_return_at = Column(DateTime, nullable=True)  # when worker pressed "Returnez"
    pending_return_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # which worker

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization")

class WarehouseTransaction(Base):
    """Stock in/out history for warehouse items"""
    __tablename__ = "warehouse_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    item_id = Column(String(36), ForeignKey("warehouse_items.id", ondelete="CASCADE"), nullable=False)
    transaction_type = Column(String(10), nullable=False)  # IN or OUT
    quantity = Column(Float, nullable=False)
    date = Column(Date, nullable=False, default=date.today)
    
    # Who performed the transaction (Logistic/Admin user). No foreign key because it can be an Admin OR a User.
    operated_by_id = Column(String(36), nullable=True)
    
    # Destination assignments (for OUT transactions)
    assigned_to_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_to_vehicle_id = Column(String(36), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    site_id = Column(String(36), ForeignKey("construction_sites.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    attachment_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    item = relationship("WarehouseItem")
    assigned_to_user = relationship("User", foreign_keys=[assigned_to_user_id])
    assigned_to_vehicle = relationship("Vehicle", foreign_keys=[assigned_to_vehicle_id])
    site = relationship("ConstructionSite", foreign_keys=[site_id])


# ─────────────────────────────────────────────────────────────────────────────
# SESIZARI SI RECLAMATII / URGENTE / MATERIALE
# ─────────────────────────────────────────────────────────────────────────────

class MaterialRequest(Base):
    """Necesar materiale cerut de un angajat/responsabil"""
    __tablename__ = "material_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    site_id = Column(String(36), ForeignKey("construction_sites.id", ondelete="SET NULL"), nullable=True)

    items_text = Column(Text, nullable=False)
    items_json = Column(Text, nullable=True) # stores JSON array of {id, qty, name, type}
    notes = Column(Text, nullable=True)
    
    # Valori posibile: pending, approved, rejected, delivered
    status = Column(String(20), nullable=False, default="pending")
    is_fulfilled = Column(Boolean, nullable=False, default=False)

    admin_response = Column(Text, nullable=True)
    responded_by = Column(String(36), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    responded_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", foreign_keys=[user_id])
    site = relationship("ConstructionSite", foreign_keys=[site_id])
    responder = relationship("Admin", foreign_keys=[responded_by])

class Emergency(Base):
    """Alerta de urgenta trimisa de un angajat"""
    __tablename__ = "emergencies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    site_id = Column(String(36), ForeignKey("construction_sites.id", ondelete="SET NULL"), nullable=True)

    description = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False, default="high") # high, critical
    
    # Valori posibile: active, resolved
    status = Column(String(20), nullable=False, default="active")

    admin_response = Column(Text, nullable=True)
    resolved_by = Column(String(36), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", foreign_keys=[user_id])
    site = relationship("ConstructionSite", foreign_keys=[site_id])
    resolver = relationship("Admin", foreign_keys=[resolved_by])

class Complaint(Base):
    """Sesizare / Reclamatie trimisa de un angajat"""
    __tablename__ = "complaints"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)

    # Valori posibile: open, in_review, resolved, closed
    status = Column(String(20), nullable=False, default="open")

    admin_response = Column(Text, nullable=True)
    responded_by = Column(String(36), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    user_seen_response = Column(Boolean, default=False)
    responded_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", foreign_keys=[user_id])
    responder = relationship("Admin", foreign_keys=[responded_by])


# ─────────────────────────────────────────────────────────────────────────────
# CAZARI
# ─────────────────────────────────────────────────────────────────────────────

class Accommodation(Base):
    """Cazare (pensiune, apartament, etc.) unde sunt cazati muncitorii"""
    __tablename__ = "accommodations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(200), nullable=False)
    address = Column(String(500), nullable=True)
    capacity = Column(Integer, nullable=True)  # numar maxim persoane
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    assignments = relationship("AccommodationAssignment", back_populates="accommodation", cascade="all, delete-orphan")


class AccommodationAssignment(Base):
    """Repartizare muncitor la o cazare"""
    __tablename__ = "accommodation_assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    accommodation_id = Column(String(36), ForeignKey("accommodations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    assigned_from = Column(Date, nullable=True)
    assigned_until = Column(Date, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    accommodation = relationship("Accommodation", back_populates="assignments")
    user = relationship("User", foreign_keys=[user_id])

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    site_id = Column(String(36), ForeignKey("construction_sites.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    category = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="RON")
    date = Column(Date, nullable=False)
    description = Column(Text, nullable=True)
    document_url = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ─────────────────────────────────────────────────────────────────────────────
# ALERTS / AVIZIER DIGITAL
# ─────────────────────────────────────────────────────────────────────────────

class Alert(Base):
    """Admin alerts broadcasted to employees"""
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    
    message = Column(Text, nullable=False)
    target_type = Column(String(20), nullable=False) # 'ALL', 'SITE', 'TEAM', 'USER'
    target_id = Column(String(36), nullable=True) # ID of site, team, or user. Null if ALL.
    
    author_id = Column(String(36), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    organization = relationship("Organization")
    author = relationship("Admin", foreign_keys=[author_id])

class AlertAcknowledgement(Base):
    """Tracks which user has seen/acknowledged which alert"""
    __tablename__ = "alert_acknowledgements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    alert_id = Column(String(36), ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    acknowledged_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    alert = relationship("Alert")
    user = relationship("User", foreign_keys=[user_id])


# =============================================================================
# MODULE TRANSPORT — FOI DE PARCURS
# =============================================================================

class TripLog(Base):
    """
    Foaie de Parcurs — echivalentul foii de pontaj, dar pentru vehicule.
    Creat de admin sau de șofer (mobil). GPS traseul stocat în TripGPSPoint.
    """
    __tablename__ = "trip_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)

    # Vehicul și șofer
    vehicle_id = Column(String(36), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    driver_id  = Column(String(36), ForeignKey("users.id",    ondelete="SET NULL"), nullable=True)

    # Destinație (opțional — poate fi un șantier existent)
    site_id    = Column(String(36), ForeignKey("construction_sites.id", ondelete="SET NULL"), nullable=True)

    # Date generale
    date        = Column(Date, nullable=False, default=date.today)
    status      = Column(String(20), nullable=False, default="in_progress")
    # Valori: in_progress | completed | cancelled | approved | rejected

    # Timpi
    start_time  = Column(DateTime, nullable=True)
    end_time    = Column(DateTime, nullable=True)

    # Locații (text + coordonate)
    start_address   = Column(String(500), nullable=True)
    start_lat       = Column(Float, nullable=True)
    start_lng       = Column(Float, nullable=True)

    end_address     = Column(String(500), nullable=True)
    end_lat         = Column(Float, nullable=True)
    end_lng         = Column(Float, nullable=True)

    # Odometru (km introduși manual de șofer)
    start_odometer  = Column(Float, nullable=True)   # km la plecare
    end_odometer    = Column(Float, nullable=True)   # km la sosire
    distance_km     = Column(Float, nullable=True)   # calculat automat

    # Scopul deplasării
    purpose_category = Column(String(50), nullable=True)
    # Valori: transport_materiale | deplasare_personal | service | livrare | alte
    purpose_notes    = Column(Text, nullable=True)

    # ── Program transport (snapshot din org la momentul creării) ────────────
    scheduled_start_time = Column(String(5), nullable=True)  # ex: "06:00"
    scheduled_end_time   = Column(String(5), nullable=True)  # ex: "20:00"
    # True dacă drumul a fost pornit/oprit în afara programului
    out_of_schedule      = Column(Boolean, default=False, nullable=True)
    out_of_schedule_note = Column(Text, nullable=True)        # detalii (de ce e în afara programului)

    # Validare admin
    approved_by_id  = Column(String(36), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    approved_at     = Column(DateTime, nullable=True)
    rejection_note  = Column(Text, nullable=True)

    # Cine a creat foaia
    created_by_admin_id = Column(String(36), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)

    notes       = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    organization = relationship("Organization")
    vehicle      = relationship("Vehicle")
    driver       = relationship("User", foreign_keys=[driver_id])
    site         = relationship("ConstructionSite")
    approved_by  = relationship("Admin", foreign_keys=[approved_by_id])
    gps_points   = relationship("TripGPSPoint", back_populates="trip", order_by="TripGPSPoint.timestamp", cascade="all, delete-orphan")


class TripGPSPoint(Base):
    """
    Puncte GPS înregistrate pe durata unui drum.
    Trimise batch de la aplicația mobilă a șoferului.
    """
    __tablename__ = "trip_gps_points"

    id          = Column(String(36), primary_key=True, default=generate_uuid)
    trip_id     = Column(String(36), ForeignKey("trip_logs.id", ondelete="CASCADE"), nullable=False)

    latitude    = Column(Float, nullable=False)
    longitude   = Column(Float, nullable=False)
    speed_kmh   = Column(Float, nullable=True)      # viteza în acel moment
    accuracy_m  = Column(Float, nullable=True)      # acuratețe GPS (metri)
    altitude_m  = Column(Float, nullable=True)      # altitudine (opțional)
    timestamp   = Column(DateTime, nullable=False)  # momentul înregistrării

    # Relationships
    trip = relationship("TripLog", back_populates="gps_points")


# ══════════════════════════════════════════════════════════════════════════════
# WORK ORDERS (Comenzi de Lucru) — Modul B2B
# ══════════════════════════════════════════════════════════════════════════════
class WorkOrder(Base):
    """Work Orders — comenzi de lucru B2B trimise clienților pentru confirmare"""
    __tablename__ = "work_orders"

    id              = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)

    # Token unic pentru link-ul public (fără autentificare)
    token           = Column(String(64), unique=True, nullable=False, index=True)

    # Titlu și date generale
    title           = Column(String(255), nullable=False)
    notes           = Column(Text, nullable=True)           # Note interne
    start_date      = Column(Date, nullable=True)           # Data de start planificată
    start_time      = Column(String(5), nullable=True)      # HH:MM ora de start (ex: "07:00")
    deadline_date   = Column(Date, nullable=True)           # Termen limită

    # ── Locație ──────────────────────────────────────────────────────────────
    site_id              = Column(String(36), ForeignKey("construction_sites.id", ondelete="SET NULL"), nullable=True)
    site_address         = Column(Text, nullable=True)           # Adresă ad-hoc dacă nu e șantier ales
    site_latitude        = Column(Float, nullable=True)          # GPS lat (adresa manuala)
    site_longitude       = Column(Float, nullable=True)          # GPS lon (adresa manuala)
    site_geofence_radius = Column(Integer, default=100, nullable=True)  # Raza geofence (m)

    # ── Client ───────────────────────────────────────────────────────────────
    client_id       = Column(String(36), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    client_name     = Column(String(255), nullable=True)    # Nume client (ad-hoc sau cache)
    client_email    = Column(String(255), nullable=True)    # Email la care se trimite link-ul
    client_phone    = Column(String(50), nullable=True)

    # ── Conținut comandă (JSON arrays) ───────────────────────────────────────
    # requirements: [{"description": "...", "category": "...", "qty": "..."}]
    requirements    = Column(JSON, default=list, nullable=False)
    # materials: [{"name": "...", "quantity": "...", "unit": "..."}]
    materials           = Column(JSON, default=list, nullable=False)
    # materials_consumed: [{"name": "...", "quantity": "...", "unit": "...", "note": "..."}] — ce s-a folosit efectiv
    materials_consumed  = Column(JSON, default=list, nullable=False)
    # volumes: [{"label": "...", "quantity": "...", "unit": "...", "price": "..."}]
    volumes             = Column(JSON, default=list, nullable=False)

    # ── Status & Workflow ─────────────────────────────────────────────────────
    # draft | sent | confirmed | in_progress | completed | cancelled
    status          = Column(String(50), default="draft", nullable=False, index=True)

    # ── Confirmare client ─────────────────────────────────────────────────────
    confirmed_at        = Column(DateTime, nullable=True)
    confirmed_by_name   = Column(String(255), nullable=True)
    confirmed_ip        = Column(String(45), nullable=True)
    client_signature    = Column(Text, nullable=True)   # Base64 PNG semnătură client

    # ── PDF ───────────────────────────────────────────────────────────────────
    pdf_path        = Column(String(500), nullable=True)

    # ── Note Acces (cod intrare, etaj, apartament) — vizibile echipei, nu clientului ──
    access_notes    = Column(Text, nullable=True)

    # ── Meta ──────────────────────────────────────────────────────────────────
    created_by      = Column(String(36), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # ── Alocare Echipa si Vehicul ─────────────────────────────────────────────
    assigned_team_id    = Column(String(36), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    assigned_vehicle_id = Column(String(36), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)

    # ── Cantitati / Specificatii lucrare ────────────────────────────────────
    # volumes: [{label, quantity, unit, price}] — specificatii estimate
    # materials: [{name, quantity, unit}] — materiale estimate
    # materials_consumed: [{name, quantity, unit, note}] — materiale reale la finalizare

    # ── Workflow acceptare comanda ────────────────────────────────────────────
    # Seful de echipa accepta oficial
    team_leader_accepted_at     = Column(DateTime, nullable=True)
    team_leader_accepted_by_id  = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # ── Confirmare sef echipa dupa finalizare (optional) ─────────────────────
    team_leader_confirmed_at    = Column(DateTime, nullable=True)
    team_leader_confirmed_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    team_leader_confirmation_note = Column(Text, nullable=True)

    # ── Poze obligatorii ─────────────────────────────────────────────────────
    min_photos_required = Column(Integer, default=2, nullable=False)

    # ── GPS Sosire/Plecare (snapshot la check-in/out) ────────────────────────
    checkin_at          = Column(DateTime, nullable=True)     # Prima sosire echipa
    checkin_lat         = Column(Float, nullable=True)
    checkin_lng         = Column(Float, nullable=True)
    checkout_at         = Column(DateTime, nullable=True)     # Ultima plecare echipa
    checkout_lat        = Column(Float, nullable=True)
    checkout_lng        = Column(Float, nullable=True)

    # Relationships
    organization    = relationship("Organization")
    site            = relationship("ConstructionSite")
    client          = relationship("Client")
    assigned_team   = relationship("Team", foreign_keys=[assigned_team_id])
    assigned_vehicle = relationship("Vehicle", foreign_keys=[assigned_vehicle_id])
    team_leader_acceptor = relationship("User", foreign_keys=[team_leader_accepted_by_id])
    team_leader_confirmer = relationship("User", foreign_keys=[team_leader_confirmed_by_id])


# ── WorkOrder Acknowledgement ────────────────────────────────────────────────
class WorkOrderAcknowledgement(Base):
    """Tracks who acknowledged (took note of) a work order command.
    Both team leader (official accept) and each worker (am luat la cunostinta)."""
    __tablename__ = "work_order_acknowledgements"

    id              = Column(String(36), primary_key=True, default=generate_uuid)
    work_order_id   = Column(String(36), ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False)
    user_id         = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role            = Column(String(20), nullable=False)  # 'team_leader' | 'worker'
    acknowledged_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    work_order = relationship("WorkOrder")
    user       = relationship("User")


# ── WorkOrder Check-In / Check-Out ──────────────────────────────────────────
class WorkOrderCheckin(Base):
    """GPS check-in and check-out for each worker on a work order."""
    __tablename__ = "work_order_checkins"

    id              = Column(String(36), primary_key=True, default=generate_uuid)
    work_order_id   = Column(String(36), ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False)
    user_id         = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    checkin_at      = Column(DateTime, nullable=False)
    checkin_lat     = Column(Float, nullable=True)
    checkin_lng     = Column(Float, nullable=True)
    checkin_address = Column(Text, nullable=True)         # Adresa geocodata
    gps_match       = Column(Boolean, nullable=True)      # True daca GPS corespunde cu adresa comenzii

    checkout_at     = Column(DateTime, nullable=True)
    checkout_lat    = Column(Float, nullable=True)
    checkout_lng    = Column(Float, nullable=True)

    # Ore lucrate calculate (checkout - checkin in minute)
    worked_minutes  = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    work_order = relationship("WorkOrder")
    user       = relationship("User")


# ── WorkOrder Photos ─────────────────────────────────────────────────────────
class WorkOrderPhoto(Base):
    """Photos uploaded by workers when closing a work order. Minimum 2 required."""
    __tablename__ = "work_order_photos"

    id              = Column(String(36), primary_key=True, default=generate_uuid)
    work_order_id   = Column(String(36), ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False)
    uploaded_by_id  = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    photo_path      = Column(String(500), nullable=False)
    thumbnail_path  = Column(String(500), nullable=True)
    description     = Column(Text, nullable=True)
    file_size       = Column(Integer, nullable=True)
    # instruction = admin la creare, internal = sef echipa, completion = muncitor -> client
    photo_type      = Column(String(20), default="completion", nullable=False)

    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    work_order  = relationship("WorkOrder")
    uploaded_by = relationship("User")


# ══════════════════════════════════════════════════════════════════════════════
# CONCEDII & ABSENȚE
# ══════════════════════════════════════════════════════════════════════════════

class LeaveRequest(Base):
    """Cerere de concediu / absență pentru un angajat."""
    __tablename__ = "leave_requests"

    id              = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id         = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # CO | CM | CFS | CNP | ABSENCE | OTHER
    leave_type  = Column(String(20), nullable=False, default="CO")
    start_date  = Column(Date, nullable=False)
    end_date    = Column(Date, nullable=False)
    work_days   = Column(Integer, nullable=False, default=0)

    # pending | approved | rejected
    status      = Column(String(20), nullable=False, default="pending")

    notes       = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)

    approved_by_id = Column(String(36), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    approved_at    = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization")
    user         = relationship("User", foreign_keys=[user_id])
    approved_by  = relationship("Admin", foreign_keys=[approved_by_id])


class LeaveBalance(Base):
    """Balanță zile concediu pe angajat pe an."""
    __tablename__ = "leave_balances"

    id              = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id         = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    year            = Column(Integer, nullable=False)
    total_co_days   = Column(Integer, nullable=False, default=21)
    used_co_days    = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization")
    user         = relationship("User", foreign_keys=[user_id])

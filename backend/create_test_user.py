from app.database import SessionLocal
from app.models import User, Role, Organization, ConstructionSite
import bcrypt

db = SessionLocal()
org = db.query(Organization).first()
if not org:
    print("No organization found.")
    exit(1)

# Find a regular role or team leader role
role = db.query(Role).filter(Role.name.ilike('%echipa%')).first()
if not role:
    role = db.query(Role).first()

# Create a test employee
emp_code = "EMP001"
user = db.query(User).filter(User.employee_code == emp_code).first()
if not user:
    salt = bcrypt.gensalt()
    pin_hash = bcrypt.hashpw("1234".encode('utf-8'), salt).decode('utf-8')
    
    # Assign to first available site to test Comenzi
    site = db.query(ConstructionSite).first()
    
    user = User(
        organization_id=org.id,
        role_id=role.id,
        employee_code=emp_code,
        pin_hash=pin_hash,
        full_name="Angajat Test",
        site_id=site.id if site else None
    )
    db.add(user)
    db.commit()
    print("Created test employee EMP001 / 1234")
else:
    salt = bcrypt.gensalt()
    user.pin_hash = bcrypt.hashpw("1234".encode('utf-8'), salt).decode('utf-8')
    db.commit()
    print("Updated test employee EMP001 / 1234")


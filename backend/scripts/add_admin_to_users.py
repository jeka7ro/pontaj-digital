import sys
import os
import uuid
import hashlib
from datetime import datetime

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Organization, Role, User, Admin

def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()

def add_admin_to_users():
    db = SessionLocal()
    
    try:
        # Check if the global organization exists
        org_name = "Platforma Centrala"
        org = db.query(Organization).filter(Organization.name == org_name).first()
        
        if not org:
            org = Organization(
                id=str(uuid.uuid4()),
                name=org_name,
                plan_tier="enterprise",
                is_active=True
            )
            db.add(org)
            db.commit()
            db.refresh(org)
        
        # Check if Super Admin role exists for this org
        role_name = "Super Administrator"
        role = db.query(Role).filter(Role.organization_id == org.id, Role.name == role_name).first()
        
        if not role:
            role = Role(
                id=str(uuid.uuid4()),
                organization_id=org.id,
                code="SUPER_ADMIN",
                name=role_name,
                is_employee=False,
                is_active=True
            )
            db.add(role)
            db.commit()
            db.refresh(role)
            
        # Get the actual admin record to sync details
        admin = db.query(Admin).filter(Admin.email == "jeka7ro@gmail.com").first()
        
        if admin:
            # Check if user already exists
            user = db.query(User).filter(User.email == admin.email).first()
            if user:
                print("User already exists in the Users table.")
            else:
                user = User(
                    id=str(uuid.uuid4()),
                    organization_id=org.id,
                    role_id=role.id,
                    employee_code="ADMIN01",
                    pin_hash=hash_pin("0000"),
                    full_name=admin.full_name,
                    email=admin.email,
                    is_active=True
                )
                db.add(user)
                db.commit()
                print("✅ Admin user successfully added to the Users list!")
        else:
            print("❌ Could not find Admin record in the database.")
            
    except Exception as e:
        db.rollback()
        print(f"❌ Error adding admin to users list: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_admin_to_users()

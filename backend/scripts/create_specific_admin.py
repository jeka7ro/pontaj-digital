import sys
import os
import uuid

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Admin

def create_admin():
    db = SessionLocal()
    email = "jeka7ro@gmail.com"
    password = "3Iunie2026!"
    full_name = "Jeka7ro Admin"
    
    print(f"👑 Creating Platform Master Admin {email}...")
    
    from app.api.admin_auth import hash_password
    def hash_pass(pwd: str):
        return hash_password(pwd)

    try:
        existing = db.query(Admin).filter(Admin.email == email).first()
        if existing:
            print(f"⚠️ Admin {email} already exists! Updating password...")
            existing.password_hash = hash_pass(password)
            existing.is_super_admin = True
            existing.role = "SUPER_ADMIN"
            db.commit()
            print("✅ Password updated successfully.")
            return
            
        admin = Admin(
            id=str(uuid.uuid4()),
            email=email,
            password_hash=hash_pass(password),
            full_name=full_name,
            role="SUPER_ADMIN",
            organization_id=None,
            is_active=True,
            is_super_admin=True
        )
        db.add(admin)
        db.commit()
        print(f"✅ Platform Master Admin '{email}' created successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating Master Admin: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()

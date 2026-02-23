"""
Seed script to create default admin user
Run this once to create the admin account
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models import Admin
import hashlib
import uuid

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def create_admin():
    db = SessionLocal()
    
    try:
        # Check if admin already exists
        existing = db.query(Admin).filter(Admin.email == "admin@test.com").first()
        if existing:
            print("✅ Admin already exists!")
            print(f"   Email: {existing.email}")
            print(f"   Name: {existing.full_name}")
            return
        
        # Create admin
        admin = Admin(
            id=str(uuid.uuid4()),
            email="admin@test.com",
            full_name="Administrator",
            password_hash=hash_password("admin123"),
            is_active=True
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print("✅ Admin created successfully!")
        print(f"   Email: admin@test.com")
        print(f"   Password: admin123")
        print(f"   ID: {admin.id}")
        
    except Exception as e:
        print(f"❌ Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()

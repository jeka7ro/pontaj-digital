import sys
import os
import uuid
from getpass import getpass

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Admin

def create_master_admin():
    db = SessionLocal()
    print("👑 Creating Platform Master Admin...")
    
    email = input("Enter Master Admin email: ").strip()
    full_name = input("Enter Master Admin Full Name: ").strip()
    
    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        def hash_pass(password: str):
            return pwd_context.hash(password)
    except ImportError:
        def hash_pass(password: str):
            from app.auth import get_password_hash
            return get_password_hash(password)

    password = getpass("Enter Master Admin password: ")
    
    try:
        existing = db.query(Admin).filter(Admin.email == email).first()
        if existing:
            print("❌ Admin with this email already exists!")
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
    create_master_admin()

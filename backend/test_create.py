import sys
import os

# Add backend directory to path
sys.path.append('/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/backend')

from dotenv import load_dotenv
load_dotenv('/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/backend/.env')

from app.database import SessionLocal
from app.models import Admin, User, Role
import uuid
import hashlib

def test_create_admin():
    db = SessionLocal()
    try:
        # Find the role Logistica
        role = db.query(Role).filter(Role.name == 'Logistica').first()
        if not role:
            print("Role Logistica not found!")
            return
            
        print(f"Found role: {role.id}, {role.name}")
        
        # Try to insert a dummy admin EXACTLY like the code does
        clean_email = "test.create@intervalle.eu"
        password = "123"
        
        new_admin = Admin(
            id=str(uuid.uuid4()),
            organization_id=role.organization_id,
            email=clean_email,
            full_name="Test Create Admin",
            password_hash=hashlib.sha256(password.encode()).hexdigest(),
            role="LOGISTICS",
            is_active=True,
            is_super_admin=False
        )
        
        print("Adding admin to session...")
        db.add(new_admin)
        
        print("Committing...")
        db.commit()
        print("Commit SUCCESS!")
        
        # Clean up
        db.delete(new_admin)
        db.commit()
        
    except Exception as e:
        db.rollback()
        print(f"Commit FAILED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_create_admin()

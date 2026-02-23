"""
Database initialization script
Creates tables and seeds initial data
"""
from app.database import engine, Base
from app.models import Organization, Role, User
from app.auth import hash_pin
from sqlalchemy.orm import Session
import uuid

def init_db():
    """Initialize database with tables and seed data"""
    print("🗄️  Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created!")
    
    # Seed data
    print("🌱 Seeding initial data...")
    db = Session(bind=engine)
    
    try:
        # Create organization
        org = Organization(
            id=str(uuid.uuid4()),
            name="Demo Construction Company",
            is_active=True
        )
        db.add(org)
        db.flush()
        
        # Create roles
        roles = [
            Role(id=str(uuid.uuid4()), organization_id=org.id, code="SUPER_ADMIN", name="Super Administrator", is_employee=False),
            Role(id=str(uuid.uuid4()), organization_id=org.id, code="ADMIN", name="Administrator", is_employee=False),
            Role(id=str(uuid.uuid4()), organization_id=org.id, code="SITE_MANAGER", name="Șef Șantier", is_employee=True),
            Role(id=str(uuid.uuid4()), organization_id=org.id, code="TEAM_LEAD", name="Șef Echipă", is_employee=True),
            Role(id=str(uuid.uuid4()), organization_id=org.id, code="WORKER", name="Muncitor", is_employee=True),
        ]
        db.add_all(roles)
        db.flush()
        
        # Create demo users
        worker_role = next(r for r in roles if r.code == "WORKER")
        admin_role = next(r for r in roles if r.code == "ADMIN")
        
        users = [
            User(
                id=str(uuid.uuid4()),
                organization_id=org.id,
                role_id=worker_role.id,
                full_name="Ion Popescu",
                employee_code="EMP001",
                pin_hash=hash_pin("1234"),
                is_active=True
            ),
            User(
                id=str(uuid.uuid4()),
                organization_id=org.id,
                role_id=admin_role.id,
                full_name="Admin User",
                employee_code="ADMIN",
                pin_hash=hash_pin("0000"),
                is_active=True
            ),
        ]
        db.add_all(users)
        
        db.commit()
        print("✅ Seed data created!")
        print("\n📝 Demo users:")
        print("   Worker: EMP001 / PIN: 1234")
        print("   Admin:  ADMIN  / PIN: 0000")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding data: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_db()

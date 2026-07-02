#!/usr/bin/env python3
"""
Fix admin authentication issues:
1. Activate all inactive admin accounts
2. Fix authentication error codes
"""
import sys
import os
sys.path.insert(0, '/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/backend')

def fix_inactive_admins():
    """Activate all inactive admin accounts"""
    try:
        from app.database import SessionLocal
        from app.models import Admin, Organization
        import uuid
        
        db = SessionLocal()
        
        # Check if any admins exist
        admins = db.query(Admin).all()
        print(f"\nFound {len(admins)} admin(s) in database:")
        for admin in admins:
            print(f"  - {admin.email}: active={admin.is_active}, role={admin.role}")
        
        # Activate all inactive admins
        inactive_admins = db.query(Admin).filter(Admin.is_active == False).all()
        if inactive_admins:
            print(f"\n⚠️  Found {len(inactive_admins)} INACTIVE admin(s). Activating...")
            for admin in inactive_admins:
                admin.is_active = True
                print(f"  ✅ Activated: {admin.email}")
            db.commit()
        else:
            print("\n✅ All admins are already active")
        
        # If no admins exist, create a default one
        if len(admins) == 0:
            print("\n⚠️  No admins found. Creating default admin...")
            import hashlib
            from datetime import datetime
            
            # Get or create organization
            org = db.query(Organization).first()
            if not org:
                org = Organization(id=str(uuid.uuid4()), name="Default Organization")
                db.add(org)
                db.commit()
                print(f"  Created organization: {org.name}")
            
            # Create admin
            admin_id = str(uuid.uuid4())
            admin_email = "admin@pontaj.ro"
            admin_password = "admin123"
            admin_name = "System Administrator"
            
            password_hash = hashlib.sha256(admin_password.encode()).hexdigest()
            
            new_admin = Admin(
                id=admin_id,
                email=admin_email,
                password_hash=password_hash,
                full_name=admin_name,
                role="ADMIN",
                organization_id=org.id,
                is_active=True,
                is_super_admin=True,
                created_at=datetime.utcnow()
            )
            db.add(new_admin)
            db.commit()
            print(f"  ✅ Created admin: {admin_email}")
            print(f"  Password: {admin_password}")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Error fixing admins: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("ADMIN AUTHENTICATION FIX")
    print("=" * 60)
    
    if fix_inactive_admins():
        print("\n✅ Admin accounts have been fixed!")
        print("\nNow implement the backend fix:")
        print("  1. Update admin_auth.py to change 400 to 401")
        print("  2. Restart the backend server")
    else:
        print("\n❌ Failed to fix admin accounts")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

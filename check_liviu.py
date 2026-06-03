import os, sys
from dotenv import load_dotenv
load_dotenv('backend/.env')
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))
from app.database import SessionLocal
from app.models import Admin

db = SessionLocal()
admin = db.query(Admin).filter(Admin.email == 'l.radutiu@intervallegroupsolar.eu').first()
if admin:
    print(f"ADMIN: {admin.full_name}, email: {admin.email}, active: {admin.is_active}, role: {admin.role}")
    print(f"password_hash: {admin.password_hash[:20]}...")
else:
    print("Admin NOT FOUND with this email!")
    # Try partial match
    all_admins = db.query(Admin).all()
    for a in all_admins:
        if 'radut' in a.email.lower() or 'liviu' in a.full_name.lower():
            print(f"  Found similar: {a.full_name}, email: {a.email}, active: {a.is_active}")
db.close()

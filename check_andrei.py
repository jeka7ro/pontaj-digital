import os, sys
from dotenv import load_dotenv
load_dotenv('backend/.env')
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))
from app.database import SessionLocal
from app.models import User, Admin

db = SessionLocal()
# Check all Andrei
users = db.query(User).filter(User.full_name.ilike('%andrei%')).all()
for u in users:
    print(f"USER: {u.full_name}, code: {u.employee_code}, active: {u.is_active}, role_id: {u.role_id}")

admins = db.query(Admin).filter(Admin.full_name.ilike('%andrei%')).all()
for a in admins:
    print(f"ADMIN: {a.full_name}, email: {a.email}, active: {a.is_active}")
db.close()

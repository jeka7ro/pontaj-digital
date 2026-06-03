import os, sys, hashlib
from dotenv import load_dotenv
load_dotenv('backend/.env')
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))
from app.database import SessionLocal
from app.models import Admin

db = SessionLocal()
for a in db.query(Admin).filter(Admin.is_active == True).all():
    print(f"{a.full_name:30s} email: {a.email:45s} hash: {a.password_hash[:16]}... updated: {a.updated_at}")
db.close()

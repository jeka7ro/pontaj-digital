import os, sys
from dotenv import load_dotenv
load_dotenv('backend/.env')
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))
from app.database import SessionLocal
from app.models import Role
db = SessionLocal()
for r in db.query(Role).all():
    print(f"Role: {r.name}, is_employee: {r.is_employee}")

import os, sys
from dotenv import load_dotenv
load_dotenv('backend/.env')
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

from app.database import SessionLocal
from app.models import User

db = SessionLocal()
u = db.query(User).filter(User.employee_code == 'PAV03MIS').first()
if u:
    print(f"User exists: {u.full_name}, created_at: {u.created_at}")
else:
    print("User PAV03MIS does not exist.")

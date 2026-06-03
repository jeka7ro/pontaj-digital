import os, sys
from dotenv import load_dotenv
load_dotenv('backend/.env')
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

from app.database import SessionLocal
from app.models import User

db = SessionLocal()
u = db.query(User).filter(User.cnp == '5030921134215').first()
if u:
    print(f"CNP exists! User: {u.full_name}, code: {u.employee_code}")
else:
    print("CNP does not exist.")

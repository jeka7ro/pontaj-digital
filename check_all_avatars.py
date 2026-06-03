import os, sys
from dotenv import load_dotenv
load_dotenv('backend/.env')
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))
from app.database import SessionLocal
from app.models import User, Admin

db = SessionLocal()
# Check Cazmal
user = db.query(User).filter(User.email == 'jeka7ro@gmail.com').first()
if user:
    print(f"USER: {user.full_name}, avatar_path: {user.avatar_path}")
admin = db.query(Admin).filter(Admin.email == 'jeka7ro@gmail.com').first()
if admin:
    print(f"ADMIN: {admin.full_name}, email: {admin.email}")
db.close()

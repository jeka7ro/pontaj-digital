import os
from dotenv import load_dotenv
load_dotenv('backend/.env')

from backend.app.database import SessionLocal
from backend.app.models import User, Admin

db = SessionLocal()
users = db.query(User).filter(User.full_name.ilike('%Cazmal Eugeniu%')).all()
for user in users:
    print(f"User ID: {user.id}, Name: {user.full_name}, Code: {user.employee_code}, avatar_path: {user.avatar_path}")

admins = db.query(Admin).filter(Admin.full_name.ilike('%Cazmal Eugeniu%')).all()
for admin in admins:
    print(f"Admin ID: {admin.id}, Name: {admin.full_name}, Email: {admin.email}")
db.close()

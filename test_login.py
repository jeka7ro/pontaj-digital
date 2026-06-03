import os, sys
from dotenv import load_dotenv
load_dotenv('backend/.env')
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

from app.database import SessionLocal
from app.models import Admin, User
from app.api.admin_auth import verify_password

db = SessionLocal()
admin = db.query(Admin).filter(Admin.email == 'jeka7ro@gmail.com').first()
print(f"Admin found: {admin is not None}")
if admin:
    # Test valid password (the hash is a5eab443d57859cd... let's test if password hash matches what we expect for a known string. Wait, we don't know it. But we can just print it.)
    print(f"Hash: {admin.password_hash}")
    
    user_record = db.query(User).filter(User.email == admin.email).first()
    avatar_path = getattr(user_record, 'avatar_path', None) if user_record else None
    print(f"User found: {user_record is not None}, avatar: {avatar_path}")

db.close()

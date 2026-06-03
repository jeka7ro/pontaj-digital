import os
from dotenv import load_dotenv
load_dotenv('backend/.env')

from backend.app.database import SessionLocal
from backend.app.models import User

db = SessionLocal()
user = db.query(User).filter(User.employee_code == 'ADM83D').first()
if user:
    print(f"User ID: {user.id}, Name: {user.full_name}, id_card: {user.id_card_path}, avatar: {user.avatar_path}")
else:
    print("User ADM83D not found.")
db.close()

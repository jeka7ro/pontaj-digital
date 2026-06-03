import os
from dotenv import load_dotenv
load_dotenv('backend/.env')

from backend.app.database import SessionLocal
from backend.app.models import User, Role

db = SessionLocal()
users = db.query(User).join(Role).filter(Role.name == 'Angajat').all()
for u in users:
    print(f"Emp: {u.full_name}, id_card: {u.id_card_path}, avatar: {u.avatar_path}")
db.close()

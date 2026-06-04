from backend.app.database import SessionLocal
from backend.app.models import User

db = SessionLocal()
users = db.query(User).limit(5).all()
for u in users:
    print(f"Name: {u.name} | Role: {u.role} | PIN: {u.pin_code}")

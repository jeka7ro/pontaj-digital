from backend.app.database import SessionLocal
from backend.app.models import User

db = SessionLocal()
users = db.query(User).filter(User.cnp == '1801102430126').all()
for u in users:
    print(f"User ID: {u.id}, Name: {u.full_name}, Email: {u.email}")
db.close()

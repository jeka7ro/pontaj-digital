import os, sys
from dotenv import load_dotenv
load_dotenv('backend/.env')
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

from app.database import SessionLocal
from app.models import Role
from app.api.admin_users import UserCreate

db = SessionLocal()
role = db.query(Role).first()

try:
    # Mimic what frontend sends
    cleanData = {
        "employee_code": "TEST999",
        "last_name": "Test",
        "first_name": "User",
        "full_name": "Test User", # The frontend has this or maybe not?
        "pin": "1234",
        "role_id": str(role.id),
        "cnp": "5030921134215",
        "birth_date": "2003-09-21",
        "id_card_series": "KZ 755483",
        "birth_place": "Bucuresti",
        "phone": "0712345678",
        "email": None,
        "address": None,
        "avatar_path": None,
        "hourly_rate": ""
    }
    
    user_data = UserCreate(**cleanData)
    print("Pydantic validation for UserCreate SUCCESS")
except Exception as e:
    print(f"Pydantic validation FAILED: {e}")

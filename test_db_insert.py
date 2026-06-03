import os, sys
from dotenv import load_dotenv
load_dotenv('backend/.env')
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

from app.database import SessionLocal
from app.models import Role, Admin
from app.api.admin_users import UserCreate, create_user
import traceback

db = SessionLocal()
role = db.query(Role).filter(Role.name == "Muncitor").first()
admin = db.query(Admin).first()

try:
    cleanData = {
        "employee_code": "PAV03MIS",
        "last_name": "Paraschiv",
        "first_name": "Andrei",
        "role_id": str(role.id),
        "pin": "1234",
        "cnp": "5030921134215",
        "birth_date": "2003-09-21",
        "id_card_series": "KZ 755483",
        "birth_place": None,
        "phone": None,
        "email": None,
        "address": None,
        "avatar_path": None,
        "is_active": True,
        "hourly_rate": None
    }
    
    user_data = UserCreate(**cleanData)
    print("Trying to create user directly via db session...")
    user = create_user(user_data=user_data, db=db, current_admin=admin)
    print("SUCCESS: User created successfully.")
except Exception as e:
    print(f"FAILED TO CREATE USER: {e}")
    traceback.print_exc()

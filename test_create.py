import os, sys
from dotenv import load_dotenv
load_dotenv('backend/.env')
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

from app.database import SessionLocal
from app.models import Role
from app.api.admin_users import UserCreate, create_user

db = SessionLocal()
role = db.query(Role).first()

try:
    user_data = UserCreate(
        employee_code="TEST999",
        full_name="Test User",
        pin="1234",
        role_id=str(role.id),
        cnp="5030921134215",
        birth_date="2003-09-21",
        id_card_series="KZ 755483",
        birth_place="Bucuresti",
        phone="0712345678",
        email=None,
        address=None
    )
    print("Pydantic validation for UserCreate SUCCESS")
except Exception as e:
    print(f"Pydantic validation FAILED: {e}")

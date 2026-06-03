import os, sys
from dotenv import load_dotenv
load_dotenv('backend/.env')
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

from app.api.auth import LoginResponse

try:
    resp = LoginResponse(
        access_token="abc",
        refresh_token="def",
        expires_in=900,
        user={
            "id": "123",
            "full_name": "Test User",
            "employee_code": "TEST01",
            "avatar_path": None,
            "role": {
                "id": "1",
                "code": "EMP",
                "name": "Employee",
                "is_employee": True
            },
            "organization_id": "org1"
        }
    )
    print("Employee login Pydantic validation SUCCESS")
except Exception as e:
    print(f"Employee login Pydantic validation FAILED: {e}")

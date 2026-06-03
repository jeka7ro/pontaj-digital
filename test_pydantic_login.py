import os, sys
from dotenv import load_dotenv
load_dotenv('backend/.env')
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

from app.api.admin_auth import AdminResponse, Token
from datetime import datetime

try:
    token = Token(
        access_token="123",
        token_type="bearer",
        admin=AdminResponse(
            id="1",
            email="test@test.com",
            full_name="Test",
            role="ADMIN",
            is_active=True,
            is_super_admin=False,
            avatar_path=None,
            created_at=datetime.utcnow()
        )
    )
    print("Pydantic validation SUCCESS")
except Exception as e:
    print(f"Pydantic validation FAILED: {e}")

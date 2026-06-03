from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import User, Admin
import uuid

client = TestClient(app)
from app.api.deps import get_current_admin, get_current_user

def override_get_current_admin():
    db = SessionLocal()
    admin = db.query(Admin).first()
    db.close()
    return admin

app.dependency_overrides[get_current_admin] = override_get_current_admin

db = SessionLocal()
user = db.query(User).first()

if user:
    payload = {
        "last_name": "Test",
        "first_name": "User",
        "email": "test@test.com",
        "role_id": user.role_id,
        "is_active": True,
        "birth_date": "1980-01-01"
    }
    response = client.put(f"/api/admin/users/{user.id}", json=payload)
    print(response.status_code)
    print(response.text)
db.close()

import requests
from app.database import SessionLocal
from app.models import Admin
db = SessionLocal()
admin = db.query(Admin).first()
from jose import jwt
from datetime import datetime, timedelta
payload = {
    "sub": str(admin.id),
    "email": admin.email,
    "role": admin.role,
    "exp": datetime.utcnow() + timedelta(days=1)
}
token = jwt.encode(payload, "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7", algorithm="HS256")
r = requests.get("http://localhost:6001/api/admin/expenses", headers={"Authorization": f"Bearer {token}"})
print("STATUS:", r.status_code)
try:
    print(r.json())
except:
    print(r.text)

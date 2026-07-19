from app.database import SessionLocal
from app.api.vehicle_cleaning import get_cleaning_sessions

db = SessionLocal()

class DummyAdmin:
    organization_id = "aa8a486f-b60f-4f68-b929-8340370fe8a7"

try:
    sessions = get_cleaning_sessions(db=db, admin=DummyAdmin())
    print(sessions)
except Exception as e:
    print("ERROR:", str(e))

from fastapi.testclient import TestClient
from main import app
from app.database import SessionLocal
from app.models import Task, Admin

client = TestClient(app)

db = SessionLocal()
task = db.query(Task).first()
admin = db.query(Admin).first()
db.close()

# mock the dependency or just use the token if possible.
# Actually let's just do a direct db commit to see if it fails:
from app.models import Task
db = SessionLocal()
task = db.query(Task).first()
task.site_id = "f084ba68-450f-4886-9051-54016bfa097a" # a random uuid or None
try:
    db.commit()
    print("DB commit success")
except Exception as e:
    print("DB commit error:", e)
db.close()
db.close()

headers = {"Authorization": "Bearer ..."} # wait, I don't have the token.

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.database import SessionLocal
from app.models import Delivery
db = SessionLocal()
print(f"Total Deliveries Count: {db.query(Delivery).count()}")
db.close()

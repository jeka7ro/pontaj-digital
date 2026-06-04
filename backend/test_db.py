import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import Client, WorkOrder

db = SessionLocal()
print("Clients:")
for c in db.query(Client).all():
    print(c.id, c.name, c.email)

print("\nWorkOrders:")
for w in db.query(WorkOrder).all():
    print(w.id, w.title, w.client_id, w.client_name)

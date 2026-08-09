import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models import Admin, ConstructionSite, Delivery

db = SessionLocal()
admins = db.query(Admin).all()
for a in admins:
    print(f"Admin: {a.email}, Org: {a.organization_id}")

sites = db.query(ConstructionSite).all()
for s in sites:
    print(f"Site: {s.name}, Org: {s.organization_id}")

deliveries = db.query(Delivery).all()
for d in deliveries:
    print(f"Delivery: {d.materials_delivered}, Org: {d.organization_id}, Site: {d.site_id}")

db.close()

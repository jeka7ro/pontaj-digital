import sys
import os
from datetime import date, timedelta
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models import Delivery, ConstructionSite

db = SessionLocal()
site = db.query(ConstructionSite).first()

if site:
    for i in range(5):
        d = Delivery(
            site_id=site.id,
            organization_id=site.organization_id,
            delivery_date=date.today() - timedelta(days=i),
            materials_delivered=f"Materiale constructii test {i+1} (Ciment, Fier, Nisip)"
        )
        db.add(d)

    db.commit()
    print("Test data inserted")
else:
    print("No construction site found to attach deliveries to")

db.close()

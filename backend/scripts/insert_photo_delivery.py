import sys
import os
from datetime import date, timedelta
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models import Delivery, ConstructionSite

db = SessionLocal()
site = db.query(ConstructionSite).first()

if site:
    # Add a complete test entry with a photo
    d = Delivery(
        site_id=site.id,
        organization_id=site.organization_id,
        delivery_date=date.today(),
        materials_delivered="Livrare Completă de Test (Cu Poză Atașată): 10 Paleți Ciment, 5 Burlane",
        photo_url="https://images.unsplash.com/photo-1541888081628-912a7bd2c75a?q=80&w=600&auto=format&fit=crop"
    )
    db.add(d)

    db.commit()
    print("Test data with photo inserted")
else:
    print("No construction site found")

db.close()

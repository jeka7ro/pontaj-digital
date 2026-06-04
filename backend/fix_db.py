import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import Client

db = SessionLocal()
cl = db.query(Client).filter(Client.name == 'Eugen').first()
if cl:
    if cl.email == '90900':
        cl.phone = '90900'
        cl.email = None
    db.commit()
    print("Fixed Client Eugen")

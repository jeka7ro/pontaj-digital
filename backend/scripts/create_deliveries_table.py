import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import engine, Base
from app.models import Delivery

print("Creating deliveries table...")
Base.metadata.create_all(bind=engine, tables=[Delivery.__table__])
print("Done!")

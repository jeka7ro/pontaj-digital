import os
import sys

# Add the parent directory to sys.path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import engine, Base
from app.models import VehicleFuelEntry, VehicleDailyKm

def init_fleet_tables():
    print("Creating fleet tables...")
    VehicleFuelEntry.__table__.create(engine, checkfirst=True)
    VehicleDailyKm.__table__.create(engine, checkfirst=True)
    print("Done!")

if __name__ == "__main__":
    init_fleet_tables()

import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, Base
from app.models import *

from sqlalchemy import text

def create_tables():
    print("🗄️  Creating empty database tables for SaaS...")
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS saas_app"))
            conn.commit()
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully.")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")

if __name__ == "__main__":
    create_tables()

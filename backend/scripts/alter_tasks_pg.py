from sqlalchemy import create_engine, text
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from app.config import settings

engine = create_engine(settings.DATABASE_URL)

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE tasks ADD COLUMN start_time TIMESTAMP"))
        print("Added start_time")
    except Exception as e:
        print("start_time error:", e)
        
    try:
        conn.execute(text("ALTER TABLE tasks ADD COLUMN end_time TIMESTAMP"))
        print("Added end_time")
    except Exception as e:
        print("end_time error:", e)
        
    conn.commit()

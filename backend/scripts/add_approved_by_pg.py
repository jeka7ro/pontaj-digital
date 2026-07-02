import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import SessionLocal

def run():
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE leave_requests ADD COLUMN approved_by_id VARCHAR(36)"))
        print("Added approved_by_id")
    except Exception as e:
        print("approved_by_id error:", e)
        db.rollback()
        
    try:
        db.execute(text("ALTER TABLE leave_requests ADD COLUMN approved_by_name VARCHAR(255)"))
        print("Added approved_by_name")
    except Exception as e:
        print("approved_by_name error:", e)
        db.rollback()

    db.commit()
    db.close()

if __name__ == "__main__":
    run()

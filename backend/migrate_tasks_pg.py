from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN recurrence_end_date DATE"))
            print("Added recurrence_end_date")
        except Exception as e:
            pass
            
        try:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN deleted_dates JSONB"))
            print("Added deleted_dates")
        except Exception as e:
            pass

        try:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN site_id VARCHAR(36) REFERENCES sites(id) ON DELETE SET NULL"))
            print("Added site_id")
        except Exception as e:
            print("site_id might already exist:", e)
            
        conn.commit()

if __name__ == "__main__":
    migrate()

if __name__ == "__main__":
    migrate()

from sqlalchemy import text
from app.database import engine

with engine.connect() as conn:
    conn.execute(text("COMMIT")) # ensure no active transaction
    try:
        conn.execute(text("ALTER TABLE tasks ADD COLUMN site_id VARCHAR(36) REFERENCES sites(id) ON DELETE SET NULL"))
        conn.commit()
        print("site_id added successfully!")
    except Exception as e:
        print("Error:", e)

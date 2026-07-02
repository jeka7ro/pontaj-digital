from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text('ALTER TABLE complaints ADD COLUMN photo_url VARCHAR(500);'))
        conn.commit()
        print("Column added successfully!")
    except Exception as e:
        print("Error:", e)

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

with engine.connect() as conn:
    conn.execute(text("UPDATE warehouse_transactions SET attachment_url = REPLACE(attachment_url, '/uploads/', '/api/uploads/') WHERE attachment_url LIKE '/uploads/%';"))
    conn.commit()
    print("Updated URLs successfully.")

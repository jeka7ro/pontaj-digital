import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///pontaj_digital.db"

engine = create_engine(DATABASE_URL)

def add_calendar_token():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE saas_app.organizations ADD COLUMN IF NOT EXISTS calendar_token VARCHAR(64) UNIQUE"))
            conn.commit()
            print("Successfully added 'calendar_token' column to 'saas_app.organizations' table.")
        except Exception as e:
            print(f"Error adding column: {e}")

if __name__ == "__main__":
    add_calendar_token()

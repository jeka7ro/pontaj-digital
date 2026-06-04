import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///pontaj_digital.db"

engine = create_engine(DATABASE_URL)

def add_color_to_teams():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE saas_app.teams ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#94a3b8'"))
            conn.commit()
            print("Successfully added 'color' column to 'saas_app.teams' table.")
        except Exception as e:
            print(f"Error adding column: {e}")

if __name__ == "__main__":
    add_color_to_teams()

import asyncio
from sqlalchemy import text
from app.database import engine
from sqlalchemy.orm import sessionmaker

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def main():
    db = SessionLocal()
    result = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='construction_sites'"))
    cols = [r[0] for r in result.fetchall()]
    print("Columns:", cols)

if __name__ == "__main__":
    main()

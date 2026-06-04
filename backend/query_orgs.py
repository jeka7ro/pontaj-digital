import asyncio
from sqlalchemy import select, create_engine
from app.database import engine
from app.models import Organization
from sqlalchemy.orm import sessionmaker

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def main():
    db = SessionLocal()
    orgs = db.query(Organization).all()
    for org in orgs:
        print(f"Name: {org.name}, Slug: {org.slug}")

if __name__ == "__main__":
    main()

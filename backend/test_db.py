import asyncio
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from app.models import User, ConstructionSite
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

print("Users:", db.query(func.count(User.id)).scalar())
print("Sites:", db.query(func.count(ConstructionSite.id)).scalar())

import sys
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from app.database import engine, SessionLocal
from app.models import Expense, ConstructionSite, User

db = SessionLocal()
admin_org_id = "8f307eb8-61d5-4dd6-be2d-209afb762506" # eugen's org id likely, or just fetch all
q = db.query(Expense, ConstructionSite.name, User.full_name).outerjoin(
    ConstructionSite, Expense.site_id == ConstructionSite.id
).outerjoin(
    User, Expense.user_id == User.id
)

results = q.order_by(Expense.date.desc(), Expense.created_at.desc()).all()
print(f"Total rows: {len(results)}")
for e, s_name, u_name in results:
    print(f"ID: {e.id}, Date: {e.date}, Category: {e.category}, Amount: {e.amount}")


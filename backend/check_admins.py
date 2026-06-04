import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

with engine.connect() as conn:
    res = conn.execute(text("SELECT email, full_name, role FROM admins")).fetchall()
    for row in res:
        print(row)

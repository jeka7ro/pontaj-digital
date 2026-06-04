import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///pontaj_digital.db"

engine = create_engine(DATABASE_URL)
inspector = inspect(engine)
print(inspector.get_table_names())

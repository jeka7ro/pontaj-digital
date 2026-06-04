import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.environ.get("DATABASE_URL")
engine = create_engine(db_url, isolation_level="AUTOCOMMIT")

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE saas_app.clients ADD COLUMN latitude FLOAT"))
        print("Added latitude")
    except Exception as e:
        print(e)
        
    try:
        conn.execute(text("ALTER TABLE saas_app.clients ADD COLUMN longitude FLOAT"))
        print("Added longitude")
    except Exception as e:
        print(e)

print("Done")

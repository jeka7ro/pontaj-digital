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
        conn.execute(text("ALTER TABLE saas_app.organizations ADD COLUMN has_long_term_sites BOOLEAN DEFAULT TRUE"))
        print("Added has_long_term_sites")
    except Exception as e:
        print(e)
        
    try:
        conn.execute(text("ALTER TABLE saas_app.organizations ADD COLUMN has_short_term_interventions BOOLEAN DEFAULT FALSE"))
        print("Added has_short_term_interventions")
    except Exception as e:
        print(e)

print("Done")

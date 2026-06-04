import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.environ.get("DATABASE_URL")
engine = create_engine(db_url, isolation_level="AUTOCOMMIT")

with engine.connect() as conn:
    conn.execute(text("UPDATE saas_app.admins SET role = 'SUPER_ADMIN', is_super_admin = true WHERE email = 'eugen7ro@gmail.com'"))
    print("Done")

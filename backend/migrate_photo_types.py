import sys, os
sys.path.append(os.getcwd())
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.environ.get("DATABASE_URL")
engine = create_engine(db_url, isolation_level="AUTOCOMMIT")
SCHEMA = "saas_app"

with engine.connect() as conn:
    # Tip poza: instruction (admin), internal (sef echipa), completion (muncitor -> client)
    try:
        conn.execute(text(f"ALTER TABLE {SCHEMA}.work_order_photos ADD COLUMN photo_type VARCHAR(20) DEFAULT 'completion'"))
        print("Added photo_type to work_order_photos")
    except Exception as e:
        print(f"Skip photo_type: {e}")

    # Note de acces (cod intrare, apartament etc.) — vizibile echipei, nu clientului
    try:
        conn.execute(text(f"ALTER TABLE {SCHEMA}.work_orders ADD COLUMN access_notes TEXT"))
        print("Added access_notes to work_orders")
    except Exception as e:
        print(f"Skip access_notes: {e}")

print("Done.")

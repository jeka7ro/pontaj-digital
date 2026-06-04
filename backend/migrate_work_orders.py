import sys, os
sys.path.append(os.getcwd())
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.environ.get("DATABASE_URL")
engine = create_engine(db_url, isolation_level="AUTOCOMMIT")

SCHEMA = "saas_app"

columns_work_orders = [
    ("assigned_team_id", "VARCHAR(36)"),
    ("assigned_vehicle_id", "VARCHAR(36)"),
    ("team_leader_accepted_at", "TIMESTAMP"),
    ("team_leader_accepted_by_id", "VARCHAR(36)"),
    ("team_leader_confirmed_at", "TIMESTAMP"),
    ("team_leader_confirmed_by_id", "VARCHAR(36)"),
    ("team_leader_confirmation_note", "TEXT"),
    ("min_photos_required", "INTEGER DEFAULT 2"),
    ("checkin_at", "TIMESTAMP"),
    ("checkin_lat", "FLOAT"),
    ("checkin_lng", "FLOAT"),
    ("checkout_at", "TIMESTAMP"),
    ("checkout_lat", "FLOAT"),
    ("checkout_lng", "FLOAT"),
]

create_ack_table = f"""
CREATE TABLE IF NOT EXISTS {SCHEMA}.work_order_acknowledgements (
    id VARCHAR(36) PRIMARY KEY,
    work_order_id VARCHAR(36) NOT NULL REFERENCES {SCHEMA}.work_orders(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES {SCHEMA}.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    acknowledged_at TIMESTAMP NOT NULL DEFAULT NOW()
);
"""

create_checkin_table = f"""
CREATE TABLE IF NOT EXISTS {SCHEMA}.work_order_checkins (
    id VARCHAR(36) PRIMARY KEY,
    work_order_id VARCHAR(36) NOT NULL REFERENCES {SCHEMA}.work_orders(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES {SCHEMA}.users(id) ON DELETE CASCADE,
    checkin_at TIMESTAMP NOT NULL,
    checkin_lat FLOAT,
    checkin_lng FLOAT,
    checkin_address TEXT,
    gps_match BOOLEAN,
    checkout_at TIMESTAMP,
    checkout_lat FLOAT,
    checkout_lng FLOAT,
    worked_minutes INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
"""

create_photos_table = f"""
CREATE TABLE IF NOT EXISTS {SCHEMA}.work_order_photos (
    id VARCHAR(36) PRIMARY KEY,
    work_order_id VARCHAR(36) NOT NULL REFERENCES {SCHEMA}.work_orders(id) ON DELETE CASCADE,
    uploaded_by_id VARCHAR(36) REFERENCES {SCHEMA}.users(id) ON DELETE SET NULL,
    photo_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500),
    description TEXT,
    file_size INTEGER,
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);
"""

with engine.connect() as conn:
    # Add columns to work_orders
    for col_name, col_def in columns_work_orders:
        try:
            conn.execute(text(f"ALTER TABLE {SCHEMA}.work_orders ADD COLUMN {col_name} {col_def}"))
            print(f"Added {col_name}")
        except Exception as e:
            print(f"Skip {col_name}: {e}")

    # Create new tables
    conn.execute(text(create_ack_table))
    print("Created work_order_acknowledgements")

    conn.execute(text(create_checkin_table))
    print("Created work_order_checkins")

    conn.execute(text(create_photos_table))
    print("Created work_order_photos")

print("Migration done.")

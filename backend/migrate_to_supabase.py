"""
Migrate all data from local SQLite to Supabase PostgreSQL using psycopg2 directly.
"""
import sqlite3
import psycopg2
import psycopg2.extras
import os

SQLITE_PATH = os.path.join(os.path.dirname(__file__), "pontaj_digital.db")
PG_DSN = "host=aws-1-eu-west-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.yiusjksmpwbajssgopef password=23Februarie! connect_timeout=15"

# Tables in dependency order
TABLES = [
    "organizations",
    "roles",
    "admins",
    "construction_sites",
    "sites",
    "teams",
    "users",
    "team_members",
    "activity_categories",
    "activities",
    "timesheets",
    "timesheet_segments",
    "timesheet_lines",
    "timesheet_photos",
    "team_daily_compositions",
    "geofence_pauses",
]

def migrate():
    print(f"📦 Source: {SQLITE_PATH}")
    
    # Connect SQLite
    sq = sqlite3.connect(SQLITE_PATH)
    sq.row_factory = sqlite3.Row
    
    # Connect PostgreSQL
    print("🔌 Connecting to Supabase...")
    pg = psycopg2.connect(PG_DSN)
    pg.autocommit = False
    cur = pg.cursor()
    
    print("✅ Connected!\n")
    
    for table in TABLES:
        try:
            rows = sq.execute(f"SELECT * FROM {table}").fetchall()
            if not rows:
                print(f"  ⏭  {table}: 0 rows (skip)")
                continue
            
            columns = rows[0].keys()
            
            # Delete existing data
            cur.execute(f"DELETE FROM {table}")
            
            # Insert each row
            for row in rows:
                vals = []
                for col in columns:
                    v = row[col]
                    # SQLite stores booleans as 0/1
                    if isinstance(v, int) and col in ('is_active', 'is_employee', 'is_approved', 'is_admin'):
                        v = bool(v)
                    vals.append(v)
                
                placeholders = ", ".join(["%s"] * len(columns))
                cols_str = ", ".join(f'"{c}"' for c in columns)
                cur.execute(f'INSERT INTO {table} ({cols_str}) VALUES ({placeholders})', vals)
            
            pg.commit()
            print(f"  ✅ {table}: {len(rows)} rows")
            
        except Exception as e:
            pg.rollback()
            print(f"  ⚠️  {table}: {e}")
    
    # Show summary
    print("\n🎉 Migration complete!")
    print("\n📝 Users migrated:")
    for row in sq.execute("SELECT employee_code, full_name FROM users WHERE is_active = 1"):
        print(f"   {row['employee_code']}: {row['full_name']}")
    
    print("\n📝 Admins migrated:")
    for row in sq.execute("SELECT email, full_name FROM admins WHERE is_active = 1"):
        print(f"   {row['email']}: {row['full_name']}")
    
    sq.close()
    cur.close()
    pg.close()

if __name__ == "__main__":
    migrate()

"""
Fix remaining migration issues: teams, team_members, timesheet_segments, timesheet_lines, geofence_pauses
"""
import sqlite3
import psycopg2

SQLITE_PATH = "pontaj_digital.db"
PG_DSN = "host=aws-1-eu-west-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.yiusjksmpwbajssgopef password=23Februarie! connect_timeout=15"

sq = sqlite3.connect(SQLITE_PATH)
sq.row_factory = sqlite3.Row
pg = psycopg2.connect(PG_DSN)
cur = pg.cursor()

# 1. Teams (now users exist)
print("Fixing teams...")
rows = sq.execute("SELECT * FROM teams").fetchall()
for row in rows:
    cols = row.keys()
    vals = [row[c] for c in cols]
    placeholders = ", ".join(["%s"] * len(cols))
    cols_str = ", ".join(f'"{c}"' for c in cols)
    try:
        cur.execute(f'INSERT INTO teams ({cols_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING', vals)
        pg.commit()
        print(f"  ✅ teams: {len(rows)} rows")
    except Exception as e:
        pg.rollback()
        print(f"  ⚠️ teams: {e}")

# 2. Team members
print("Fixing team_members...")
rows = sq.execute("SELECT * FROM team_members").fetchall()
for row in rows:
    cols = row.keys()
    vals = [row[c] for c in cols]
    placeholders = ", ".join(["%s"] * len(cols))
    cols_str = ", ".join(f'"{c}"' for c in cols)
    try:
        cur.execute(f'INSERT INTO team_members ({cols_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING', vals)
        pg.commit()
    except Exception as e:
        pg.rollback()
        print(f"  ⚠️ team_members row: {e}")
print(f"  ✅ team_members done")

# 3. Timesheet segments (boolean fix)
print("Fixing timesheet_segments...")
cur.execute("DELETE FROM timesheet_lines")
cur.execute("DELETE FROM geofence_pauses") 
cur.execute("DELETE FROM timesheet_segments")
pg.commit()

rows = sq.execute("SELECT * FROM timesheet_segments").fetchall()
for row in rows:
    cols = row.keys()
    vals = []
    for c in cols:
        v = row[c]
        if c == 'is_within_geofence':
            v = bool(v) if v is not None else None
        vals.append(v)
    placeholders = ", ".join(["%s"] * len(cols))
    cols_str = ", ".join(f'"{c}"' for c in cols)
    try:
        cur.execute(f'INSERT INTO timesheet_segments ({cols_str}) VALUES ({placeholders})', vals)
    except Exception as e:
        pg.rollback()
        print(f"  ⚠️ segment: {e}")
        continue
pg.commit()
print(f"  ✅ timesheet_segments: {len(rows)} rows")

# 4. Timesheet lines
print("Fixing timesheet_lines...")
rows = sq.execute("SELECT * FROM timesheet_lines").fetchall()
for row in rows:
    cols = row.keys()
    vals = [row[c] for c in cols]
    placeholders = ", ".join(["%s"] * len(cols))
    cols_str = ", ".join(f'"{c}"' for c in cols)
    try:
        cur.execute(f'INSERT INTO timesheet_lines ({cols_str}) VALUES ({placeholders})', vals)
    except Exception as e:
        pg.rollback()
        print(f"  ⚠️ line: {e}")
        continue
pg.commit()
print(f"  ✅ timesheet_lines: {len(rows)} rows")

# 5. Geofence pauses
print("Fixing geofence_pauses...")
rows = sq.execute("SELECT * FROM geofence_pauses").fetchall()
for row in rows:
    cols = row.keys()
    vals = [row[c] for c in cols]
    placeholders = ", ".join(["%s"] * len(cols))
    cols_str = ", ".join(f'"{c}"' for c in cols)
    try:
        cur.execute(f'INSERT INTO geofence_pauses ({cols_str}) VALUES ({placeholders})', vals)
    except Exception as e:
        pg.rollback()
        print(f"  ⚠️ pause: {e}")
        continue
pg.commit()
print(f"  ✅ geofence_pauses: {len(rows)} rows")

print("\n🎉 All fixes applied!")
sq.close()
cur.close()
pg.close()

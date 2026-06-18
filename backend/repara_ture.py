import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print("=" * 65)
print("REPARARE TURE DESCHISE - INCHIDERE LA ORA SANTIERULUI")
print("=" * 65)

# Step 1: Get all open segments with their site's work_end_time
query = text("""
    SELECT 
        seg.id as segment_id,
        ts.date,
        u.full_name AS muncitor,
        cs.name AS santier,
        cs.work_end_time,
        seg.check_in_time,
        (ts.date + cs.work_end_time) AS ora_corectata
    FROM timesheet_segments seg
    JOIN timesheets ts ON ts.id = seg.timesheet_id
    JOIN users u ON u.id = ts.owner_user_id
    JOIN construction_sites cs ON cs.id = seg.site_id
    WHERE seg.check_out_time IS NULL
      AND ts.date >= '2026-06-12'
    ORDER BY cs.name, ts.date, u.full_name
""")

rows = db.execute(query).fetchall()
print(f"\nSe repara {len(rows)} ture...\n")

repaired = 0
for r in rows:
    # Update segment: set check_out_time to site's work_end_time on that date
    db.execute(text("""
        UPDATE timesheet_segments
        SET 
            check_out_time = :ora_corectata,
            updated_at = NOW()
        WHERE id = :segment_id
          AND check_out_time IS NULL
    """), {
        "ora_corectata": r.ora_corectata,
        "segment_id": r.segment_id
    })
    repaired += 1
    print(f"  ✅ {r.muncitor} | {r.santier} | {r.date} | check_out → {str(r.ora_corectata)[:16]}")

db.commit()

print(f"\n{'='*65}")
print(f"✅ REPARAT: {repaired} ture inchise cu succes!")
print(f"{'='*65}")

# Verify: check no more open segments from June 12
verify = db.execute(text("""
    SELECT COUNT(*) as remaining
    FROM timesheet_segments seg
    JOIN timesheets ts ON ts.id = seg.timesheet_id
    WHERE seg.check_out_time IS NULL
      AND ts.date >= '2026-06-12'
""")).fetchone()
print(f"\n🔍 Verificare finala: ture inca deschise dupa 12 iunie = {verify.remaining}")
if verify.remaining == 0:
    print("✅ PERFECT - toate turele au fost inchise!")
else:
    print(f"⚠️  Atentie: mai sunt {verify.remaining} ture deschise (fara santier setat pe segment)")

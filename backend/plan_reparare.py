import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print("=" * 75)
print("LISTA COMPLETA - MUNCITORI / SANTIERE / ORA CORECTATA PROPUSA")
print("=" * 75)

query = text("""
    SELECT 
        ts.date,
        u.full_name AS muncitor,
        cs.name AS santier,
        cs.work_end_time AS ora_sfarsit_santier,
        seg.check_in_time,
        (ts.date + cs.work_end_time) AS ora_corectata_propusa
    FROM timesheet_segments seg
    JOIN timesheets ts ON ts.id = seg.timesheet_id
    JOIN users u ON u.id = ts.owner_user_id
    JOIN construction_sites cs ON cs.id = seg.site_id
    WHERE seg.check_out_time IS NULL
      AND ts.date >= '2026-06-12'
    ORDER BY cs.name, ts.date ASC, u.full_name
""")

results = db.execute(query).fetchall()

if not results:
    print("\n✅ NU s-au gasit ture deschise!")
else:
    current_site = None
    for r in results:
        if r.santier != current_site:
            print(f"\n🏗️  SANTIER: {r.santier} | Program sfarsit: {r.ora_sfarsit_santier}")
            print(f"   {'Muncitor':<35} {'Data':<12} {'Check-in':<18} {'Ora corectata'}")
            print(f"   {'-'*35} {'-'*12} {'-'*18} {'-'*15}")
            current_site = r.santier
        ora_propusa = str(r.ora_corectata_propusa)[:16] if r.ora_corectata_propusa else "NECUNOSCUT"
        print(f"   {r.muncitor:<35} {str(r.date):<12} {str(r.check_in_time)[:16]:<18} {ora_propusa}")

# Also check if any segments have no site
no_site_q = text("""
    SELECT 
        ts.date, u.full_name AS muncitor, seg.check_in_time
    FROM timesheet_segments seg
    JOIN timesheets ts ON ts.id = seg.timesheet_id
    JOIN users u ON u.id = ts.owner_user_id
    WHERE seg.check_out_time IS NULL
      AND ts.date >= '2026-06-12'
      AND seg.site_id IS NULL
    ORDER BY ts.date, u.full_name
""")
no_site = db.execute(no_site_q).fetchall()
if no_site:
    print(f"\n⚠️  MUNCITORI FARA SANTIER SETAT PE SEGMENT ({len(no_site)}) - NU pot fi corectati automat:")
    for r in no_site:
        print(f"   {r.muncitor} | {r.date} | {str(r.check_in_time)[:16]}")

total_q = text("""
    SELECT COUNT(*) as total
    FROM timesheet_segments seg
    JOIN timesheets ts ON ts.id = seg.timesheet_id
    WHERE seg.check_out_time IS NULL AND ts.date >= '2026-06-12'
""")
t = db.execute(total_q).fetchone()
print(f"\n{'='*75}")
print(f"TOTAL TURE DE REPARAT: {t.total}")
print(f"{'='*75}")

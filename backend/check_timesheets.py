from database import SessionLocal
from models import Timesheet
from sqlalchemy import text

db = SessionLocal()
results = db.execute(text("SELECT id, start_time, end_time, hours_worked, date FROM timesheets WHERE hours_worked > 14 ORDER BY hours_worked DESC LIMIT 10")).fetchall()
print("Anomalous timesheets (>14h):")
for r in results:
    print(f"ID: {r.id}, Date: {r.date}, Start: {r.start_time}, End: {r.end_time}, Hours: {r.hours_worked}")

open_shifts = db.execute(text("SELECT id, start_time, date FROM timesheets WHERE end_time IS NULL")).fetchall()
print(f"\nCurrently open shifts: {len(open_shifts)}")
for o in open_shifts[:5]:
    print(f"ID: {o.id}, Date: {o.date}, Start: {o.start_time}")

import sys
import os

# Ensure backend directory is in path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from database import SessionLocal
from models import Timesheet
from sqlalchemy import text

def analyze_closing_times():
    db = SessionLocal()
    # Find typical shift lengths / end times from June 9, 10, 11
    query = text("""
        SELECT date, 
               avg(total_worked) as avg_hours, 
               min(total_worked) as min_hours, 
               max(total_worked) as max_hours,
               count(*) as total_shifts
        FROM timesheets
        WHERE end_time IS NOT NULL 
          AND total_worked > 0 
          AND total_worked < 24
          AND date <= '2026-06-11'
        GROUP BY date
        ORDER BY date DESC
        LIMIT 5;
    """)
    results = db.execute(query).fetchall()
    
    print("--- ISTORIC ZILE INAINTE DE BUG ---")
    for r in results:
        print(f"Data: {r.date} | Medie Ore: {r.avg_hours:.2f}h | Total Ture: {r.total_shifts}")

    # Also let's find the typical closing hour (e.g. 17:00, 18:00)
    query_hours = text("""
        SELECT extract(hour from end_time) as close_hour, count(*) as count
        FROM timesheets
        WHERE end_time IS NOT NULL 
          AND total_worked > 0 
          AND date <= '2026-06-11'
        GROUP BY close_hour
        ORDER BY count DESC
        LIMIT 3;
    """)
    top_hours = db.execute(query_hours).fetchall()
    print("\n--- ORE FRECVENTE DE INCHIDERE (ISTORIC) ---")
    for h in top_hours:
        print(f"Ora: {int(h.close_hour)}:00 | Numar Ture Închise la ora asta: {h.count}")

    # Now let's see how many shifts are broken (from 12th onwards)
    query_broken = text("""
        SELECT date, count(*) as total_broken
        FROM timesheets
        WHERE end_time IS NULL OR total_worked > 24
        GROUP BY date
        ORDER BY date ASC;
    """)
    broken = db.execute(query_broken).fetchall()
    print("\n--- TURE AFECTATE DE BUG (CARE TREBUIE REPARATE) ---")
    for b in broken:
        print(f"Data: {b.date} | Ture rămase deschise/eronate: {b.total_broken}")

if __name__ == "__main__":
    analyze_closing_times()

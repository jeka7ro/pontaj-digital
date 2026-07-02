import os
from datetime import datetime, timedelta
import psycopg2

DATABASE_URL = "postgresql://postgres.yiusjksmpwbajssgopef:23Februarie!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    cur.execute("""
        SELECT 
            t.date,
            ts.check_in_time, 
            ts.check_out_time, 
            ts.break_start_time, 
            ts.break_end_time
        FROM timesheet_segments ts
        JOIN timesheets t ON ts.timesheet_id = t.id
        WHERE t.date >= '2026-06-08' AND t.date <= '2026-06-18'
    """)
    
    daily_hours = {}
    
    now = datetime.now()
    
    for row in cur.fetchall():
        day_date, cin, cout, bstart, bend = row
        
        # apply the EXACT same logic as timesheets.py
        day_end = datetime(day_date.year, day_date.month, day_date.day, 23, 59, 59)
        max_end = now if day_date == now.date() else day_end
        
        end_time = cout or max_end
        end_time = min(end_time, max_end)
        
        hours = (end_time - cin).total_seconds() / 3600
        
        if bstart:
            break_end = bend or max_end
            break_end = min(break_end, max_end)
            bh = (break_end - bstart).total_seconds() / 3600
            hours -= bh
            
        hours = max(0, hours)
        
        if day_date not in daily_hours:
            daily_hours[day_date] = 0
            
        daily_hours[day_date] += hours

    print("=== ORE ZILNICE REALE IN BAZA DE DATE ===")
    for d in sorted(daily_hours.keys()):
        print(f"{d}: {daily_hours[d]:.1f}h")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()

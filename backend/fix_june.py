import os
from datetime import datetime
import psycopg2

DATABASE_URL = "postgresql://postgres.yiusjksmpwbajssgopef:23Februarie!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Get sites schedules
    cur.execute("SELECT id, work_end_time FROM construction_sites")
    site_schedules = {row[0]: row[1] for row in cur.fetchall()}

    # Find unclosed segments in June (up to yesterday)
    today_start = datetime.now().date()
    
    cur.execute("""
        SELECT ts.id, ts.check_in_time, ts.site_id
        FROM timesheet_segments ts
        WHERE ts.check_in_time >= '2026-06-01' 
        AND ts.check_in_time < %s
        AND ts.check_out_time IS NULL
    """, (today_start,))
    
    unclosed = cur.fetchall()
    
    print(f"Am gasit {len(unclosed)} ture neinchise din luna iunie (pana ieri).")
    
    for row in unclosed:
        seg_id, cin, site_id = row
        end_time = site_schedules.get(site_id)
        
        # Determine check_out_time based on site schedule
        if end_time:
            # combine check_in date with site's end time
            cout = datetime.combine(cin.date(), end_time)
            # If check_in is somehow after end_time, just add 8 hours
            if cin >= cout:
                cout = datetime.combine(cin.date(), datetime.max.time())
        else:
            cout = datetime.combine(cin.date(), datetime.time(17, 0)) # Default 17:00 if no schedule
            
        cur.execute("""
            UPDATE timesheet_segments 
            SET check_out_time = %s 
            WHERE id = %s
        """, (cout, seg_id))
        
    conn.commit()
    print("Toate turele neinchise din zilele trecute au fost reparate/inchise.")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()

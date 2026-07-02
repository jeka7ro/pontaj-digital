import sqlite3
import json

def migrate():
    conn = sqlite3.connect('pontaj_digital.db')
    cursor = conn.cursor()
    
    cursor.execute("PRAGMA table_info(tasks)")
    columns = [info[1] for info in cursor.fetchall()]
    
    if 'recurrence_end_date' not in columns:
        cursor.execute("ALTER TABLE tasks ADD COLUMN recurrence_end_date DATE")
        print("Added recurrence_end_date column.")
        
    if 'deleted_dates' not in columns:
        cursor.execute("ALTER TABLE tasks ADD COLUMN deleted_dates JSON")
        print("Added deleted_dates column.")
        
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()

import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'pontaj_digital.db')

def upgrade():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if start_time exists
        cursor.execute("PRAGMA table_info(tasks)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'start_time' not in columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN start_time DATETIME")
            print("Added start_time column")
            
        if 'end_time' not in columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN end_time DATETIME")
            print("Added end_time column")
            
        conn.commit()
        print("Database updated successfully.")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    upgrade()

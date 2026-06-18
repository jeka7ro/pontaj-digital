import sqlite3

def run_alter():
    conn = sqlite3.connect('pontaj_digital.db')
    c = conn.cursor()

    try:
        c.execute("ALTER TABLE leave_requests ADD COLUMN approved_by_id VARCHAR(36)")
        print("Added approved_by_id to leave_requests")
    except sqlite3.OperationalError as e:
        print(f"approved_by_id: {e}")

    try:
        c.execute("ALTER TABLE leave_requests ADD COLUMN approved_by_name VARCHAR(255)")
        print("Added approved_by_name to leave_requests")
    except sqlite3.OperationalError as e:
        print(f"approved_by_name: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    run_alter()

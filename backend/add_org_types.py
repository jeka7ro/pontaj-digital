import sqlite3

def main():
    conn = sqlite3.connect('pontaj_digital.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE organizations ADD COLUMN has_long_term_sites BOOLEAN DEFAULT 1")
        print("Successfully added has_long_term_sites column.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column 'has_long_term_sites' already exists.")
        else:
            print(f"Error: {e}")

    try:
        cursor.execute("ALTER TABLE organizations ADD COLUMN has_short_term_interventions BOOLEAN DEFAULT 0")
        print("Successfully added has_short_term_interventions column.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column 'has_short_term_interventions' already exists.")
        else:
            print(f"Error: {e}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    main()

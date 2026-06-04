import sqlite3

def main():
    conn = sqlite3.connect('pontaj_digital.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE organizations ADD COLUMN timezone VARCHAR(50) DEFAULT 'auto'")
        print("Successfully added timezone column to organizations table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column 'timezone' already exists.")
        else:
            print(f"Error: {e}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    main()

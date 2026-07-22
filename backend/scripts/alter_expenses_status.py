import psycopg2
import os

db_url = "postgresql://postgres.yiusjksmpwbajssgopef:23Februarie!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    try:
        cur.execute("ALTER TABLE expenses ADD COLUMN status VARCHAR(20) DEFAULT 'achitat';")
        print("Adaugat coloana status")
    except Exception as e:
        print("Eroare la adaugare status:", e)
        conn.rollback()
        
    try:
        cur.execute("ALTER TABLE expenses ADD COLUMN partial_amount FLOAT;")
        print("Adaugat coloana partial_amount")
    except Exception as e:
        print("Eroare la adaugare partial_amount:", e)
        conn.rollback()

    conn.commit()
    cur.close()
    conn.close()
    print("Migrarea bazei de date a fost realizata cu succes.")
except Exception as e:
    print("Eroare fatala:", e)

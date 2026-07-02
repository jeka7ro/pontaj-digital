import os
import psycopg2
import hashlib

DATABASE_URL = "postgresql://postgres.yiusjksmpwbajssgopef:23Februarie!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

def check_db():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # update password for logistica@igs.com to 12345678
        new_pwd_hash = hashlib.sha256("12345678".encode()).hexdigest()
        
        cur.execute("UPDATE admins SET password_hash = %s WHERE email = 'logistica@igs.com';", (new_pwd_hash,))
        conn.commit()
        print("Password updated successfully to 12345678!")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_db()

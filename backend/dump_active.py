from app.database import engine
from sqlalchemy import text
import json

def dump_users():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, full_name, is_active FROM users;"))
        for row in res:
            print(f"Name: {row[1]}, Active: {row[2]}")

if __name__ == "__main__":
    dump_users()

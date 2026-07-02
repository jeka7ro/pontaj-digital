from app.database import engine
from sqlalchemy import text
import json

with engine.connect() as conn:
    res = conn.execute(text("""
        SELECT users.full_name, roles.name, users.is_active 
        FROM users 
        JOIN roles ON users.role_id = roles.id 
    """))
    for row in res:
        print(f"Name: {row[0]}, Role: {row[1]}, Active: {row[2]}")

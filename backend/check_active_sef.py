from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text("""
        SELECT users.full_name, roles.name, users.is_active 
        FROM users 
        JOIN roles ON users.role_id = roles.id 
        WHERE users.is_active = true AND (roles.name LIKE '%Sef%' OR roles.name LIKE '%șef%' OR roles.name LIKE '%Responsabil%');
    """))
    found = False
    for row in res:
        found = True
        print(f"User: {row[0]}, Role: {row[1]}, Active: {row[2]}")
    if not found:
        print("NO ACTIVE SEF/RESPONSABIL FOUND!")

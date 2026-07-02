from app.database import engine
from sqlalchemy import text

def check_roles():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT DISTINCT role_id FROM users;"))
        role_ids = [row[0] for row in res]
        
        roles_res = conn.execute(text("SELECT id, name FROM roles;"))
        for row in roles_res:
            print(f"Role: {row.name} (ID: {row.id}) - Used: {row.id in role_ids}")

if __name__ == "__main__":
    check_roles()

from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("TEAM LEADERS:")
    res = conn.execute(text("SELECT t.name, u.full_name, r.name, u.is_active FROM teams t JOIN users u ON t.team_leader_id = u.id JOIN roles r ON u.role_id = r.id;"))
    for row in res:
        print(row)
        

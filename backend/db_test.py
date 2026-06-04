from sqlalchemy import create_engine, text
from app.config import settings

engine = create_engine(settings.DATABASE_URL)
with engine.connect() as conn:
    print("--- ADMINS ---")
    admins = conn.execute(text("SELECT id, full_name, email, organization_id FROM saas_app.admins WHERE full_name ILIKE '%Iulian%'"))
    for row in admins:
        print(row)



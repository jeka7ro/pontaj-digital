from app.database import engine
from sqlalchemy import text

def fix_fk():
    with engine.connect() as conn:
        # First drop the constraint. The constraint name is usually tasks_site_id_fkey
        try:
            conn.execute(text("ALTER TABLE tasks DROP CONSTRAINT tasks_site_id_fkey"))
            print("Dropped old constraint")
        except Exception as e:
            print("Could not drop constraint, might not exist or have different name:", e)

        # Add the correct constraint pointing to construction_sites
        try:
            conn.execute(text("ALTER TABLE tasks ADD CONSTRAINT tasks_site_id_fkey FOREIGN KEY (site_id) REFERENCES construction_sites(id) ON DELETE SET NULL"))
            print("Added new constraint to construction_sites")
        except Exception as e:
            print("Failed to add new constraint:", e)
        
        conn.commit()

if __name__ == "__main__":
    fix_fk()

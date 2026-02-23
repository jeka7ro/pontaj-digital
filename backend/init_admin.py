"""
Admin database initialization script
Creates admin user and construction sites tables
"""
import sqlite3
import hashlib
import uuid
from datetime import datetime

DB_PATH = "pontaj_digital.db"


def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()


def init_admin_tables():
    """Create admin and construction_sites tables"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create admins table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS admins (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1 NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
    """)
    
    # Create construction_sites table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS construction_sites (
            id TEXT PRIMARY KEY,
            organization_id TEXT NOT NULL,
            name TEXT NOT NULL,
            address TEXT,
            description TEXT,
            status TEXT DEFAULT 'active' NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
        )
    """)
    
    # Create indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_construction_sites_org ON construction_sites(organization_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_construction_sites_status ON construction_sites(status)")
    
    conn.commit()
    
    # Insert default admin user: jeka7ro@gmail.com / Pontaj123!
    admin_id = str(uuid.uuid4())
    admin_email = "jeka7ro@gmail.com"
    admin_password = "Pontaj123!"
    admin_name = "Administrator"
    
    cursor.execute("SELECT id FROM admins WHERE email = ?", (admin_email,))
    if not cursor.fetchone():
        cursor.execute("""
            INSERT INTO admins (id, email, password_hash, full_name, is_active)
            VALUES (?, ?, ?, ?, 1)
        """, (admin_id, admin_email, hash_password(admin_password), admin_name))
        print(f"✅ Created admin user: {admin_email}")
    else:
        print(f"ℹ️  Admin user already exists: {admin_email}")
    
    # Get organization ID for demo sites
    cursor.execute("SELECT id FROM organizations LIMIT 1")
    org_result = cursor.fetchone()
    
    if org_result:
        org_id = org_result[0]
        
        # Insert demo construction sites
        demo_sites = [
            {
                "id": str(uuid.uuid4()),
                "name": "Șantier Rezidențial Nord",
                "address": "Str. Constructorilor nr. 45, București",
                "description": "Complex rezidențial 3 blocuri, 120 apartamente",
                "status": "active"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Centru Comercial Sud",
                "address": "Bd. Unirii nr. 78, București",
                "description": "Centru comercial 4 etaje, suprafață 5000mp",
                "status": "active"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Parc Industrial Vest",
                "address": "Șos. Industrială km 12, Ilfov",
                "description": "Hală industrială 10000mp + birouri",
                "status": "active"
            }
        ]
        
        for site in demo_sites:
            cursor.execute("SELECT id FROM construction_sites WHERE name = ?", (site["name"],))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO construction_sites (id, organization_id, name, address, description, status)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (site["id"], org_id, site["name"], site["address"], site["description"], site["status"]))
                print(f"✅ Created construction site: {site['name']}")
    
    conn.commit()
    conn.close()
    
    print("\n✅ Admin tables initialized successfully!")
    print(f"   Admin login: {admin_email} / {admin_password}")


if __name__ == "__main__":
    init_admin_tables()

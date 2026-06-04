from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from typing import Optional
import os
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

# Import routers
from app.api import (
    auth, admin_auth, admin_users, admin_sites, admin_roles, photo_upload,
    admin_reports, clockin, timesheets, teams, sites, site_photos,
    admin_teams, admin_vehicles, warehouse, admin_clients, admin_vehicle_categories,
    admin_material_requests, user_material_requests, user_warehouse, user_notifications,
    alerts, admin_complaints, admin_accommodations, admin_expenses, admin_emergencies
)

import threading
import time as _keepalive_time
import requests as _keepalive_requests

_scheduler_stop = threading.Event()

def _keepalive_loop():
    """Ping self every 14 minutes to prevent Render free tier from sleeping."""
    _keepalive_time.sleep(30)  # wait for server to fully start
    while not _scheduler_stop.is_set():
        try:
            _keepalive_requests.get(
                "https://pontaj-digital.onrender.com/api/health",
                timeout=10
            )
            print("💓 Keep-alive ping sent")
        except Exception:
            pass
        _scheduler_stop.wait(14 * 60)  # ping every 14 minutes

def _daily_clockin_loop():
    """Background thread: auto-clock-in test workers at ~08:05 Romanian time."""
    import time as time_mod
    from app.timezone import now_ro, today_ro
    last_run_date = None
    while not _scheduler_stop.is_set():
        now = now_ro()
        today = today_ro()
        # Run once per day after 08:05 Romanian time
        if now.hour >= 8 and last_run_date != today:
            try:
                from seed_test_workers import auto_clockin_today
                from app.database import SessionLocal
                from app.models import User
                db = SessionLocal()
                users = db.query(User).filter(User.employee_code.like("TEST%"), User.is_active == True).all()
                if users:
                    auto_clockin_today(db, users)
                    print(f"🤖 Auto clock-in done for {len(users)} test workers")
                db.close()
            except Exception as e:
                print(f"⚠️  Auto clock-in error: {e}")
            last_run_date = today
        _scheduler_stop.wait(60)  # check every 60s



def _run_migrations(engine):
    """Auto-add any missing columns to keep DB in sync with models."""
    from sqlalchemy import text
    migrations = [
        "ALTER TABLE construction_sites ADD COLUMN IF NOT EXISTS lunch_break_start VARCHAR(10);",
        "ALTER TABLE construction_sites ADD COLUMN IF NOT EXISTS lunch_break_end VARCHAR(10);",
        "ALTER TABLE construction_sites ADD COLUMN IF NOT EXISTS max_overtime_minutes INTEGER DEFAULT 0;",
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS chassis_number VARCHAR(100);",
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS documents JSONB;",
        """CREATE TABLE IF NOT EXISTS equipment_daily_logs (
            id VARCHAR(36) PRIMARY KEY,
            vehicle_id VARCHAR(36) NOT NULL,
            site_id VARCHAR(36),
            operator_id VARCHAR(36),
            date DATE NOT NULL,
            is_used BOOLEAN DEFAULT TRUE,
            refueled BOOLEAN DEFAULT FALSE,
            refuel_liters FLOAT DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );""",
        """CREATE TABLE IF NOT EXISTS warehouse_items (
            id VARCHAR(36) PRIMARY KEY,
            organization_id VARCHAR(36) NOT NULL,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(50) NOT NULL,
            unit VARCHAR(20) NOT NULL,
            total_quantity FLOAT DEFAULT 0.0 NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );""",
        """CREATE TABLE IF NOT EXISTS warehouse_transactions (
            id VARCHAR(36) PRIMARY KEY,
            item_id VARCHAR(36) NOT NULL,
            transaction_type VARCHAR(10) NOT NULL,
            quantity FLOAT NOT NULL,
            date DATE NOT NULL,
            operated_by_id VARCHAR(36),
            assigned_to_user_id VARCHAR(36),
            assigned_to_vehicle_id VARCHAR(36),
            site_id VARCHAR(36),
            notes TEXT,
            attachment_url VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW()
        );""",
        # Postgres migration to drop foreign key for operated_by_id if it was created
        "ALTER TABLE warehouse_transactions DROP CONSTRAINT IF EXISTS warehouse_transactions_operated_by_id_fkey;",
        "ALTER TABLE warehouse_transactions ADD COLUMN IF NOT EXISTS site_id VARCHAR(36);",
                "ALTER TABLE warehouse_transactions ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(255);",
        """CREATE TABLE IF NOT EXISTS expenses (
            id VARCHAR(36) PRIMARY KEY,
            organization_id VARCHAR(36) NOT NULL,
            site_id VARCHAR(36) NOT NULL,
            user_id VARCHAR(36),
            category VARCHAR(50) NOT NULL,
            amount FLOAT NOT NULL,
            currency VARCHAR(10) DEFAULT 'RON',
            date DATE NOT NULL,
            description TEXT,
            document_url VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );""",
        # Two-step return workflow
        "ALTER TABLE warehouse_items ADD COLUMN IF NOT EXISTS is_lost BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE warehouse_items ADD COLUMN IF NOT EXISTS pending_return BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE warehouse_items ADD COLUMN IF NOT EXISTS pending_return_at TIMESTAMP;",
        "ALTER TABLE warehouse_items ADD COLUMN IF NOT EXISTS pending_return_by_id VARCHAR(36);",
    ]
    try:
        with engine.connect() as conn:
            for sql in migrations:
                try:
                    conn.execute(text(sql))
                except Exception:
                    pass
            conn.commit()
        print("✅ DB migrations applied.")
    except Exception as e:
        print(f"⚠️  Migration warning: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — auto-create tables (needed for fresh PostgreSQL)
    from app.database import engine, Base, warmup_pool
    from app import models  # noqa: ensure all models are imported
    Base.metadata.create_all(bind=engine)
    _run_migrations(engine)
    warmup_pool()
    print("🚀 Starting Pontaj Digital API...")

    # Start daily scheduler
    # t = threading.Thread(target=_daily_clockin_loop, daemon=True)
    # t.start()
    print("📅 Daily auto-clock-in scheduler DISABLED explicitly by user")

    # Start keep-alive thread (prevents Render free tier from sleeping)
    ka = threading.Thread(target=_keepalive_loop, daemon=True)
    ka.start()
    print("💓 Keep-alive thread started (pings every 14 min)")

    yield
    # Shutdown
    _scheduler_stop.set()
    print("👋 Shutting down Pontaj Digital API...")

app = FastAPI(
    title="Pontaj Digital API",
    description="Enterprise Construction Timesheet System",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False
)

# CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:6001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api")
async def root():
    return {
        "message": "Pontaj Digital API",
        "version": "1.0.0",
        "status": "running"
    }

# Serve uploaded static files (documents, photos)
os.makedirs("uploads", exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "storage": "supabase" if os.getenv("SUPABASE_URL") else "local",
        "supabase_url": bool(os.getenv("SUPABASE_URL")),
        "supabase_key": bool(os.getenv("SUPABASE_SERVICE_KEY")),
    }

# Versiunea aplicatiei — timestamp de startup (se schimba la fiecare deploy)
_APP_START_TIME = datetime.utcnow().strftime("%Y%m%d%H%M%S")

@app.get("/api/version")
async def get_version():
    """Returneaza versiunea curenta (timestamp startup). Frontend polleaza si se reincarca automat la deploy."""
    return {"version": _APP_START_TIME}

# Reverse geocode proxy (avoids CORS issues with Nominatim from browser)
import requests as _requests
import time as _time

# Simple in-memory cache for reverse geocoding
# key: (round(lat, 3), round(lon, 3)), value: (timestamp, data_dict)
_geocode_cache = {}
_geocode_cache_lock = threading.Lock()

@app.get("/api/reverse-geocode")
def reverse_geocode(lat: float, lon: float):
    """Proxy reverse geocoding to Nominatim to avoid browser CORS"""
    key = (round(lat, 3), round(lon, 3))
    now = _time.time()
    
    # Check cache
    with _geocode_cache_lock:
        if key in _geocode_cache:
            ts, cached_data = _geocode_cache[key]
            if now - ts < 1800:  # cache for 30 minutes
                return cached_data
                
    try:
        resp = _requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"lat": lat, "lon": lon, "format": "json", "accept-language": "ro"},
            headers={"User-Agent": "PontajDigital/1.0"},
            timeout=2.0
        )
        data = resp.json()
        
        # Save to cache
        with _geocode_cache_lock:
            _geocode_cache[key] = (now, data)
            
        return data
    except Exception:
        # Fallback to cache if expired is available
        with _geocode_cache_lock:
            if key in _geocode_cache:
                return _geocode_cache[key][1]
        return {"display_name": ""}

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(admin_auth.router, prefix="/api/admin", tags=["admin"])
app.include_router(admin_users.router, prefix="/api", tags=["admin-users"])
app.include_router(admin_sites.router, prefix="/api", tags=["admin-sites"])
app.include_router(admin_roles.router, prefix="/api", tags=["admin-roles"])
app.include_router(photo_upload.router, prefix="/api", tags=["photos"])
app.include_router(admin_reports.router, prefix="/api/admin/reports", tags=["admin-reports"])
app.include_router(clockin.router, prefix="/api", tags=["clockin"])
app.include_router(timesheets.router, prefix="/api", tags=["timesheets"])
app.include_router(teams.router, prefix="/api", tags=["teams"])
app.include_router(sites.router, prefix="/api", tags=["sites"])
app.include_router(site_photos.router, prefix="/api", tags=["site-photos"])
app.include_router(admin_teams.router, prefix="/api", tags=["admin-teams"])
app.include_router(admin_vehicles.router, prefix="/api", tags=["admin-fleet"])
app.include_router(admin_vehicle_categories.router, prefix="/api/admin/fleet-categories", tags=["admin-fleet-categories"])
app.include_router(warehouse.router, prefix="/api", tags=["warehouse"])
app.include_router(admin_clients.router, prefix="/api/admin/clients", tags=["admin-clients"])
app.include_router(admin_complaints.router, prefix="/api", tags=["admin-complaints"])
app.include_router(admin_accommodations.router, prefix="/api", tags=["admin-accommodations"])
app.include_router(admin_expenses.router, prefix="/api", tags=["admin-expenses"])
app.include_router(admin_emergencies.router, prefix="/api", tags=["admin-emergencies"])
app.include_router(admin_material_requests.router, prefix="/api", tags=["admin-material-requests"])
app.include_router(user_material_requests.router, prefix="/api")
app.include_router(user_warehouse.router, prefix="/api")
app.include_router(user_notifications.router, prefix="/api")
app.include_router(alerts.router, prefix="/api", tags=["alerts"])

# ─── User: Sesizari ───────────────────────────────────────────────────────────
from fastapi import Body
from app.api.auth import get_current_user
from app.models import Complaint as ComplaintModel, User as UserModel
from app.database import get_db as _get_db

@app.post("/api/user/complaints", tags=["user-complaints"], status_code=201)
def user_submit_complaint(
    title: str = Body(...),
    content: str = Body(...),
    db=Depends(_get_db),
    current_user: UserModel = Depends(get_current_user),
):
    c = ComplaintModel(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        title=title,
        content=content,
        status="open",
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "title": c.title, "status": c.status, "created_at": str(c.created_at)}


@app.get("/api/user/complaints/unread-count", tags=["user-complaints"])
def user_complaints_unread_count(
    db=Depends(_get_db),
    current_user: UserModel = Depends(get_current_user),
):
    count = db.query(ComplaintModel).filter(
        ComplaintModel.user_id == current_user.id,
        ComplaintModel.admin_response != None,
        ComplaintModel.user_seen_response == False
    ).count()
    return {"count": count}

@app.get("/api/user/complaints", tags=["user-complaints"])

def user_list_complaints(
    db=Depends(_get_db),
    current_user: UserModel = Depends(get_current_user),
):
    complaints = db.query(ComplaintModel).filter(
        ComplaintModel.user_id == current_user.id
    ).order_by(ComplaintModel.created_at.desc()).all()

    modified = False
    for c in complaints:
        if c.admin_response and not c.user_seen_response:
            c.user_seen_response = True
            modified = True
            
    if modified:
        db.commit()

    return [
        {
            "id": c.id,
            "title": c.title,
            "content": c.content,
            "status": c.status,
            "admin_response": c.admin_response,
            "user_seen_response": c.user_seen_response,
            "responded_at": str(c.responded_at) if c.responded_at else None,
            "created_at": str(c.created_at),
        }
        for c in complaints
    ]

# ─── User: Necesar Materiale ──────────────────────────────────────────────────
from app.models import MaterialRequest as MaterialRequestModel

@app.post("/api/user/material-requests", tags=["user-material-requests"], status_code=201)
def user_submit_material_request(
    items_text: str = Body(...),
    notes: Optional[str] = Body(None),
    site_id: Optional[str] = Body(None),
    db=Depends(_get_db),
    current_user: UserModel = Depends(get_current_user),
):
    c = MaterialRequestModel(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        site_id=site_id or current_user.site_id,
        items_text=items_text,
        notes=notes,
        status="pending",
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "status": c.status, "created_at": str(c.created_at)}

@app.get("/api/user/material-requests", tags=["user-material-requests"])
def user_list_material_requests(
    db=Depends(_get_db),
    current_user: UserModel = Depends(get_current_user),
):
    requests = db.query(MaterialRequestModel).filter(
        MaterialRequestModel.user_id == current_user.id
    ).order_by(MaterialRequestModel.created_at.desc()).all()
    return [
        {
            "id": c.id,
            "items_text": c.items_text,
            "notes": c.notes,
            "status": c.status,
            "admin_response": c.admin_response,
            "responded_at": str(c.responded_at) if c.responded_at else None,
            "created_at": str(c.created_at),
        }
        for c in requests
    ]

# ─── User: Urgente ────────────────────────────────────────────────────────────
from app.models import Emergency as EmergencyModel

@app.post("/api/user/emergencies", tags=["user-emergencies"], status_code=201)
def user_submit_emergency(
    description: str = Body(...),
    severity: str = Body("high"),
    site_id: Optional[str] = Body(None),
    db=Depends(_get_db),
    current_user: UserModel = Depends(get_current_user),
):
    c = EmergencyModel(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        site_id=site_id or current_user.site_id,
        description=description,
        severity=severity,
        status="active",
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "status": c.status, "created_at": str(c.created_at)}

@app.get("/api/user/emergencies", tags=["user-emergencies"])
def user_list_emergencies(
    db=Depends(_get_db),
    current_user: UserModel = Depends(get_current_user),
):
    requests = db.query(EmergencyModel).filter(
        EmergencyModel.user_id == current_user.id
    ).order_by(EmergencyModel.created_at.desc()).all()
    return [
        {
            "id": c.id,
            "description": c.description,
            "severity": c.severity,
            "status": c.status,
            "admin_response": c.admin_response,
            "resolved_at": str(c.resolved_at) if c.resolved_at else None,
            "created_at": str(c.created_at),
        }
        for c in requests
    ]

# Serve uploaded files (ID cards, etc.)
uploads_dir = Path(__file__).parent / "uploads"
uploads_dir.mkdir(exist_ok=True)
logos_dir = uploads_dir / "logos"
logos_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


# Logo upload endpoint
from fastapi import File, UploadFile
from app.api.admin_auth import get_current_admin
from app.models import Admin
import uuid as _uuid
from app.storage import upload_file as storage_upload, get_content_type

@app.post("/api/admin/upload-logo")
async def upload_logo(file: UploadFile = File(...), current_admin: Admin = Depends(get_current_admin)):
    """Upload organization logo"""
    allowed = ('.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif')
    import os
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Format neacceptat. Acceptăm: {', '.join(allowed)}")
    
    filename = f"org_logo_{_uuid.uuid4().hex[:8]}{ext}"
    content = await file.read()
    logo_url = storage_upload(content, f"logos/{filename}", get_content_type(filename))
    
    return {"logo_url": logo_url, "message": "Logo încărcat cu succes"}

# Serve frontend static files with SPA fallback
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    # Mount static assets (JS, CSS, images, etc.)
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
    
    # Serve other static files (sw.js, workbox, icons, manifest, etc.)
    app.mount("/static-files", StaticFiles(directory=str(frontend_dist)), name="static-root")

    # SPA catch-all: serve index.html for all non-API routes
    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        from starlette.responses import FileResponse as StarletteFileResponse
        
        # Files that must never be cached (SW, index.html)
        no_cache_files = {'sw.js', 'registerSW.js', 'index.html', 'manifest.webmanifest', 'workbox-8c29f6e4.js'}
        
        # Try to serve the file directly first
        file_path = frontend_dist / full_path
        if full_path and file_path.exists() and file_path.is_file():
            headers = {}
            if full_path.split('/')[-1] in no_cache_files:
                headers = {"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache"}
            return FileResponse(str(file_path), headers=headers)
        # Otherwise serve index.html for SPA routing
        index_path = frontend_dist / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
        return {"detail": "Not found"}

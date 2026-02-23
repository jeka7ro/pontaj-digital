from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

# Import routers
from app.api import auth
from app.api import admin_auth, admin_users, admin_sites, admin_roles, photo_upload, admin_reports, timesheets, clockin, teams, sites, site_photos

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — auto-create tables (needed for fresh PostgreSQL)
    from app.database import engine, Base
    from app import models  # noqa: ensure all models are imported
    Base.metadata.create_all(bind=engine)
    print("🚀 Starting Pontaj Digital API...")
    yield
    # Shutdown
    print("👋 Shutting down Pontaj Digital API...")

app = FastAPI(
    title="Pontaj Digital API",
    description="Enterprise Construction Timesheet System",
    version="1.0.0",
    lifespan=lifespan
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

@app.get("/api/health")
async def health():
    return {"status": "healthy"}

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

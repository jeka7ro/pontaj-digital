"""
Site Photos API - Upload & list photos from construction sites
Used by Site Managers to upload daily photos; viewed by admins
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, date
from pathlib import Path
import uuid, os

from app.database import get_db
from app.models import TimesheetPhoto, Timesheet, User, ConstructionSite
from app.api.auth import get_current_user
from app.api.admin_auth import get_current_admin
from app.models import Admin
from app.storage import upload_file, delete_file, get_file_url, get_content_type

router = APIRouter(prefix="/site-photos", tags=["site-photos"])

BASE_DIR = Path(__file__).parent.parent


@router.post("/upload")
async def upload_site_photo(
    site_id: str = Form(...),
    description: str = Form(""),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a photo for the construction site — available to site managers and team leads"""
    # Validate file type
    allowed_ext = ('.jpg', '.jpeg', '.png', '.webp', '.heic')
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_ext:
        raise HTTPException(status_code=400, detail=f"Format neacceptat. Acceptăm: {', '.join(allowed_ext)}")

    # Validate site exists
    site = db.query(ConstructionSite).filter(ConstructionSite.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Șantierul nu a fost găsit")

    # Find or create today's timesheet for this user (needed for photo linkage)
    today = date.today()
    timesheet = db.query(Timesheet).filter(
        Timesheet.owner_user_id == current_user.id,
        Timesheet.date == today
    ).first()

    # Save file
    photo_id = str(uuid.uuid4())
    date_folder = today.strftime("%Y-%m-%d")
    content = await file.read()

    # Limit to 10MB
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fișierul depășește 10MB")

    filename = f"{photo_id}{ext}"
    storage_path = f"site_photos/{date_folder}/{filename}"
    
    # Upload to storage (Supabase or local)
    file_url = upload_file(content, storage_path, get_content_type(filename))

    # Create DB record
    photo = TimesheetPhoto(
        id=photo_id,
        timesheet_id=timesheet.id if timesheet else None,
        site_id=site_id,
        uploaded_by=current_user.id,
        filename=file.filename,
        file_path=storage_path,
        file_size=len(content),
        description=description or None,
        uploaded_at=datetime.utcnow()
    )

    db.add(photo)
    db.commit()
    db.refresh(photo)

    return {
        "id": photo.id,
        "file_path": storage_path,
        "url": file_url,
        "filename": file.filename,
        "uploaded_at": photo.uploaded_at.isoformat(),
        "description": photo.description
    }


@router.get("/")
def list_site_photos(
    target_date: Optional[str] = None,
    site_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List photos for a given date (defaults to today). Available to all authenticated users."""
    query_date = date.fromisoformat(target_date) if target_date else date.today()

    query = db.query(TimesheetPhoto).filter(
        TimesheetPhoto.uploaded_at >= datetime.combine(query_date, datetime.min.time()),
        TimesheetPhoto.uploaded_at < datetime.combine(query_date, datetime.max.time())
    )

    if site_id:
        query = query.filter(TimesheetPhoto.site_id == site_id)

    photos = query.order_by(TimesheetPhoto.uploaded_at.desc()).all()

    result = []
    for p in photos:
        uploader = db.query(User).filter(User.id == p.uploaded_by).first()
        site = db.query(ConstructionSite).filter(ConstructionSite.id == p.site_id).first()
        result.append({
            "id": p.id,
            "url": get_file_url(p.file_path),
            "filename": p.filename,
            "description": p.description,
            "uploaded_at": p.uploaded_at.isoformat(),
            "uploaded_by_name": uploader.full_name if uploader else "Necunoscut",
            "site_name": site.name if site else "Necunoscut",
            "site_id": p.site_id,
            "file_size": p.file_size
        })

    return {"photos": result, "total": len(result), "date": str(query_date)}


@router.get("/admin")
def admin_list_photos(
    target_date: Optional[str] = None,
    site_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Admin endpoint to list all site photos for a date"""
    query_date = date.fromisoformat(target_date) if target_date else date.today()

    query = db.query(TimesheetPhoto).filter(
        TimesheetPhoto.uploaded_at >= datetime.combine(query_date, datetime.min.time()),
        TimesheetPhoto.uploaded_at < datetime.combine(query_date, datetime.max.time())
    )

    if site_id:
        query = query.filter(TimesheetPhoto.site_id == site_id)

    photos = query.order_by(TimesheetPhoto.uploaded_at.desc()).all()

    result = []
    for p in photos:
        uploader = db.query(User).filter(User.id == p.uploaded_by).first()
        site = db.query(ConstructionSite).filter(ConstructionSite.id == p.site_id).first()
        result.append({
            "id": p.id,
            "url": get_file_url(p.file_path),
            "filename": p.filename,
            "description": p.description,
            "uploaded_at": p.uploaded_at.isoformat(),
            "uploaded_by_name": uploader.full_name if uploader else "Necunoscut",
            "site_name": site.name if site else "Necunoscut",
            "site_id": p.site_id,
            "file_size": p.file_size
        })

    return {"photos": result, "total": len(result), "date": str(query_date)}


@router.delete("/{photo_id}")
def delete_site_photo(
    photo_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a photo (only the uploader can delete)"""
    photo = db.query(TimesheetPhoto).filter(TimesheetPhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Poza nu a fost găsită")
    if photo.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Nu poți șterge pozele altcuiva")

    # Delete file from storage
    delete_file(photo.file_path)

    db.delete(photo)
    db.commit()
    return {"message": "Poză ștearsă cu succes"}

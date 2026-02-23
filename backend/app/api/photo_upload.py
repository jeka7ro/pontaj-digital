"""
Photo upload API for construction site photos
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import shutil
import io
from pathlib import Path
from PIL import Image
import hashlib

from app.database import get_db
from app.models import TimesheetPhoto, Timesheet, User
from app.api.auth import get_current_user
from app.storage import upload_file, delete_file, get_file_url, get_content_type

router = APIRouter(prefix="/timesheets", tags=["photos"])

# Configuration
MAX_IMAGE_SIZE = (1920, 1080)
THUMBNAIL_SIZE = (300, 300)
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def validate_image(file: UploadFile) -> None:
    """Validate uploaded image file"""
    # Check extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Check file size (approximate, actual check happens during save)
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )


def resize_image_bytes(image_bytes: bytes, max_size: tuple) -> bytes:
    """Resize image maintaining aspect ratio, return as bytes"""
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", optimize=True, quality=85)
            return buf.getvalue()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")


def create_thumbnail_bytes(image_bytes: bytes) -> bytes:
    """Create thumbnail from image bytes, return as bytes"""
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            img.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", optimize=True, quality=75)
            return buf.getvalue()
    except Exception as e:
        print(f"Thumbnail creation failed: {e}")
        return None


@router.post("/{timesheet_id}/photos")
async def upload_photo(
    timesheet_id: str,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a photo for a timesheet
    """
    # Validate file
    validate_image(file)
    
    # Verify timesheet exists
    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    # Generate unique filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    ext = Path(file.filename).suffix.lower()
    safe_filename = f"{timestamp}_{hashlib.md5(file.filename.encode()).hexdigest()[:8]}{ext}"
    
    # Storage paths
    storage_path = f"sites/{timesheet.site_id}/{safe_filename}"
    thumbnail_storage_path = f"sites/{timesheet.site_id}/thumbnails/{safe_filename}"
    
    try:
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Resize main image
        resized_content = resize_image_bytes(file_content, MAX_IMAGE_SIZE)
        
        # Upload main image to storage
        file_url = upload_file(resized_content, storage_path, get_content_type(safe_filename))
        
        # Create and upload thumbnail
        thumbnail_content = create_thumbnail_bytes(resized_content)
        thumbnail_url = None
        if thumbnail_content:
            thumbnail_url = upload_file(thumbnail_content, thumbnail_storage_path, "image/jpeg")
        
        # Create database record
        photo = TimesheetPhoto(
            timesheet_id=timesheet_id,
            site_id=timesheet.site_id,
            uploaded_by=current_user.id,
            filename=file.filename,
            file_path=storage_path,
            file_size=file_size,
            thumbnail_path=thumbnail_storage_path if thumbnail_content else None,
            description=description
        )
        
        db.add(photo)
        db.commit()
        db.refresh(photo)
        
        return {
            "id": photo.id,
            "filename": photo.filename,
            "file_path": file_url,
            "thumbnail_path": thumbnail_url,
            "uploaded_at": photo.uploaded_at,
            "file_size": photo.file_size
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/{timesheet_id}/photos")
def get_timesheet_photos(
    timesheet_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all photos for a timesheet
    """
    photos = db.query(TimesheetPhoto).filter(
        TimesheetPhoto.timesheet_id == timesheet_id
    ).order_by(TimesheetPhoto.uploaded_at.desc()).all()
    
    return {
        "photos": [
            {
                "id": photo.id,
                "filename": photo.filename,
                "file_path": get_file_url(photo.file_path),
                "thumbnail_path": get_file_url(photo.thumbnail_path) if photo.thumbnail_path else None,
                "uploaded_at": photo.uploaded_at,
                "file_size": photo.file_size,
                "description": photo.description,
                "uploaded_by": photo.uploaded_by
            }
            for photo in photos
        ]
    }


@router.delete("/photos/{photo_id}")
def delete_photo(
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a photo
    """
    photo = db.query(TimesheetPhoto).filter(TimesheetPhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Delete files from storage
    delete_file(photo.file_path)
    if photo.thumbnail_path:
        delete_file(photo.thumbnail_path)
    
    # Delete database record
    db.delete(photo)
    db.commit()
    
    return {"message": "Photo deleted successfully"}

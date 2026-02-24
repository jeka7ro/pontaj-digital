"""
Site Photos API — upload and list construction site photos
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import uuid, io

from app.database import get_db
from app.models import User, ConstructionSite, SitePhoto, Role, Admin
from app.api.auth import get_current_user
from app.api.admin_auth import get_current_admin
from app.storage import upload_file, get_content_type
from app.timezone import now_ro, today_ro


def get_current_user_or_admin(request: Request, db: Session = Depends(get_db)):
    """Accept either employee or admin auth token"""
    from jose import JWTError, jwt
    from app.config import settings
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        sub = payload.get("sub")
        # Try admin first (admin tokens have email in payload)
        if payload.get("email"):
            admin = db.query(Admin).filter(Admin.id == sub).first()
            if admin:
                return admin
        # Try employee
        user = db.query(User).filter(User.id == sub).first()
        if user:
            return user
    except Exception:
        pass
    raise HTTPException(status_code=401, detail="Invalid token")

router = APIRouter()


@router.post("/site-photos/upload")
async def upload_site_photo(
    site_id: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a photo from the construction site (compresses to max 1200px)"""
    site = db.query(ConstructionSite).filter(ConstructionSite.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Șantierul nu a fost găsit")
    
    contents = await file.read()
    
    # Compress image
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(contents))
        
        # Convert RGBA to RGB if needed
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
        # Resize if larger than 1200px on any side
        max_size = 1200
        if img.width > max_size or img.height > max_size:
            img.thumbnail((max_size, max_size), Image.LANCZOS)
        
        # Save compressed
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=75, optimize=True)
        contents = buf.getvalue()
    except ImportError:
        pass  # PIL not available, upload original
    
    # Upload to storage
    ext = "jpg"
    filename = f"site_photos/{site_id}/{now_ro().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}.{ext}"
    photo_url = upload_file(contents, filename, "image/jpeg")
    
    # Save record
    photo = SitePhoto(
        site_id=site_id,
        uploaded_by_user_id=current_user.id,
        photo_path=photo_url,
        description=description,
        created_at=now_ro()
    )
    db.add(photo)
    db.commit()
    
    return {
        "id": photo.id,
        "photo_path": photo.photo_path,
        "description": photo.description,
        "created_at": str(photo.created_at)
    }


@router.get("/site-photos")
def list_site_photos(
    site_id: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    current_user = Depends(get_current_user_or_admin),
    db: Session = Depends(get_db)
):
    """List site photos (admin view) with pagination"""
    query = db.query(SitePhoto).order_by(SitePhoto.created_at.desc())
    
    if site_id:
        query = query.filter(SitePhoto.site_id == site_id)
    
    total = query.count()
    photos = query.offset((page - 1) * per_page).limit(per_page).all()
    
    result = []
    for p in photos:
        site = db.query(ConstructionSite).filter(ConstructionSite.id == p.site_id).first()
        uploader = db.query(User).filter(User.id == p.uploaded_by_user_id).first()
        result.append({
            "id": p.id,
            "photo_path": p.photo_path,
            "description": p.description,
            "created_at": str(p.created_at),
            "site_name": site.name if site else "N/A",
            "site_id": p.site_id,
            "uploader_name": uploader.full_name if uploader else "N/A",
            "uploader_avatar": uploader.avatar_path if uploader else None
        })
    
    return {
        "photos": result,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }


@router.delete("/site-photos/{photo_id}")
def delete_site_photo(
    photo_id: str,
    current_user = Depends(get_current_user_or_admin),
    db: Session = Depends(get_db)
):
    """Delete a site photo (admin only)"""
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not role or role.code not in ("ADMIN", "SITE_MANAGER"):
        raise HTTPException(status_code=403, detail="Acces interzis")
    
    photo = db.query(SitePhoto).filter(SitePhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Poza nu a fost găsită")
    
    db.delete(photo)
    db.commit()
    return {"message": "Poză ștearsă"}

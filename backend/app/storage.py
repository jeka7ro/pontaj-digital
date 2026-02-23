"""
Supabase Storage helper for file uploads.
Uses httpx for direct REST API calls (no heavy SDK dependencies).
Falls back to local filesystem when SUPABASE_URL is not configured.
"""
import os
from pathlib import Path
from typing import Optional
import httpx


# Check if Supabase is configured
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Service role key for storage
STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "uploads")


def is_cloud_storage() -> bool:
    """Check if using Supabase Storage (cloud) or local filesystem"""
    return bool(SUPABASE_URL and SUPABASE_KEY)


def upload_file(file_content: bytes, path: str, content_type: str = "image/jpeg") -> str:
    """
    Upload a file and return its public URL.
    
    Args:
        file_content: Raw file bytes
        path: Storage path (e.g. "avatars/avatar_abc123.jpg")
        content_type: MIME type
    
    Returns:
        Public URL string (Supabase URL or local /uploads/ path)
    """
    if is_cloud_storage():
        # Upload to Supabase Storage via REST API
        url = f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{path}"
        headers = {
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "apikey": SUPABASE_KEY,
            "Content-Type": content_type,
            "x-upsert": "true",
        }
        try:
            response = httpx.post(url, content=file_content, headers=headers, timeout=30.0)
            response.raise_for_status()
            # Return public URL
            return f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{path}"
        except Exception as e:
            print(f"Supabase upload error: {e}")
            raise
    else:
        # Fallback to local filesystem
        local_path = Path("uploads") / path
        local_path.parent.mkdir(parents=True, exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(file_content)
        return f"/uploads/{path}"


def delete_file(path: str) -> bool:
    """
    Delete a file from storage.
    
    Args:
        path: Storage path (e.g. "avatars/avatar_abc123.jpg")
    
    Returns:
        True if successful
    """
    if is_cloud_storage():
        url = f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{path}"
        headers = {
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "apikey": SUPABASE_KEY,
        }
        try:
            response = httpx.delete(url, headers=headers, timeout=15.0)
            return response.status_code < 400
        except Exception as e:
            print(f"Supabase delete error: {e}")
            return False
    else:
        local_path = Path("uploads") / path
        if local_path.exists():
            local_path.unlink()
            return True
        return False


def get_file_url(path: str) -> str:
    """
    Get the public URL for a stored file.
    For Supabase: returns full Supabase Storage URL
    For local: returns /uploads/... path
    """
    if is_cloud_storage():
        return f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{path}"
    else:
        return f"/uploads/{path}"


def get_content_type(filename: str) -> str:
    """Determine content type from file extension"""
    ext = Path(filename).suffix.lower()
    content_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".heic": "image/heic",
    }
    return content_types.get(ext, "application/octet-stream")

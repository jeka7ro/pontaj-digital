"""
Supabase Storage helper for file uploads.
Falls back to local filesystem when SUPABASE_URL is not configured.
"""
import os
import uuid
from pathlib import Path
from typing import Optional


# Check if Supabase is configured
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Service role key for storage
STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "uploads")

_supabase_client = None


def _get_supabase():
    """Lazy init Supabase client"""
    global _supabase_client
    if _supabase_client is None and SUPABASE_URL and SUPABASE_KEY:
        from supabase import create_client
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase_client


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
    client = _get_supabase()
    
    if client:
        # Upload to Supabase Storage
        try:
            client.storage.from_(STORAGE_BUCKET).upload(
                path=path,
                file=file_content,
                file_options={"content-type": content_type, "upsert": "true"}
            )
            # Return public URL
            public_url = client.storage.from_(STORAGE_BUCKET).get_public_url(path)
            return public_url
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
    client = _get_supabase()
    
    if client:
        try:
            client.storage.from_(STORAGE_BUCKET).remove([path])
            return True
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
    client = _get_supabase()
    
    if client:
        return client.storage.from_(STORAGE_BUCKET).get_public_url(path)
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

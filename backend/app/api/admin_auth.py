from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from jose import JWTError, jwt
import hashlib
import os

from app.database import get_db
from app.models import Admin, User
from app.config import settings

router = APIRouter()

# JWT Settings
SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login")


# Pydantic Models
class AdminLogin(BaseModel):
    email: EmailStr
    password: str


from typing import Optional

class AdminResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    is_super_admin: bool = False
    avatar_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    admin: AdminResponse


# Helper Functions
def hash_password(password: str) -> str:
    """Hash password using SHA256 (for development - use bcrypt in production)"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return hash_password(plain_password) == hashed_password


def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get current authenticated admin from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id: str = payload.get("sub")
        if admin_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if admin is None:
        raise credentials_exception
    
    if not admin.is_active:
        raise HTTPException(status_code=400, detail="Inactive admin account")
    
    return admin


# Routes
@router.post("/login", response_model=Token)
def admin_login(credentials: AdminLogin, db: Session = Depends(get_db)):
    """Admin login with email and password"""
    admin = db.query(Admin).filter(Admin.email == credentials.email).first()
    
    if not admin or not verify_password(credentials.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not admin.is_active:
        raise HTTPException(status_code=400, detail="Inactive admin account")
    
    # Create access token with super admin flag
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": admin.id, "email": admin.email, "role": admin.role, "is_super_admin": bool(admin.is_super_admin)},
        expires_delta=access_token_expires
    )
    
    # Look up matching User record to get avatar_path
    user_record = db.query(User).filter(User.email == admin.email).first()
    avatar_path = getattr(user_record, 'avatar_path', None) if user_record else None

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "admin": {
            "id": admin.id,
            "email": admin.email,
            "full_name": admin.full_name,
            "role": admin.role,
            "is_active": admin.is_active,
            "is_super_admin": bool(admin.is_super_admin),
            "avatar_path": avatar_path,
            "created_at": admin.created_at,
        }
    }


@router.get("/me", response_model=AdminResponse)
def get_admin_profile(current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Get current admin profile"""
    user_record = db.query(User).filter(User.email == current_admin.email).first()
    avatar_path = getattr(user_record, 'avatar_path', None) if user_record else None
    return {
        "id": current_admin.id,
        "email": current_admin.email,
        "full_name": current_admin.full_name,
        "role": current_admin.role,
        "is_active": current_admin.is_active,
        "is_super_admin": bool(current_admin.is_super_admin),
        "avatar_path": avatar_path,
        "created_at": current_admin.created_at,
    }


@router.post("/refresh", response_model=Token)
def refresh_token(current_admin: Admin = Depends(get_current_admin)):
    """Refresh access token"""
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_admin.id, "email": current_admin.email, "role": current_admin.role, "is_super_admin": bool(current_admin.is_super_admin)},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "admin": current_admin
    }

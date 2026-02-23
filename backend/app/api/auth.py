from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import User, Role
from app.auth import verify_pin, create_access_token, create_refresh_token
# Re-export get_current_user so all API files can import from app.api.auth
from app.auth import get_current_user  # noqa: F401

router = APIRouter()

class LoginRequest(BaseModel):
    employee_code: str
    pin: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    user: dict

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Employee login with code + PIN"""
    
    # Find user by employee code
    user = db.query(User).filter(User.employee_code == request.employee_code).first()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Verify PIN
    if not verify_pin(request.pin, user.pin_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Get role
    role = db.query(Role).filter(Role.id == user.role_id).first()
    
    # Create tokens
    token_data = {
        "sub": str(user.id),
        "org_id": str(user.organization_id),
        "role_code": role.code,
        "is_employee": role.is_employee
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=900,  # 15 minutes
        user={
            "id": str(user.id),
            "full_name": user.full_name,
            "employee_code": user.employee_code,
            "avatar_path": user.avatar_path,
            "role": {
                "id": str(role.id),
                "code": role.code,
                "name": role.name,
                "is_employee": role.is_employee
            },
            "organization_id": str(user.organization_id)
        }
    )

@router.post("/logout")
async def logout():
    """Logout (client-side token removal)"""
    return {"message": "Logged out successfully"}

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    role = None
    if current_user.role_id:
        from app.database import get_db as _get_db
        db = next(_get_db())
        role = db.query(Role).filter(Role.id == current_user.role_id).first()
    
    return {
        "id": str(current_user.id),
        "full_name": current_user.full_name,
        "employee_code": current_user.employee_code,
        "avatar_path": current_user.avatar_path,
        "organization_id": str(current_user.organization_id),
        "role": {
            "code": role.code if role else None,
            "name": role.name if role else None,
            "is_employee": role.is_employee if role else True
        } if role else None
    }

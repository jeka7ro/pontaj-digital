from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime

from app.database import get_db
from app.models import Client, Admin
from app.api.admin_auth import get_current_admin

router = APIRouter()

# --- Schemas ---
class ClientBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    cui: Optional[str] = Field(None, max_length=50)
    reg_com: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    contact_person: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[EmailStr] = None
    is_active: bool = True

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    cui: Optional[str] = Field(None, max_length=50)
    reg_com: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    contact_person: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None

class ClientResponse(ClientBase):
    id: str
    organization_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Endpoints ---
@router.get("", response_model=List[ClientResponse])
def get_clients(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """List all clients for the organization"""
    clients = db.query(Client).filter(Client.organization_id == current_admin.organization_id).all()
    return clients

@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    client_in: ClientCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Create a new client"""
    if not current_admin.organization_id:
        raise HTTPException(status_code=400, detail="Admin has no organization assigned")
        
    client = Client(
        **client_in.dict(),
        organization_id=current_admin.organization_id
    )
    
    db.add(client)
    db.commit()
    db.refresh(client)
    
    return client

@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: str,
    client_in: ClientUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Update an existing client"""
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.organization_id == current_admin.organization_id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    update_data = client_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)
        
    client.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(client)
    
    return client

@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Delete a client"""
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.organization_id == current_admin.organization_id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    # Check if client is used by any construction sites
    from app.models import ConstructionSite
    sites_using_client = db.query(ConstructionSite).filter(ConstructionSite.client_id == client_id).first()
    
    if sites_using_client:
        # Instead of deleting, just deactivate
        client.is_active = False
        client.updated_at = datetime.utcnow()
        db.commit()
        return None
        
    db.delete(client)
    db.commit()
    
    return None

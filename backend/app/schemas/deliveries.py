from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

class DeliveryBase(BaseModel):
    site_id: str
    delivery_date: date
    materials_delivered: str
    photo_url: Optional[str] = None

class DeliveryCreate(DeliveryBase):
    pass

class DeliveryResponse(DeliveryBase):
    id: str
    organization_id: str
    created_by_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Optioanally we can include site name if joined
    site_name: Optional[str] = None
    created_by_name: Optional[str] = None

    class Config:
        from_attributes = True

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
import uuid

class TaskBase(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    frequency: Optional[str] = None
    priority: str = "Medie"
    status: str = "De făcut"
    assignee_id: Optional[str] = None
    due_date: Optional[date] = None
    reminder: Optional[datetime] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[date] = None
    reminder: Optional[datetime] = None

class TaskStatusUpdate(BaseModel):
    status: str

class UserSummary(BaseModel):
    id: str
    full_name: str

    class Config:
        from_attributes = True

class TaskResponse(TaskBase):
    id: str
    organization_id: str
    created_at: datetime
    updated_at: datetime
    assignee: Optional[UserSummary] = None

    class Config:
        from_attributes = True

class TaskListResponse(BaseModel):
    items: List[TaskResponse]

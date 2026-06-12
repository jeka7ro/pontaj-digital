from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from ..database import get_db
from ..models import Task, User, Admin
from ..schemas.task import TaskCreate, TaskUpdate, TaskStatusUpdate, TaskResponse, TaskListResponse
from .admin_auth import get_current_admin

router = APIRouter()

@router.get("/", response_model=TaskListResponse)
def get_all_tasks(db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    tasks = db.query(Task).filter(Task.organization_id == current_admin.organization_id).order_by(Task.created_at.desc()).all()
    return TaskListResponse(items=tasks)

@router.post("/", response_model=TaskResponse)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    new_task = Task(
        organization_id=current_admin.organization_id,
        title=task_in.title,
        description=task_in.description,
        frequency=task_in.frequency,
        priority=task_in.priority,
        status=task_in.status,
        assignee_id=task_in.assignee_id,
        site_id=task_in.site_id,
        due_date=task_in.due_date,
        start_time=task_in.start_time,
        end_time=task_in.end_time,
        reminder=task_in.reminder
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: str, task_in: TaskUpdate, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    task = db.query(Task).filter(Task.id == task_id, Task.organization_id == current_admin.organization_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
        
    db.commit()
    db.refresh(task)
    return task

@router.patch("/{task_id}/status", response_model=TaskResponse)
def update_task_status(task_id: str, status_in: TaskStatusUpdate, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    task = db.query(Task).filter(Task.id == task_id, Task.organization_id == current_admin.organization_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = status_in.status
    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    task = db.query(Task).filter(Task.id == task_id, Task.organization_id == current_admin.organization_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}

@router.delete("/{task_id}/instance")
def delete_task_instance(
    task_id: str, 
    action: str, 
    date: str, 
    db: Session = Depends(get_db), 
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Delete a specific instance of a recurring task.
    action: 'this' (only this date), 'following' (this date and all future), 'all' (entire series)
    date: YYYY-MM-DD
    """
    task = db.query(Task).filter(Task.id == task_id, Task.organization_id == current_admin.organization_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if action == "all":
        db.delete(task)
    elif action == "this":
        if task.deleted_dates is None:
            task.deleted_dates = []
        
        # Ensure we are working with a list, copy it to trigger SQLAlchemy JSON update
        current_dates = list(task.deleted_dates)
        if date not in current_dates:
            current_dates.append(date)
            task.deleted_dates = current_dates
    elif action == "following":
        # Stop recurrence one day before the target date
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
        from datetime import timedelta
        task.recurrence_end_date = target_date - timedelta(days=1)
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    db.commit()
    return {"message": "Task instance deleted successfully"}

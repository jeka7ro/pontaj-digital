from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import date as dt_date
import hashlib

from app.timezone import get_local_now
from app.storage import upload_file, get_content_type

from app.database import get_db
from app.models import Expense, ExpenseCategory, Admin, Organization, ConstructionSite, User
from app.api.admin_auth import get_current_admin

router = APIRouter(prefix="/admin/expenses", tags=["Admin - Cheltuieli"])

class ExpenseCreateBody(BaseModel):
    site_id: str
    user_id: Optional[str] = None
    category: str
    amount: float
    currency: str = "RON"
    date: dt_date
    description: Optional[str] = None
    document_url: Optional[str] = None
    status: str = "achitat"
    partial_amount: Optional[float] = None

class ExpenseUpdateBody(BaseModel):
    site_id: Optional[str] = None
    user_id: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    date: Optional[dt_date] = None
    description: Optional[str] = None
    document_url: Optional[str] = None
    status: Optional[str] = None
    partial_amount: Optional[float] = None

class ExpenseCategoryCreate(BaseModel):
    name: str
    color: str

class ExpenseCategoryOut(BaseModel):
    id: str
    name: str
    color: str

def expense_to_dict(e: Expense, site_name: str = None, user_name: str = None) -> dict:
    return {
        "id": e.id,
        "site_id": e.site_id,
        "site_name": site_name,
        "user_id": e.user_id,
        "user_name": user_name,
        "category": e.category,
        "amount": e.amount,
        "currency": e.currency,
        "date": e.date.isoformat(),
        "description": e.description,
        "document_url": e.document_url,
        "status": e.status,
        "partial_amount": e.partial_amount,
        "created_at": e.created_at.isoformat(),
    }

# --- Categorii de cheltuieli ---

@router.get("/categories", response_model=List[ExpenseCategoryOut])
def get_expense_categories(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    categories = db.query(ExpenseCategory).filter(
        ExpenseCategory.organization_id == current_admin.organization_id
    ).order_by(ExpenseCategory.name.asc()).all()
    
    return [
        {"id": c.id, "name": c.name, "color": c.color}
        for c in categories
    ]

@router.post("/categories", response_model=ExpenseCategoryOut)
def create_expense_category(
    body: ExpenseCategoryCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    # Check if name already exists
    existing = db.query(ExpenseCategory).filter(
        ExpenseCategory.organization_id == current_admin.organization_id,
        ExpenseCategory.name == body.name
    ).first()
    if existing:
        raise HTTPException(400, "O categorie cu acest nume există deja")

    c = ExpenseCategory(
        organization_id=current_admin.organization_id,
        name=body.name,
        color=body.color
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "name": c.name, "color": c.color}

@router.put("/categories/{cat_id}", response_model=ExpenseCategoryOut)
def update_expense_category(
    cat_id: str,
    body: ExpenseCategoryCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    c = db.query(ExpenseCategory).filter(
        ExpenseCategory.organization_id == current_admin.organization_id,
        ExpenseCategory.id == cat_id
    ).first()
    if not c:
        raise HTTPException(404, "Categoria nu a fost găsită")

    if body.name != c.name:
        existing = db.query(ExpenseCategory).filter(
            ExpenseCategory.organization_id == current_admin.organization_id,
            ExpenseCategory.name == body.name
        ).first()
        if existing:
            raise HTTPException(400, "O categorie cu acest nume există deja")
        
        # Update existing expenses to new category name
        db.query(Expense).filter(
            Expense.organization_id == current_admin.organization_id,
            Expense.category == c.name
        ).update({"category": body.name}, synchronize_session=False)

    c.name = body.name
    c.color = body.color
    db.commit()
    db.refresh(c)
    return {"id": c.id, "name": c.name, "color": c.color}

@router.delete("/categories/{cat_id}")
def delete_expense_category(
    cat_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    c = db.query(ExpenseCategory).filter(
        ExpenseCategory.organization_id == current_admin.organization_id,
        ExpenseCategory.id == cat_id
    ).first()
    if not c:
        raise HTTPException(404, "Categoria nu a fost găsită")
    
    # Optional: We could check if it's used, but expenses just store the string name.
    # So deleting the category won't break existing expenses. They just won't have a known color.
    
    db.delete(c)
    db.commit()
    return {"status": "ok"}

# --- Cheltuieli ---

@router.get("/")
def get_expenses(
    site_id: Optional[str] = None,
    category: Optional[str] = None,
    month: Optional[str] = None, # format YYYY-MM
    start_date: Optional[str] = None, # format YYYY-MM-DD
    end_date: Optional[str] = None, # format YYYY-MM-DD
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    q = db.query(Expense, ConstructionSite.name, User.full_name).outerjoin(
        ConstructionSite, Expense.site_id == ConstructionSite.id
    ).outerjoin(
        User, Expense.user_id == User.id
    ).filter(
        Expense.organization_id == current_admin.organization_id
    )

    if site_id:
        q = q.filter(Expense.site_id == site_id)
    if category:
        q = q.filter(Expense.category == category)
    if month:
        # Simple string matching for YYYY-MM
        q = q.filter(Expense.date.cast(str).like(f"{month}%"))
    if start_date:
        q = q.filter(Expense.date >= start_date)
    if end_date:
        q = q.filter(Expense.date <= end_date)
        
    results = q.order_by(Expense.date.desc(), Expense.created_at.desc()).all()
    
    return [expense_to_dict(e, s_name, u_name) for e, s_name, u_name in results]

@router.post("/")
def create_expense(
    body: ExpenseCreateBody,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    # Validate site
    site = db.query(ConstructionSite).filter(
        ConstructionSite.id == body.site_id,
        ConstructionSite.organization_id == current_admin.organization_id
    ).first()
    if not site:
        raise HTTPException(404, "Șantierul nu a fost găsit")

    # Validate user if provided
    user = None
    if body.user_id:
        u = db.query(User).filter(
            User.id == body.user_id,
            User.organization_id == current_admin.organization_id
        ).first()
        if not u:
            raise HTTPException(404, "Angajatul nu a fost găsit")

    e = Expense(
        organization_id=current_admin.organization_id,
        site_id=body.site_id,
        user_id=body.user_id,
        category=body.category,
        amount=body.amount,
        currency=body.currency,
        date=body.date,
        description=body.description,
        document_url=body.document_url,
        status=body.status,
        partial_amount=body.partial_amount
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return expense_to_dict(e, site.name, user.full_name if user else None)

@router.put("/{expense_id}")
def update_expense(
    expense_id: str,
    body: ExpenseUpdateBody,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    e = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.organization_id == current_admin.organization_id
    ).first()
    if not e:
        raise HTTPException(404, "Cheltuiala nu a fost găsită")

    if body.site_id is not None: e.site_id = body.site_id
    if body.user_id is not None: e.user_id = body.user_id
    if body.category is not None: e.category = body.category
    if body.amount is not None: e.amount = body.amount
    if body.currency is not None: e.currency = body.currency
    if body.date is not None: e.date = body.date
    if body.description is not None: e.description = body.description
    if body.document_url is not None: e.document_url = body.document_url
    if body.status is not None: e.status = body.status
    if body.partial_amount is not None: e.partial_amount = body.partial_amount

    db.commit()
    return {"message": "Actualizat cu succes"}

@router.delete("/{expense_id}")
def delete_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    e = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.organization_id == current_admin.organization_id
    ).first()
    if not e:
        raise HTTPException(404, "Cheltuiala nu a fost găsită")
    
    db.delete(e)
    db.commit()
    return {"message": "Cheltuială ștearsă"}

@router.post("/upload")
async def upload_expense_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    timestamp = get_local_now().strftime("%Y%m%d_%H%M%S")
    ext = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    safe_filename = f"expense_{timestamp}_{hashlib.md5(file.filename.encode()).hexdigest()[:8]}.{ext}"
    
    storage_path = f"expenses/{current_admin.organization_id}/{safe_filename}"
    file_content = await file.read()
    
    file_url = upload_file(file_content, storage_path, get_content_type(file.filename))
    
    return {"url": file_url}

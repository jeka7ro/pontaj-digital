from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from pydantic import BaseModel
from datetime import date, datetime

from app.database import get_db
from app.models import WarehouseItem, WarehouseTransaction, Admin, Vehicle, User, Site, MaterialRequest
from app.api.admin_auth import get_current_admin
from app.storage import upload_file, get_content_type
import os
import uuid

router = APIRouter()

def is_admin_or_logistic(admin: Admin):
    allowed_roles = ["ADMIN", "LOGISTIC", "SUPER_ADMIN", "SUPERVIZOR", "TESA", "FINANCIAR"]
    if admin.role.upper() not in allowed_roles:
        raise HTTPException(status_code=403, detail="Nu aveți permisiunea de a accesa această secțiune")
    return True

# Schemas
class WarehouseItemCreate(BaseModel):
    name: str
    category: str
    unit: str
    model: Optional[str] = None
    inventory_code: Optional[str] = None

class WarehouseItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    model: Optional[str] = None
    inventory_code: Optional[str] = None

class WarehouseTransactionCreate(BaseModel):
    item_id: str
    transaction_type: str  # "IN" or "OUT"
    quantity: float
    date: date
    assigned_to_user_id: Optional[str] = None
    assigned_to_vehicle_id: Optional[str] = None
    site_id: Optional[str] = None
    notes: Optional[str] = None

# GET items
@router.get("/warehouse/items")
def get_items(category: Optional[str] = None, site_id: Optional[str] = None, assigned_to_user_id: Optional[str] = None, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    from app.api.warehouse_get_items import get_items_logic
    return get_items_logic(category, site_id, assigned_to_user_id, db, current_admin)

# GET single item
@router.get("/warehouse/items/{item_id}")
def get_single_item(item_id: str, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    db_item = db.query(WarehouseItem).filter(
        WarehouseItem.id == item_id, 
        WarehouseItem.organization_id == current_admin.organization_id
    ).first()
    
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")
        
    return {
        "id": db_item.id,
        "name": db_item.name,
        "category": db_item.category,
        "unit": db_item.unit,
        "model": db_item.model,
        "inventory_code": db_item.inventory_code,
        "total_quantity": db_item.total_quantity,
        "current_holder_id": db_item.current_holder_id,
        "current_site_id": db_item.current_site_id,
        "is_defective": db_item.is_defective,
        "is_lost": db_item.is_lost
    }


# CREATE item
@router.post("/warehouse/items")
def create_item(item: WarehouseItemCreate, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    
    db_item = WarehouseItem(
        organization_id=current_admin.organization_id,
        name=item.name,
        category=item.category,
        unit=item.unit,
        model=item.model,
        inventory_code=item.inventory_code,
        total_quantity=1.0 if item.inventory_code else 0.0
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {"id": db_item.id, "name": db_item.name}

# UPDATE item
@router.put("/warehouse/items/{item_id}")
def update_item(item_id: str, item: WarehouseItemUpdate, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id, WarehouseItem.organization_id == current_admin.organization_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")
        
    if item.name is not None:
        db_item.name = item.name
    if item.category is not None:
        db_item.category = item.category
    if item.unit is not None:
        db_item.unit = item.unit
    if item.model is not None:
        db_item.model = item.model
    if item.inventory_code is not None:
        db_item.inventory_code = item.inventory_code
        
    db.commit()
    return {"success": True}

# DELETE item
@router.delete("/warehouse/items/{item_id}")
def delete_item(item_id: str, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id, WarehouseItem.organization_id == current_admin.organization_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")
        
    db.delete(db_item)
    db.commit()
    return {"success": True}

# GET transactions for item
@router.get("/warehouse/items/{item_id}/transactions")
def get_item_transactions(item_id: str, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    
    transactions = db.query(WarehouseTransaction).filter(WarehouseTransaction.item_id == item_id).order_by(desc(WarehouseTransaction.created_at)).all()
    
    result = []
    
    # Pre-fetch all entities to match IDs
    all_admins = {a.id: a.full_name for a in db.query(Admin).all()}
    all_users = {u.id: u.full_name for u in db.query(User).all()}
    all_vehicles = {v.id: v.name for v in db.query(Vehicle).all()}
    all_sites = {s.id: s.name for s in db.query(Site).all()}

    for t in transactions:
        assigned_user = all_users.get(t.assigned_to_user_id) if t.assigned_to_user_id else None
        assigned_vehicle = all_vehicles.get(t.assigned_to_vehicle_id) if t.assigned_to_vehicle_id else None
        assigned_site = all_sites.get(t.site_id) if t.site_id else None
        
        # Look up operator in admins first, then users
        operator = all_admins.get(t.operated_by_id) or all_users.get(t.operated_by_id) or "Necunoscut"
        
        result.append({
            "id": t.id,
            "transaction_type": t.transaction_type,
            "quantity": t.quantity,
            "date": t.date,
            "assigned_user": assigned_user,
            "assigned_vehicle": assigned_vehicle,
            "assigned_site": assigned_site,
            "assigned_to_user_id": t.assigned_to_user_id,
            "assigned_to_vehicle_id": t.assigned_to_vehicle_id,
            "site_id": t.site_id,
            "operator": operator,
            "notes": t.notes,
            "attachment_url": t.attachment_url,
            "created_at": t.created_at
        })
    return result

# ADD transaction
@router.post("/warehouse/transactions")
async def add_transaction(
    item_id: str = Form(...),
    transaction_type: str = Form(...),
    quantity: float = Form(...),
    date: str = Form(...),
    assigned_to_user_id: Optional[str] = Form(None),
    assigned_to_vehicle_id: Optional[str] = Form(None),
    site_id: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), 
    current_admin: Admin = Depends(get_current_admin)
):
    is_admin_or_logistic(current_admin)
    
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id, WarehouseItem.organization_id == current_admin.organization_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")
        
    if transaction_type not in ["IN", "OUT"]:
        raise HTTPException(status_code=400, detail="Tip tranzacție invalid")
        
    if transaction_type == "OUT" and db_item.total_quantity < quantity:
        raise HTTPException(status_code=400, detail="Stoc insuficient")
        
    attachment_url = None
    if file:
        content = await file.read()
        filename = file.filename
        storage_path = f"warehouse/{uuid.uuid4()}_{filename}"
        attachment_url = upload_file(content, storage_path, get_content_type(filename))
        
    # convert date string to date object
    from datetime import date as dt_date
    date_obj = dt_date.fromisoformat(date)
        
    db_tx = WarehouseTransaction(
        item_id=item_id,
        transaction_type=transaction_type,
        quantity=quantity,
        date=date_obj,
        operated_by_id=current_admin.id,
        assigned_to_user_id=assigned_to_user_id,
        assigned_to_vehicle_id=assigned_to_vehicle_id,
        site_id=site_id,
        notes=notes,
        attachment_url=attachment_url
    )
    db.add(db_tx)
    
    if transaction_type == "IN":
        if site_id and not db_item.inventory_code:
            # Intrare directă pe șantier pentru consumabile -> nu afectează stocul central
            pass
        else:
            db_item.total_quantity += quantity
    else:
        db_item.total_quantity -= quantity
        
    db.commit()
    return {"success": True, "new_total": db_item.total_quantity}

# DELETE transaction
@router.delete("/warehouse/transactions/{tx_id}")
def delete_transaction(tx_id: str, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    
    tx = db.query(WarehouseTransaction).filter(WarehouseTransaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Tranzacția nu a fost găsită")
        
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == tx.item_id).first()
    if db_item:
        if tx.transaction_type == "IN":
            if not (tx.site_id and not db_item.inventory_code):
                db_item.total_quantity -= tx.quantity
        else:
            db_item.total_quantity += tx.quantity
            
    db.delete(tx)
    db.commit()
    return {"success": True}

# EDIT transaction
@router.put("/warehouse/transactions/{tx_id}")
async def edit_transaction(
    tx_id: str,
    quantity: float = Form(...),
    date: str = Form(...),
    assigned_to_user_id: Optional[str] = Form(None),
    assigned_to_vehicle_id: Optional[str] = Form(None),
    site_id: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    is_admin_or_logistic(current_admin)
    
    tx = db.query(WarehouseTransaction).filter(WarehouseTransaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Tranzacția nu a fost găsită")
        
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == tx.item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")

    qty_diff = quantity - tx.quantity
    
    if tx.transaction_type == "OUT" and db_item.total_quantity - qty_diff < 0:
        raise HTTPException(status_code=400, detail="Stoc insuficient pentru modificare")
        
    attachment_url = tx.attachment_url
    if file:
        content = await file.read()
        filename = file.filename
        storage_path = f"warehouse/{uuid.uuid4()}_{filename}"
        attachment_url = upload_file(content, storage_path, get_content_type(filename))
        
    from datetime import date as dt_date
    date_obj = dt_date.fromisoformat(date)
    
    site_id_val = site_id if site_id != "null" and site_id != "" else None

    # Revert old tx effect on main stock
    if tx.transaction_type == "IN":
        if not (tx.site_id and not db_item.inventory_code):
            db_item.total_quantity -= tx.quantity
    else:
        db_item.total_quantity += tx.quantity

    # Apply new tx effect on main stock
    if tx.transaction_type == "IN":
        if not (site_id_val and not db_item.inventory_code):
            db_item.total_quantity += quantity
    else:
        db_item.total_quantity -= quantity

    tx.quantity = quantity
    tx.date = date_obj
    tx.assigned_to_user_id = assigned_to_user_id if assigned_to_user_id != "null" and assigned_to_user_id != "" else None
    tx.assigned_to_vehicle_id = assigned_to_vehicle_id if assigned_to_vehicle_id != "null" and assigned_to_vehicle_id != "" else None
    tx.site_id = site_id if site_id != "null" and site_id != "" else None
    tx.notes = notes
    if file:
        tx.attachment_url = attachment_url
        
    db.commit()
    return {"success": True, "new_total": db_item.total_quantity}

class ToolCheckout(BaseModel):
    site_id: Optional[str] = None
    user_id: Optional[str] = None
    date: str

@router.post("/warehouse/items/{item_id}/checkout")
def checkout_tool(item_id: str, data: ToolCheckout, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id, WarehouseItem.organization_id == current_admin.organization_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")
    if db_item.current_site_id or db_item.current_holder_id:
        raise HTTPException(status_code=400, detail="Scula este deja repartizată")
    if db_item.is_defective:
        raise HTTPException(status_code=400, detail="Nu se poate repartiza o sculă defectă")

    site_id_val = data.site_id if data.site_id and data.site_id != "null" else None
    user_id_val = data.user_id if data.user_id and data.user_id != "null" else None

    if not site_id_val and not user_id_val:
        raise HTTPException(status_code=400, detail="Trebuie să selectezi un șantier sau un angajat")

    # update status
    db_item.current_site_id = site_id_val
    db_item.current_holder_id = user_id_val
    from datetime import datetime
    db_item.checked_out_at = datetime.utcnow()

    # create OUT transaction representing check-out
    from datetime import date as dt_date
    date_obj = dt_date.fromisoformat(data.date)
    
    tx = WarehouseTransaction(
        item_id=item_id,
        transaction_type="OUT",
        quantity=1.0,
        date=date_obj,
        operated_by_id=current_admin.id,
        site_id=site_id_val,
        assigned_to_user_id=user_id_val,
        notes="Repartizare"
    )
    db.add(tx)
    # the total_quantity goes from 1 to 0 (since it's an individual item)
    db_item.total_quantity = 0.0
    db.commit()
    return {"success": True}

@router.post("/warehouse/items/{item_id}/force-assign")
def force_assign_tool(item_id: str, data: ToolCheckout, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    """Force-set current holder/site for a warehouse item, even if already assigned. Used to correct data."""
    is_admin_or_logistic(current_admin)
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id, WarehouseItem.organization_id == current_admin.organization_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")

    site_id_val = data.site_id if data.site_id and data.site_id != "null" else None
    user_id_val = data.user_id if data.user_id and data.user_id != "null" else None

    db_item.current_site_id = site_id_val
    db_item.current_holder_id = user_id_val
    from datetime import datetime
    db_item.checked_out_at = datetime.utcnow()
    db_item.total_quantity = 0.0 if (site_id_val or user_id_val) else 1.0

    db.commit()
    return {"success": True}

class ToolCheckin(BaseModel):
    date: str

@router.post("/warehouse/items/{item_id}/checkin")
def checkin_tool(item_id: str, data: ToolCheckin, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id, WarehouseItem.organization_id == current_admin.organization_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")
    if not db_item.current_site_id and not db_item.current_holder_id:
        raise HTTPException(status_code=400, detail="Scula este deja în magazie")

    # record from where it returned
    returned_from_site_id = db_item.current_site_id
    returned_from_user_id = db_item.current_holder_id

    # clear status
    db_item.current_site_id = None
    db_item.current_holder_id = None
    db_item.checked_out_at = None

    # create IN transaction representing check-in
    from datetime import date as dt_date
    date_obj = dt_date.fromisoformat(data.date)
    
    tx = WarehouseTransaction(
        item_id=item_id,
        transaction_type="IN",
        quantity=1.0,
        date=date_obj,
        operated_by_id=current_admin.id,
        site_id=returned_from_site_id,
        assigned_to_user_id=returned_from_user_id,
        notes="Primire din șantier"
    )
    db.add(tx)
    db_item.total_quantity = 1.0
    db.commit()
    return {"success": True}

@router.post("/warehouse/items/{item_id}/toggle-defective")
def toggle_defective(item_id: str, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id, WarehouseItem.organization_id == current_admin.organization_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")
        
    db_item.is_defective = not db_item.is_defective
    db.commit()
    return {"success": True, "is_defective": db_item.is_defective}

@router.get("/warehouse/items/{item_id}/linked-request")
def get_linked_request(item_id: str, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    """Find the most recent completed material request linked to this warehouse item by inventory_code."""
    is_admin_or_logistic(current_admin)
    db_item = db.query(WarehouseItem).filter(
        WarehouseItem.id == item_id,
        WarehouseItem.organization_id == current_admin.organization_id
    ).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")

    import json

    # Search all material requests for this org, look for inventory_code in items_json or items_text
    requests = db.query(MaterialRequest).filter(
        MaterialRequest.organization_id == current_admin.organization_id
    ).order_by(desc(MaterialRequest.created_at)).all()

    matched = None
    for req in requests:
        # Check items_json first
        if req.items_json:
            try:
                items = json.loads(req.items_json)
                if not isinstance(items, list):
                    items = []
                for it in items:
                    if (db_item.inventory_code and str(it.get("id", "")) == db_item.id) or \
                       (db_item.inventory_code and db_item.inventory_code in str(it.get("name", ""))) or \
                       (db_item.name and db_item.name.lower() in str(it.get("name", "")).lower()):
                        matched = req
                        break
            except Exception:
                pass
        # Check items_text
        if not matched and req.items_text:
            if (db_item.inventory_code and db_item.inventory_code in req.items_text) or \
               (db_item.name and db_item.name.lower() in req.items_text.lower()):
                matched = req
        if matched:
            break

    if not matched:
        return None

    # Get current holder info
    holder = None
    if db_item.current_holder_id:
        holder = db.query(User).filter(User.id == db_item.current_holder_id).first()
    elif matched.user_id:
        # fallback: if request is completed, the requester likely has it
        if matched.status in ("completed", "delivered"):
            holder = db.query(User).filter(User.id == matched.user_id).first()

    holder_site = None
    if db_item.current_site_id:
        holder_site = db.query(Site).filter(Site.id == db_item.current_site_id).first()
    elif matched.site_id:
        holder_site = db.query(Site).filter(Site.id == matched.site_id).first()

    responder_name = matched.responder.full_name if matched.responder else None

    return {
        "request_id": matched.id,
        "status": matched.status,
        "requested_by": matched.user.full_name if matched.user else None,
        "requested_by_id": matched.user_id,
        "requested_at": matched.created_at.isoformat() if matched.created_at else None,
        "site_name": matched.site.name if matched.site else None,
        "approved_by": responder_name,
        "approved_at": matched.responded_at.isoformat() if matched.responded_at else None,
        "confirmed_by": matched.user.full_name if matched.status in ("completed", "delivered") else None,
        "confirmed_at": matched.updated_at.isoformat() if matched.status in ("completed", "delivered") else None,
        "current_holder": holder.full_name if holder else None,
        "current_site": holder_site.name if holder_site else None,
        "items_text": matched.items_text,
    }


# ─── Returnări în așteptare (two-step return flow) ────────────────────────────

@router.get("/warehouse/pending-returns")
def get_pending_returns(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Lista sculelor cu predare în așteptare — muncitorul a predat, adminul trebuie să confirme starea."""
    is_admin_or_logistic(current_admin)
    items = db.query(WarehouseItem).filter(
        WarehouseItem.organization_id == current_admin.organization_id,
        WarehouseItem.pending_return == True
    ).all()

    result = []
    for item in items:
        worker = db.query(User).filter(User.id == item.pending_return_by_id).first() if item.pending_return_by_id else None
        holder = db.query(User).filter(User.id == item.current_holder_id).first() if item.current_holder_id else None
        result.append({
            "id": item.id,
            "name": item.name,
            "model": item.model,
            "inventory_code": item.inventory_code,
            "category": item.category,
            "pending_return_at": item.pending_return_at.isoformat() if item.pending_return_at else None,
            "returned_by": worker.full_name if worker else (holder.full_name if holder else "Necunoscut"),
            "returned_by_id": item.pending_return_by_id or item.current_holder_id,
        })
    return result


class ConfirmReturnRequest(BaseModel):
    item_id: str
    condition: str  # "functional" | "defective" | "lost"
    notes: Optional[str] = None


@router.post("/warehouse/confirm-return")
def confirm_return(
    body: ConfirmReturnRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Admin confirmă primirea sculei și starea ei: funcțională / defectă / pierdută."""
    is_admin_or_logistic(current_admin)

    if body.condition not in ("functional", "defective", "lost"):
        raise HTTPException(status_code=400, detail="Condiție invalidă. Acceptat: functional, defective, lost")

    item = db.query(WarehouseItem).filter(
        WarehouseItem.id == body.item_id,
        WarehouseItem.organization_id == current_admin.organization_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Articol negăsit")
    if not item.pending_return:
        raise HTTPException(status_code=400, detail="Acest articol nu are o predare în așteptare")

    returned_from_site = item.current_site_id
    worker_id = item.pending_return_by_id or item.current_holder_id

    # Finalizare returnare
    item.current_holder_id = None
    item.current_site_id = None
    item.checked_out_at = None
    item.pending_return = False
    item.pending_return_at = None
    item.pending_return_by_id = None

    if body.condition == "functional":
        item.total_quantity = 1.0
        item.is_defective = False
        item.is_lost = False
        condition_note = "Primit FUNCȚIONAL"
    elif body.condition == "defective":
        item.total_quantity = 1.0
        item.is_defective = True
        item.is_lost = False
        condition_note = "Primit DEFECT"
    else:  # lost
        item.total_quantity = 0.0
        item.is_defective = False
        item.is_lost = True
        condition_note = "Marcat ca PIERDUT"

    tx = WarehouseTransaction(
        item_id=body.item_id,
        transaction_type="IN",
        quantity=1.0 if body.condition != "lost" else 0.0,
        date=datetime.utcnow().date(),
        operated_by_id=str(current_admin.id),
        assigned_to_user_id=worker_id,
        site_id=returned_from_site,
        notes=f"{condition_note} — confirmat de admin. {body.notes or ''}".strip()
    )
    db.add(tx)
    db.commit()

    return {"success": True, "condition": body.condition, "item_name": item.name}


@router.get("/warehouse/transactions/user/{user_id}")
def get_user_warehouse_transactions(
    user_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Fetch all transactions involving this user (either they requested it or it was assigned to them)
    transactions = db.query(WarehouseTransaction).filter(
        WarehouseTransaction.assigned_to_user_id == user_id
    ).order_by(desc(WarehouseTransaction.created_at)).all()
    
    result = []
    # Pre-fetch items to get names
    all_items = {i.id: i for i in db.query(WarehouseItem).all()}
    all_users = {u.id: u for u in db.query(User).all()}
    
    for tx in transactions:
        item = all_items.get(tx.item_id)
        if not item:
            continue
            
        operator_name = "Admin"
        if tx.operated_by_id:
            op_user = all_users.get(tx.operated_by_id)
            if op_user:
                operator_name = op_user.full_name
                
        result.append({
            "id": tx.id,
            "item_id": tx.item_id,
            "item_name": item.name,
            "item_sku": item.inventory_code or item.model or "N/A",
            "item_category": item.category,
            "tx_type": tx.transaction_type.lower(),
            "quantity": float(tx.quantity),
            "date": str(tx.date),
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
            "notes": tx.notes,
            "user_name": operator_name
        })
        
    return result

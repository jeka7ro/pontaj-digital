from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import date

from app.database import get_db
from app.models import VehicleFuelEntry, VehicleDailyKm, Vehicle, Admin, ConstructionSite
from app.api.admin_auth import get_current_admin

router = APIRouter(prefix="/admin/fleet/reports", tags=["admin-fleet-reports"])

class FleetReportFilter(BaseModel):
    month: str # YYYY-MM
    vehicle_id: Optional[str] = None
    site_id: Optional[str] = None
    supplier: Optional[str] = None

class FleetReportRow(BaseModel):
    vehicle_id: str
    vehicle_name: str
    plate_number: str
    driver_name: Optional[str] = None
    site_name: Optional[str] = None
    km_driven: float
    total_fuel_entries: int
    total_liters: float
    total_cost: float
    avg_consumption: float
    cost_per_km: float
    supplier_costs: Dict[str, float]

@router.post("", response_model=List[FleetReportRow])
def generate_fleet_report(
    filters: FleetReportFilter,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    try:
        year, month = map(int, filters.month.split('-'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")

    # Get all vehicles or specific one
    v_query = db.query(Vehicle).filter(Vehicle.organization_id == current_admin.organization_id)
    if filters.vehicle_id:
        v_query = v_query.filter(Vehicle.id == filters.vehicle_id)
    
    vehicles = v_query.all()
    results = []

    for v in vehicles:
        # Filter fuel entries
        f_query = db.query(VehicleFuelEntry).filter(
            VehicleFuelEntry.vehicle_id == v.id,
            func.extract('year', VehicleFuelEntry.date) == year,
            func.extract('month', VehicleFuelEntry.date) == month
        )
        if filters.site_id:
            f_query = f_query.filter(VehicleFuelEntry.site_id == filters.site_id)
        if filters.supplier and filters.supplier.lower() != 'toate':
            f_query = f_query.filter(func.lower(VehicleFuelEntry.supplier) == filters.supplier.lower())
        
        fuel_entries = f_query.all()

        # Filter km entries
        k_query = db.query(VehicleDailyKm).filter(
            VehicleDailyKm.vehicle_id == v.id,
            func.extract('year', VehicleDailyKm.date) == year,
            func.extract('month', VehicleDailyKm.date) == month
        )
        if filters.site_id:
            k_query = k_query.filter(VehicleDailyKm.site_id == filters.site_id)
        
        km_entries = k_query.all()

        # Aggregate data
        km_driven = sum(k.km_driven for k in km_entries)
        total_liters = sum(f.liters for f in fuel_entries)
        total_cost = sum(f.total_cost for f in fuel_entries)
        
        supplier_costs = {}
        for f in fuel_entries:
            sup = f.supplier.upper()
            supplier_costs[sup] = supplier_costs.get(sup, 0) + f.total_cost

        # Calculate averages
        avg_consumption = (total_liters / km_driven * 100) if km_driven > 0 else 0
        cost_per_km = (total_cost / km_driven) if km_driven > 0 else 0

        # Try to guess primary site if not filtered
        primary_site_name = None
        if filters.site_id:
            site = db.query(ConstructionSite).filter(ConstructionSite.id == filters.site_id).first()
            if site:
                primary_site_name = site.name
        else:
            # Most frequent site from km logs
            site_freq = {}
            for k in km_entries:
                if k.site_id:
                    site_freq[k.site_id] = site_freq.get(k.site_id, 0) + 1
            if site_freq:
                top_site_id = max(site_freq, key=site_freq.get)
                site = db.query(ConstructionSite).filter(ConstructionSite.id == top_site_id).first()
                if site:
                    primary_site_name = site.name

        # For driver_name, we can try to look at VehicleUserAssignment but that's current.
        # We can leave it as "Multipli" or empty, or pick the first assigned user.
        # The frontend can handle driver display if needed.

        # If there's no data and it's heavily filtered, maybe skip? We'll include all matching vehicles for now.
        if filters.vehicle_id or total_liters > 0 or km_driven > 0:
            results.append(FleetReportRow(
                vehicle_id=v.id,
                vehicle_name=v.name,
                plate_number=v.plate_number or v.chassis_number or "",
                driver_name=None,
                site_name=primary_site_name,
                km_driven=round(km_driven, 2),
                total_fuel_entries=len(fuel_entries),
                total_liters=round(total_liters, 2),
                total_cost=round(total_cost, 2),
                avg_consumption=round(avg_consumption, 2),
                cost_per_km=round(cost_per_km, 2),
                supplier_costs={k: round(v, 2) for k, v in supplier_costs.items()}
            ))

    return results

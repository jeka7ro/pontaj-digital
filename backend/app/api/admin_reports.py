"""
Admin Reports: Preview & Excel export for timesheets
Works with actual schema: Timesheet → TimesheetSegment → ConstructionSite
"""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import Optional
import io

from app.database import get_db
from app.models import (
    Timesheet, User, ConstructionSite, TimesheetSegment,
    TimesheetLine, Activity, Role, GeofencePause, Admin
)
from app.api.admin_auth import get_current_admin

router = APIRouter()


def _build_report_data(db: Session, date_from=None, date_to=None, employee_id=None, site_id=None):
    """Build report data from timesheets + segments"""
    query = db.query(Timesheet).filter(Timesheet.owner_type == "USER")

    if date_from:
        query = query.filter(Timesheet.date >= datetime.strptime(date_from, "%Y-%m-%d").date())
    if date_to:
        query = query.filter(Timesheet.date <= datetime.strptime(date_to, "%Y-%m-%d").date())
    if employee_id:
        query = query.filter(Timesheet.owner_user_id == employee_id)

    timesheets = query.order_by(Timesheet.date.desc()).all()

    results = []
    now = datetime.now()

    for ts in timesheets:
        user = db.query(User).filter(User.id == ts.owner_user_id).first()
        if not user:
            continue

        role = db.query(Role).filter(Role.id == user.role_id).first()

        segments = db.query(TimesheetSegment).filter(
            TimesheetSegment.timesheet_id == ts.id
        ).order_by(TimesheetSegment.check_in_time.asc()).all()

        if not segments:
            continue

        first_seg = segments[0]
        last_seg = segments[-1]

        # Filter by site if requested
        seg_site = db.query(ConstructionSite).filter(
            ConstructionSite.id == first_seg.site_id
        ).first()

        if site_id and first_seg.site_id != site_id:
            continue

        # Calculate hours
        total_worked = 0
        total_break = 0
        for seg in segments:
            end_time = seg.check_out_time or now
            seg_hours = (end_time - seg.check_in_time).total_seconds() / 3600

            seg_break = 0
            if seg.break_start_time:
                break_end = seg.break_end_time or now
                seg_break = (break_end - seg.break_start_time).total_seconds() / 3600

            # Geofence pauses
            geo_pauses = db.query(GeofencePause).filter(GeofencePause.segment_id == seg.id).all()
            geo_secs = sum((
                (gp.pause_end or now) - gp.pause_start
            ).total_seconds() for gp in geo_pauses)

            total_worked += max(0, seg_hours - seg_break - geo_secs / 3600)
            total_break += seg_break

        # Activities
        activity_lines = db.query(TimesheetLine).filter(
            TimesheetLine.timesheet_id == ts.id
        ).all()
        activities = []
        for tl in activity_lines:
            act = db.query(Activity).filter(Activity.id == tl.activity_id).first()
            if act:
                activities.append(f"{act.name}: {tl.quantity_numeric or 0} {tl.unit_type or ''}")

        check_in_str = first_seg.check_in_time.strftime("%H:%M") if first_seg.check_in_time else None
        check_out_str = last_seg.check_out_time.strftime("%H:%M") if last_seg.check_out_time else "—"

        results.append({
            "id": ts.id,
            "date": ts.date.isoformat() if ts.date else None,
            "employee_name": user.full_name,
            "employee_code": user.employee_code,
            "role": role.name if role else "—",
            "site_name": seg_site.name if seg_site else "Necunoscut",
            "check_in": check_in_str,
            "check_out": check_out_str,
            "break_minutes": round(total_break * 60, 0),
            "hours_worked": round(total_worked, 2),
            "activities": "; ".join(activities) if activities else "—"
        })

    return results


@router.get("/timesheets/preview")
async def preview_timesheets(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    employee_id: Optional[str] = Query(None),
    site_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """Preview timesheet data"""
    results = _build_report_data(db, date_from, date_to, employee_id, site_id)
    total_hours = sum(r["hours_worked"] for r in results)

    return {
        "timesheets": results,
        "total": len(results),
        "total_hours": round(total_hours, 2)
    }


@router.get("/timesheets/excel")
async def export_timesheets_excel(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    employee_id: Optional[str] = Query(None),
    site_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """Export timesheets to Excel"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    results = _build_report_data(db, date_from, date_to, employee_id, site_id)

    wb = Workbook()
    ws = wb.active
    ws.title = "Pontaje"

    # Styles
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill(start_color="0f172a", end_color="1e3a5f", fill_type="solid")
    header_align = Alignment(horizontal="center", vertical="center")
    border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin')
    )

    headers = ["Data", "Angajat", "Cod", "Rol", "Șantier", "Intrare", "Ieșire", "Pauză (min)", "Ore Lucrate", "Activități"]

    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_align
        cell.border = border

    total_hours = 0
    for row_idx, r in enumerate(results, 2):
        total_hours += r["hours_worked"]
        row_data = [
            r["date"], r["employee_name"], r["employee_code"], r["role"],
            r["site_name"], r["check_in"], r["check_out"],
            int(r["break_minutes"]), r["hours_worked"], r["activities"]
        ]
        for col, val in enumerate(row_data, 1):
            cell = ws.cell(row=row_idx, column=col, value=val)
            cell.border = border

    # Total row
    if results:
        tr = len(results) + 2
        ws.cell(row=tr, column=1, value="TOTAL").font = Font(bold=True)
        ws.cell(row=tr, column=9, value=round(total_hours, 2)).font = Font(bold=True)
        for col in range(1, 11):
            ws.cell(row=tr, column=col).border = border
            ws.cell(row=tr, column=col).fill = PatternFill(start_color="E7E6E6", fill_type="solid")

    # Column widths
    widths = {1: 12, 2: 22, 3: 12, 4: 15, 5: 25, 6: 8, 7: 8, 8: 10, 9: 10, 10: 40}
    for col, w in widths.items():
        ws.column_dimensions[get_column_letter(col)].width = w

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f"pontaje_{date_from or 'all'}_{date_to or 'all'}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

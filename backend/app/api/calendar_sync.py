from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Organization, WorkOrder
from datetime import datetime

router = APIRouter(tags=["Calendar Sync"])

def _format_datetime_ics(dt: datetime) -> str:
    # Format to YYYYMMDDTHHMMSSZ (UTC)
    return dt.strftime("%Y%m%dT%H%M%SZ")

@router.get("/calendar/{token}/works.ics", response_class=Response)
def get_calendar_feed(token: str, db: Session = Depends(get_db)):
    # 1. Find organization by token
    org = db.query(Organization).filter(Organization.calendar_token == token).first()
    if not org:
        raise HTTPException(status_code=404, detail="Invalid calendar token")

    # 2. Fetch all work orders for this organization with a start_date and start_time
    work_orders = db.query(WorkOrder).filter(
        WorkOrder.organization_id == org.id,
        WorkOrder.start_date.isnot(None),
        WorkOrder.start_time.isnot(None),
        WorkOrder.status != "cancelled"
    ).all()

    # 3. Build the .ics content
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:-//Smart Timesheet//{org.name}//RO",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Intervenții - Smart Timesheet",
        "X-WR-TIMEZONE:Europe/Bucharest"
    ]

    for wo in work_orders:
        try:
            # Combine start_date and start_time
            # Assuming start_time is "HH:MM" and start_date is a string or Date object
            date_str = str(wo.start_date) # YYYY-MM-DD
            time_str = str(wo.start_time) # HH:MM
            
            # Simple parsing (timezone naive, assumes local time but ICS uses UTC or tz_naive)
            # Apple Calendar usually handles tz_naive by floating it in the local timezone
            dt_start_naive = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
            # We'll generate a 1 hour duration by default
            from datetime import timedelta
            dt_end_naive = dt_start_naive + timedelta(hours=1)
            
            # Formatting as floating timezone (no 'Z' at the end) so it uses the user's local timezone
            dtstart_ics = dt_start_naive.strftime("%Y%m%dT%H%M%S")
            dtend_ics = dt_end_naive.strftime("%Y%m%dT%H%M%S")
            dtstamp_ics = _format_datetime_ics(wo.created_at or datetime.utcnow())

            summary = wo.title
            if wo.client_name:
                summary += f" | {wo.client_name}"

            description = f"Status: {wo.status}\n"
            if wo.assigned_team_name:
                description += f"Echipa alocată: {wo.assigned_team_name}\n"
            if wo.access_notes:
                escaped_notes = wo.access_notes.replace('\n', '\\n')
                description += f"\nNote acces:\n{escaped_notes}"

            lines.extend([
                "BEGIN:VEVENT",
                f"UID:workorder-{wo.id}@smart-timesheet.ro",
                f"DTSTAMP:{dtstamp_ics}",
                f"DTSTART;TZID=Europe/Bucharest:{dtstart_ics}",
                f"DTEND;TZID=Europe/Bucharest:{dtend_ics}",
                f"SUMMARY:{summary}",
                f"DESCRIPTION:{description}",
            ])
            
            if wo.site_address:
                lines.append(f"LOCATION:{wo.site_address}")
            
            lines.append("END:VEVENT")
        except Exception as e:
            # Skip invalid dates
            continue

    lines.append("END:VCALENDAR")
    ics_content = "\r\n".join(lines)

    return Response(content=ics_content, media_type="text/calendar", headers={
        "Content-Disposition": f'attachment; filename="lucrari.ics"'
    })

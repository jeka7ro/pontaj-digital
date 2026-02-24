"""
Seed 10 test workers + auto-clock-in with activities and shift closure.

Run:  python seed_test_workers.py          — creates workers + today's shifts
      python seed_test_workers.py clockin  — only clock-in today (cron usage)

Workers: TEST001-TEST010  PIN: 1234
Shifts:  08:00-16:00 (8h), 30min break, 2-3 random activities, all closed.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine, Base
from app.models import (
    User, Role, Organization, Timesheet, TimesheetSegment, TimesheetLine,
    ConstructionSite as Site, Activity
)
from app.auth import hash_pin
from datetime import date, datetime, timedelta
from decimal import Decimal
import random

NAMES = [
    "Ionescu Mihai", "Popa George", "Marinescu Andrei",
    "Georgescu Florin", "Rusu Alexandru", "Dumitrescu Ciprian",
    "Constantinescu Dan", "Stan Marius", "Barbu Cristian", "Moldovan Vlad"
]

PIN = "1234"


def seed_workers(db):
    """Create 10 test workers if they don't exist."""
    org = db.query(Organization).first()
    if not org:
        print("❌ No organization found.")
        return []

    role = db.query(Role).filter(Role.organization_id == org.id, Role.code == "WORKER").first()
    if not role:
        print("❌ No WORKER role found.")
        return []

    pin_hash = hash_pin(PIN)
    users = []

    for i, name in enumerate(NAMES):
        code = f"TEST{str(i+1).zfill(3)}"
        existing = db.query(User).filter(User.employee_code == code).first()
        if existing:
            users.append(existing)
            print(f"  ⏭️  {code} ({name}) already exists")
            continue

        user = User(
            organization_id=org.id,
            role_id=role.id,
            employee_code=code,
            pin_hash=pin_hash,
            full_name=name,
            is_active=True,
        )
        db.add(user)
        db.flush()
        users.append(user)
        print(f"  ✅ Created {code} — {name}")

    db.commit()
    return users


def auto_clockin_today(db, users):
    """Create full day shifts (08:00-16:00) with break + activities for today."""
    today = date.today()

    org = db.query(Organization).first()
    sites = db.query(Site).filter(Site.organization_id == org.id).all()
    activities = db.query(Activity).filter(
        Activity.organization_id == org.id,
        Activity.is_active == True
    ).all()

    if not sites:
        print("❌ No sites found.")
        return
    if not activities:
        print("⚠️  No activities found — shifts will be created without activities.")

    # 08:00 Romania ≈ 06:00 UTC (EET winter) / 05:00 UTC (EEST summer)
    # Current time is Feb, so EET (UTC+2)
    checkin_utc = datetime(today.year, today.month, today.day, 6, 0, 0)
    checkout_utc = datetime(today.year, today.month, today.day, 14, 0, 0)  # 16:00 RO
    break_start_utc = datetime(today.year, today.month, today.day, 10, 0, 0)  # 12:00 RO
    break_end_utc = datetime(today.year, today.month, today.day, 10, 30, 0)   # 12:30 RO

    count = 0
    for user in users:
        existing = db.query(Timesheet).filter(
            Timesheet.owner_user_id == user.id,
            Timesheet.date == today
        ).first()
        if existing:
            print(f"  ⏭️  {user.employee_code} already has timesheet for {today}")
            continue

        site = random.choice(sites)

        # Add some randomness to times (+/- 15 min)
        offset_min = random.randint(-15, 15)
        ci = checkin_utc + timedelta(minutes=offset_min)
        co = checkout_utc + timedelta(minutes=random.randint(-10, 30))
        bs = break_start_utc + timedelta(minutes=random.randint(-10, 10))
        be = bs + timedelta(minutes=random.randint(20, 40))

        # Create timesheet
        ts = Timesheet(
            organization_id=user.organization_id,
            date=today,
            owner_type="USER",
            owner_user_id=user.id,
            team_category="NO_TEAM",
            status="DRAFT",
        )
        db.add(ts)
        db.flush()

        # Create segment (complete shift)
        seg = TimesheetSegment(
            timesheet_id=ts.id,
            site_id=site.id,
            check_in_time=ci,
            check_out_time=co,
            break_start_time=bs,
            break_end_time=be,
            check_in_latitude=getattr(site, 'latitude', None),
            check_in_longitude=getattr(site, 'longitude', None),
            check_out_latitude=getattr(site, 'latitude', None),
            check_out_longitude=getattr(site, 'longitude', None),
            is_within_geofence=True,
        )
        db.add(seg)
        db.flush()

        # Add 2-3 random activities
        if activities:
            chosen = random.sample(activities, min(random.randint(2, 3), len(activities)))
            for act in chosen:
                qty = round(random.uniform(1, 50), 1)
                line = TimesheetLine(
                    timesheet_id=ts.id,
                    segment_id=seg.id,
                    activity_id=act.id,
                    quantity_numeric=Decimal(str(qty)),
                    unit_type=act.unit_type or "buc",
                )
                db.add(line)

        count += 1
        print(f"  🔨 {user.employee_code} — {site.name} — {ci.strftime('%H:%M')}-{co.strftime('%H:%M')} UTC — {len(chosen) if activities else 0} activități")

    db.commit()
    print(f"\n⏰ {count} test workers clocked in+out for {today}")


def main():
    db = SessionLocal()
    try:
        print("=== Seed Test Workers ===\n")
        users = seed_workers(db)
        if not users:
            return
        print(f"\n📋 {len(users)} test workers ready (PIN: {PIN})\n")
        print("=== Auto Clock-In Today ===\n")
        auto_clockin_today(db, users)
    finally:
        db.close()


if __name__ == "__main__":
    main()

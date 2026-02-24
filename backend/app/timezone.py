"""
Timezone helpers for Romanian time.
Render server runs UTC — all timestamps must be in Europe/Bucharest.
"""
from datetime import datetime, date
from zoneinfo import ZoneInfo

RO_TZ = ZoneInfo("Europe/Bucharest")


def now_ro() -> datetime:
    """Current time in Romania (naive datetime for DB storage)"""
    return datetime.now(RO_TZ).replace(tzinfo=None)


def today_ro() -> date:
    """Current date in Romania"""
    return datetime.now(RO_TZ).date()

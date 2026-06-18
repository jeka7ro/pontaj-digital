"""
Timezone helpers for Romanian time.
Render server runs UTC — all timestamps must be in Europe/Bucharest.
"""
from datetime import datetime, date
from zoneinfo import ZoneInfo

DE_TZ = ZoneInfo("Europe/Berlin")


def get_local_now() -> datetime:
    """Current time in Romania (naive datetime for DB storage)"""
    return datetime.now(DE_TZ).replace(tzinfo=None)


def get_local_today() -> date:
    """Current date in Romania"""
    return datetime.now(DE_TZ).date()
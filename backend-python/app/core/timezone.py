"""Vietnam wall-clock times used by the existing DATETIME columns."""
from datetime import datetime, timedelta, timezone
from typing import Optional


VIETNAM_TIMEZONE = timezone(timedelta(hours=7))


def vietnam_now() -> datetime:
    # MySQL DATETIME stores no offset; keep the established Vietnam local time.
    return datetime.now(VIETNAM_TIMEZONE).replace(tzinfo=None)


def with_vietnam_timezone(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=VIETNAM_TIMEZONE)
    return value.astimezone(VIETNAM_TIMEZONE)

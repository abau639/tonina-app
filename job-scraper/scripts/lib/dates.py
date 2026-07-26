"""Business-day date math for staleness (weekends excluded).

'Stale' means a job hasn't been re-confirmed in more than N business days. We count
Mon-Fri only; US federal holidays are ignored by default (a holiday just makes a job
look one business-day 'fresher', which is harmless and conservative). Pass a set of
holiday dates to `business_days_between` if you want them excluded too.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta


def to_date(v) -> date | None:
    """Parse a SQLite timestamp/date string (or datetime/date) into a date."""
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    s = str(v).strip().replace("T", " ")
    s = s.split(" ")[0]  # drop any time component
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        return None


def business_days_between(d_from, d_to, holidays: set[date] | None = None) -> int | None:
    """Number of business days in the interval (d_from, d_to] — i.e. weekdays
    strictly after d_from up to and including d_to. Returns 0 if d_to <= d_from,
    or None if either date can't be parsed."""
    a = to_date(d_from)
    b = to_date(d_to)
    if a is None or b is None:
        return None
    if b <= a:
        return 0
    holidays = holidays or set()
    days = 0
    cur = a
    while cur < b:
        cur += timedelta(days=1)
        if cur.weekday() < 5 and cur not in holidays:  # Mon=0 .. Fri=4
            days += 1
    return days

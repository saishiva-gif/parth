import calendar
from datetime import date, datetime, timedelta

from . import mou as mou_lib


def _month_end(year: int, month: int, today: date) -> date:
    last_day = calendar.monthrange(year, month)[1]
    end = date(year, month, last_day)
    return min(end, today)


def _iso_week_key(day_str: str) -> tuple[int, int]:
    iso_year, iso_week, _ = date.fromisoformat(day_str).isocalendar()
    return (iso_year, iso_week)


def _iso_week_end(iso_year: int, iso_week: int) -> date:
    monday = date.fromisocalendar(iso_year, iso_week, 1)
    return monday + timedelta(days=6)  # Sunday


def _week_over_week_trend(days: dict, today: date):
    """% change between the last two FULLY COMPLETE ISO weeks (Mon-Sun) —
    the current, still-in-progress week is always excluded so a half-empty
    week never gets compared against a full one."""
    week_totals: dict[tuple[int, int], int] = {}
    for d, c in days.items():
        key = _iso_week_key(d)
        week_totals[key] = week_totals.get(key, 0) + c

    complete_weeks = sorted(key for key in week_totals if _iso_week_end(*key) < today)
    if len(complete_weeks) < 2:
        return None

    latest, previous = week_totals[complete_weeks[-1]], week_totals[complete_weeks[-2]]
    if previous == 0:
        return None
    return (latest - previous) / previous * 100


def _classify(pct, thresholds):
    if pct is None:
        return "no_mou"
    if pct < thresholds["under_pct"]:
        return "under"
    if pct > thresholds["over_pct"]:
        return "over"
    return "on_track"


def compute_dashboard(usage_rows: list[dict], mou_index: dict, thresholds: dict, metrics: list[str], today: date, fetched_through: str | None) -> dict:
    # usage[metric][username][day] = count
    usage: dict = {m: {} for m in metrics}
    for r in usage_rows:
        if r["api_type"] not in usage:
            continue
        usage[r["api_type"]].setdefault(r["username"], {})[r["day"]] = r["count"]

    current_month = today.strftime("%Y-%m")
    last_month = (today.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")

    result_metrics = {}
    for metric in metrics:
        usernames = set(usage[metric].keys()) | mou_lib.known_usernames(mou_index, metric)
        accounts_out = []

        for username in sorted(usernames):
            days = usage[metric].get(username, {})

            months_present = sorted({day[:7] for day in days})
            if current_month not in months_present:
                months_present.append(current_month)
                months_present.sort()

            months_out = []
            for month_str in months_present:
                year, month = int(month_str[:4]), int(month_str[5:7])
                month_actual = sum(c for d, c in days.items() if d.startswith(month_str))
                as_of = _month_end(year, month, today)
                month_mou = mou_lib.resolve_mou(mou_index, username, metric, as_of)
                months_out.append({"month": month_str, "actual": month_actual, "mou": month_mou})

            mtd_usage = next((m["actual"] for m in months_out if m["month"] == current_month), 0)
            last_month_usage = sum(c for d, c in days.items() if d.startswith(last_month))
            days_elapsed = sum(1 for d in days if d.startswith(current_month))
            days_in_month = calendar.monthrange(today.year, today.month)[1]
            pace_projected = (mtd_usage / days_elapsed * days_in_month) if days_elapsed > 0 else 0.0

            mou_monthly = mou_lib.resolve_mou(mou_index, username, metric, today)

            pct_of_mou = (pace_projected / mou_monthly * 100) if mou_monthly else None
            alert = _classify(pct_of_mou, thresholds)

            trend = _week_over_week_trend(days, today)

            accounts_out.append(
                {
                    "account": username,
                    "databricks_username": username,
                    "mou_monthly": mou_monthly,
                    "mtd_usage": mtd_usage,
                    "is_active": mtd_usage > 0,
                    "is_active_last_month": last_month_usage > 0,
                    "pace_projected": round(pace_projected, 1),
                    "pct_of_mou": round(pct_of_mou, 1) if pct_of_mou is not None else None,
                    "alert": alert,
                    "trend_wow_pct": round(trend, 1) if trend is not None else None,
                    "months": months_out,
                }
            )

        summary = {
            "under": sum(1 for a in accounts_out if a["alert"] == "under"),
            "on_track": sum(1 for a in accounts_out if a["alert"] == "on_track"),
            "over": sum(1 for a in accounts_out if a["alert"] == "over"),
            "no_mou": sum(1 for a in accounts_out if a["alert"] == "no_mou"),
            "active": sum(1 for a in accounts_out if a["is_active"]),
            "active_last_month": sum(1 for a in accounts_out if a["is_active_last_month"]),
            "total_mtd_usage": sum(a["mtd_usage"] for a in accounts_out),
            "total_mou": sum(a["mou_monthly"] for a in accounts_out if a["mou_monthly"]),
        }

        result_metrics[metric] = {"summary": summary, "accounts": accounts_out}

    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "fetched_through": fetched_through,
        "thresholds": thresholds,
        "metrics": result_metrics,
    }

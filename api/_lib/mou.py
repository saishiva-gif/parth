from datetime import date

from . import storage


def _parse_date(s):
    return date.fromisoformat(s)


def build_index(rows: list[dict]) -> dict:
    """Returns {(databricks_username, metric): [rows sorted by effective_from]}."""
    index: dict = {}
    for row in rows:
        usernames = row["databricks_username"]
        if isinstance(usernames, str):
            usernames = [usernames]
        for username in usernames:
            key = (username, row["metric"])
            index.setdefault(key, []).append(row)
    for key in index:
        index[key].sort(key=lambda r: r["effective_from"])
    return index


def load_mou_index() -> dict:
    return build_index(storage.load_mou_config())


def resolve_mou(index: dict, username: str, metric: str, on_date: date):
    """Returns mou_monthly effective on `on_date`, or None."""
    rows = index.get((username, metric), [])
    match = None
    for row in rows:
        starts = _parse_date(row["effective_from"])
        ends = _parse_date(row["effective_to"]) if row.get("effective_to") else None
        if starts <= on_date and (ends is None or on_date <= ends):
            match = row
    return float(match["mou_monthly"]) if match else None


def known_usernames(index: dict, metric: str) -> set:
    """Every username that has ANY MOU row (past or present) for this metric."""
    return {username for (username, m), rows in index.items() if m == metric and rows}

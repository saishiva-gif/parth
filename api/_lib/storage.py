import uuid

from . import config, kv


def load_usage() -> dict:
    """Returns {"fetched_through": str|None, "rows": [...]}."""
    return kv.get("usage", {"fetched_through": None, "rows": []})


def save_usage(data: dict) -> None:
    kv.set("usage", data)


def load_mou_config() -> list[dict]:
    """Returns the editable MOU rows. On first run, seeds from
    config/parth_mous.yaml (the original hand-maintained file) so existing
    placeholder/real entries aren't lost when the in-app editor takes over."""
    existing = kv.get("mou_config", None)
    if existing is not None:
        return existing

    seeded = config.load_mou_rows()
    for row in seeded:
        row.setdefault("id", str(uuid.uuid4()))
        usernames = row["databricks_username"]
        if isinstance(usernames, list):
            row["databricks_username"] = usernames[0]
    save_mou_config(seeded)
    return seeded


def save_mou_config(rows: list[dict]) -> None:
    for row in rows:
        row.setdefault("id", str(uuid.uuid4()))
    kv.set("mou_config", rows)


def merge_usage(existing: dict, new_rows: list[dict], new_fetched_through: str) -> dict:
    """Additive merge, keyed by (username, day, api_type) — never overwrites
    historical days, only adds/replaces rows within the newly-fetched range."""
    by_key = {(r["username"], r["day"], r["api_type"]): r for r in existing["rows"]}
    for r in new_rows:
        by_key[(r["username"], r["day"], r["api_type"])] = r
    return {
        "fetched_through": new_fetched_through,
        "rows": list(by_key.values()),
    }

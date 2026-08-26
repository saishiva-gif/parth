import time

import requests

from . import config

# Only these two api_types are ever queried — Parth billing counts the
# *_WITHOUT_VOICEMAIL meters exclusively (the inverse of the ClickPost Signal
# scoring engine's convention, where _WITHOUT_VOICEMAIL is diagnostic-only).
BASE_QUERY = """
select au.username, bd.day, bd.count, be.api_type
from {catalog}.bronze.billing_dailyapicount bd,
     {catalog}.bronze.billing_enterprisebillingservice be,
     {catalog}.bronze.signup_enterpriseuserprofile_safe se,
     {catalog}.bronze.auth_user au
where bd.billing_service_id = be.id
  and bd.day >= '{start}'
  and bd.day <  '{end}'
  and be.enterprise_user_id = se.id
  and se.is_test = 'false'
  and se.is_active = 'true'
  and se.user_id_id = au.id
  and be.api_type in ('NDR_AI_AGENT_WITHOUT_VOICEMAIL', 'ORDER_CONFIRMATION_WITHOUT_VOICEMAIL')
  and se.id not in (select enterprise_user_profile_id from {catalog}.bronze.return_plugin_enterprisereturnpluginaccount)
order by au.username, be.api_type, bd.day
"""

POLL_INTERVAL_SECONDS = 2
POLL_TIMEOUT_SECONDS = 280  # keep well under Vercel's function execution limit


def _warehouse_id() -> str:
    # DATABRICKS_HTTP_PATH looks like "/sql/1.0/warehouses/<id>"
    return config.DATABRICKS_HTTP_PATH.rstrip("/").rsplit("/", 1)[-1]


def _headers() -> dict:
    return {"Authorization": f"Bearer {config.DATABRICKS_TOKEN}"}


def _base_url() -> str:
    return f"https://{config.DATABRICKS_SERVER_HOSTNAME}"


def _wait_for_result(statement: dict) -> dict:
    """Polls until the statement reaches a terminal state, returns the final
    status payload (containing `manifest` and the first result chunk)."""
    started = time.monotonic()
    while statement["status"]["state"] in ("PENDING", "RUNNING"):
        if time.monotonic() - started > POLL_TIMEOUT_SECONDS:
            raise RuntimeError(f"Databricks statement {statement['statement_id']} timed out waiting for a result")
        time.sleep(POLL_INTERVAL_SECONDS)
        resp = requests.get(
            f"{_base_url()}/api/2.0/sql/statements/{statement['statement_id']}",
            headers=_headers(),
            timeout=30,
        )
        resp.raise_for_status()
        statement = resp.json()

    if statement["status"]["state"] != "SUCCEEDED":
        error = statement["status"].get("error", {})
        raise RuntimeError(
            f"Databricks query failed ({statement['status']['state']}): "
            f"{error.get('error_code')} {error.get('message')}"
        )
    return statement


def _collect_rows(statement: dict) -> list[list]:
    """Follows result chunk pagination and returns every row as a raw list
    of column values (position order matches `manifest.schema.columns`)."""
    rows = list(statement["result"]["data_array"])
    next_chunk = statement["result"].get("next_chunk_index")
    while next_chunk is not None:
        resp = requests.get(
            f"{_base_url()}/api/2.0/sql/statements/{statement['statement_id']}/result/chunks/{next_chunk}",
            headers=_headers(),
            timeout=30,
        )
        resp.raise_for_status()
        chunk = resp.json()
        rows.extend(chunk["data_array"])
        next_chunk = chunk.get("next_chunk_index")
    return rows


def fetch_usage_rows(start_date: str, end_date: str) -> list[dict]:
    """Fetch daily usage rows for [start_date, end_date). Raises on any
    connection/query failure — callers must not treat an exception as zero
    usage and must not advance the watermark on failure."""
    if not (config.DATABRICKS_SERVER_HOSTNAME and config.DATABRICKS_HTTP_PATH and config.DATABRICKS_TOKEN):
        raise RuntimeError(
            "Missing Databricks credentials — set DATABRICKS_SERVER_HOSTNAME, "
            "DATABRICKS_HTTP_PATH, and DATABRICKS_TOKEN."
        )

    query = BASE_QUERY.format(catalog=config.DATABRICKS_CATALOG, start=start_date, end=end_date)

    resp = requests.post(
        f"{_base_url()}/api/2.0/sql/statements",
        headers=_headers(),
        json={
            "statement": query,
            "warehouse_id": _warehouse_id(),
            "wait_timeout": "30s",
            "on_wait_timeout": "CONTINUE",
            "format": "JSON_ARRAY",
            "disposition": "INLINE",
        },
        timeout=45,
    )
    resp.raise_for_status()
    statement = _wait_for_result(resp.json())

    columns = [c["name"] for c in statement["manifest"]["schema"]["columns"]]
    raw_rows = _collect_rows(statement)

    out = []
    for values in raw_rows:
        row = dict(zip(columns, values))
        out.append(
            {
                "username": row["username"],
                "day": row["day"],
                "count": int(row["count"]),
                "api_type": row["api_type"],
            }
        )
    return out

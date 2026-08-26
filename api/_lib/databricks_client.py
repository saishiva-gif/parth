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


def fetch_usage_rows(start_date: str, end_date: str) -> list[dict]:
    """Fetch daily usage rows for [start_date, end_date). Raises on any
    connection/query failure — callers must not treat an exception as zero
    usage and must not advance the watermark on failure."""
    from databricks import sql as dbsql

    if not (config.DATABRICKS_SERVER_HOSTNAME and config.DATABRICKS_HTTP_PATH and config.DATABRICKS_TOKEN):
        raise RuntimeError(
            "Missing Databricks credentials — set DATABRICKS_SERVER_HOSTNAME, "
            "DATABRICKS_HTTP_PATH, and DATABRICKS_TOKEN."
        )

    query = BASE_QUERY.format(catalog=config.DATABRICKS_CATALOG, start=start_date, end=end_date)

    with dbsql.connect(
        server_hostname=config.DATABRICKS_SERVER_HOSTNAME,
        http_path=config.DATABRICKS_HTTP_PATH,
        access_token=config.DATABRICKS_TOKEN,
    ) as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            cols = [c[0] for c in cur.description]
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]

    return [
        {
            "username": r["username"],
            "day": r["day"].isoformat() if hasattr(r["day"], "isoformat") else str(r["day"]),
            "count": int(r["count"]),
            "api_type": r["api_type"],
        }
        for r in rows
    ]

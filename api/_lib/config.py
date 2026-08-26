import os
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
CONFIG_DIR = REPO_ROOT / "config"

# Serverless filesystems are read-only outside /tmp in production. Local JSON
# storage is fine for `vercel dev` / local runs, but does NOT persist across
# invocations once deployed to Vercel — swap storage.py for Vercel
# Blob/KV/Postgres before relying on this in production. See README.
DATA_DIR = Path("/tmp/parth-usage") if os.environ.get("VERCEL") else REPO_ROOT / "data"

DATABRICKS_SERVER_HOSTNAME = os.environ.get("DATABRICKS_SERVER_HOSTNAME")
DATABRICKS_HTTP_PATH = os.environ.get("DATABRICKS_HTTP_PATH")
DATABRICKS_TOKEN = os.environ.get("DATABRICKS_TOKEN")
DATABRICKS_CATALOG = os.environ.get("DATABRICKS_CATALOG", "clickpost_poc_may_18_v2")

# Vercel's Postgres (Neon) integration injects POSTGRES_URL; a plain
# Postgres/Neon project typically uses DATABASE_URL. Either works — when
# unset, storage.py falls back to local JSON files (dev only, see README).
DATABASE_URL = os.environ.get("POSTGRES_URL") or os.environ.get("DATABASE_URL")

METRICS = ["NDR_AI_AGENT_WITHOUT_VOICEMAIL", "ORDER_CONFIRMATION_WITHOUT_VOICEMAIL"]


def load_thresholds() -> dict:
    path = CONFIG_DIR / "thresholds.yaml"
    with open(path) as f:
        cfg = yaml.safe_load(f) or {}
    return {
        "under_pct": float(cfg.get("under_pct", 80)),
        "over_pct": float(cfg.get("over_pct", 120)),
    }


def load_mou_rows() -> list[dict]:
    path = CONFIG_DIR / "parth_mous.yaml"
    with open(path) as f:
        rows = yaml.safe_load(f) or []
    return rows

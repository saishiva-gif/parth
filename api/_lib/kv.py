"""Tiny JSON key-value store. Uses Postgres when DATABASE_URL is set
(production), falls back to local JSON files otherwise (local dev only —
Vercel's serverless filesystem doesn't persist across invocations)."""

import json

from . import config

TABLE = "parth_kv_store"


def _use_postgres() -> bool:
    return bool(config.DATABASE_URL)


def _pg_connect():
    import psycopg

    return psycopg.connect(config.DATABASE_URL, autocommit=True)


def _pg_ensure_table(conn):
    conn.execute(
        f"""
        create table if not exists {TABLE} (
            key text primary key,
            value jsonb not null,
            updated_at timestamptz not null default now()
        )
        """
    )


def _local_path(key: str):
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    return config.DATA_DIR / f"{key}.json"


def get(key: str, default):
    if _use_postgres():
        with _pg_connect() as conn:
            _pg_ensure_table(conn)
            row = conn.execute(f"select value from {TABLE} where key = %s", (key,)).fetchone()
            return row[0] if row else default

    path = _local_path(key)
    if not path.exists():
        return default
    with open(path) as f:
        return json.load(f)


def set(key: str, value) -> None:
    if _use_postgres():
        from psycopg.types.json import Jsonb

        with _pg_connect() as conn:
            _pg_ensure_table(conn)
            conn.execute(
                f"""
                insert into {TABLE} (key, value, updated_at)
                values (%s, %s, now())
                on conflict (key) do update set value = excluded.value, updated_at = now()
                """,
                (key, Jsonb(value)),
            )
        return

    path = _local_path(key)
    with open(path, "w") as f:
        json.dump(value, f)

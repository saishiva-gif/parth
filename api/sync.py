import json
import os
import traceback
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler

from _lib import config, storage
from _lib.databricks_client import fetch_usage_rows


def run_sync() -> dict:
    existing = storage.load_usage()

    if existing["fetched_through"] is None:
        # First-ever run — backfill ~6 months so the MoM view isn't empty.
        # Adjust as needed once real history requirements are known.
        start = date.today() - timedelta(days=180)
    else:
        start = date.fromisoformat(existing["fetched_through"]) + timedelta(days=1)

    end = date.today()  # exclusive upper bound in the query — pulls through yesterday

    if start >= end:
        return {"status": "noop", "reason": "already up to date", "fetched_through": existing["fetched_through"]}

    new_rows = fetch_usage_rows(start.isoformat(), end.isoformat())

    if not new_rows and existing["rows"]:
        # We've synced successfully before but got zero rows this time even
        # though accounts have prior usage — more likely a broken query/join
        # than every account going to zero simultaneously. Abort loudly
        # rather than silently advancing the watermark over a real gap.
        raise RuntimeError(
            f"Databricks query for {start} to {end} returned 0 rows, but usage history exists. "
            "Refusing to advance the watermark — investigate before re-running."
        )

    new_fetched_through = (end - timedelta(days=1)).isoformat()
    merged = storage.merge_usage(existing, new_rows, new_fetched_through)
    storage.save_usage(merged)

    return {
        "status": "ok",
        "rows_fetched": len(new_rows),
        "range": [start.isoformat(), end.isoformat()],
        "fetched_through": new_fetched_through,
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        cron_secret = os.environ.get("CRON_SECRET")
        if cron_secret:
            auth = self.headers.get("Authorization", "")
            if auth != f"Bearer {cron_secret}":
                self.send_response(401)
                self.end_headers()
                self.wfile.write(b"Unauthorized")
                return

        try:
            result = run_sync()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        except Exception as e:
            traceback.print_exc()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "error", "error": str(e)}).encode())

import json
import sys
import traceback
from datetime import date
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _lib import config, storage

ALLOWED_METRICS = set(config.METRICS)
REQUIRED_FIELDS = {"databricks_username", "metric", "mou_monthly"}


def _validate(rows: list[dict]) -> list[dict]:
    if not isinstance(rows, list):
        raise ValueError("Expected a JSON array of MOU rows")

    cleaned = []
    for i, row in enumerate(rows):
        missing = REQUIRED_FIELDS - row.keys()
        if missing:
            raise ValueError(f"Row {i}: missing fields {sorted(missing)}")
        if row["metric"] not in ALLOWED_METRICS:
            raise ValueError(f"Row {i}: metric must be one of {sorted(ALLOWED_METRICS)}")
        if not str(row["databricks_username"]).strip():
            raise ValueError(f"Row {i}: databricks_username cannot be empty")
        try:
            mou_monthly = float(row["mou_monthly"])
        except (TypeError, ValueError):
            raise ValueError(f"Row {i}: mou_monthly must be a number")
        if mou_monthly < 0:
            raise ValueError(f"Row {i}: mou_monthly cannot be negative")

        effective_from = row.get("effective_from") or date.today().isoformat()
        try:
            date.fromisoformat(effective_from)
        except ValueError:
            raise ValueError(f"Row {i}: effective_from must be YYYY-MM-DD")

        effective_to = row.get("effective_to") or None
        if effective_to:
            try:
                date.fromisoformat(effective_to)
            except ValueError:
                raise ValueError(f"Row {i}: effective_to must be YYYY-MM-DD")

        cleaned.append(
            {
                "id": row.get("id"),
                "databricks_username": str(row["databricks_username"]).strip(),
                "metric": row["metric"],
                "mou_monthly": mou_monthly,
                "effective_from": effective_from,
                "effective_to": effective_to,
            }
        )
    return cleaned


class handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: dict):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        try:
            self._send_json(200, {"rows": storage.load_mou_config()})
        except Exception as e:
            traceback.print_exc()
            self._send_json(500, {"error": str(e)})

    def do_PUT(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length) if length else b"[]"
            payload = json.loads(body)
            rows = _validate(payload.get("rows", payload))
            storage.save_mou_config(rows)
            self._send_json(200, {"rows": rows})
        except ValueError as e:
            self._send_json(400, {"error": str(e)})
        except Exception as e:
            traceback.print_exc()
            self._send_json(500, {"error": str(e)})

    def do_POST(self):
        self.do_PUT()

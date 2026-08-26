import json
import sys
import traceback
from datetime import date
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _lib import config, storage
from _lib.alerts import compute_dashboard
from _lib.mou import load_mou_index


def build_response() -> dict:
    usage = storage.load_usage()
    mou_index = load_mou_index()
    thresholds = config.load_thresholds()
    result = compute_dashboard(
        usage_rows=usage["rows"],
        mou_index=mou_index,
        thresholds=thresholds,
        metrics=config.METRICS,
        today=date.today(),
        fetched_through=usage["fetched_through"],
    )
    result["storage_backend"] = "postgres" if config.DATABASE_URL else "local-file (NOT persistent on Vercel)"
    return result


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            result = build_response()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        except Exception as e:
            traceback.print_exc()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

import json
import traceback
from http.server import BaseHTTPRequestHandler

from _lib import storage


def list_known_usernames() -> list[str]:
    """Distinct usernames seen in Databricks usage data — used to suggest
    matches in the MOU editor so a typo can't silently create a row that
    never joins to real usage (a naming mismatch)."""
    rows = storage.load_usage()["rows"]
    return sorted({r["username"] for r in rows})


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            body = json.dumps({"usernames": list_known_usernames()}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            traceback.print_exc()
            body = json.dumps({"error": str(e)}).encode()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)

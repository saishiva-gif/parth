"""Local-only dev server that runs the /api Python logic directly, without
needing the Vercel CLI. NOT used in production — Vercel deploys api/*.py as
serverless functions directly; this just mirrors that routing for `npm run dev`.
"""

import json
import os
import sys
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "api"))

env_file = ROOT / ".env.local"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())

import data as data_mod  # noqa: E402
import mous as mous_mod  # noqa: E402
import sync as sync_mod  # noqa: E402
import usernames as usernames_mod  # noqa: E402
from _lib import storage  # noqa: E402


class DevHandler(BaseHTTPRequestHandler):
    def _json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        try:
            if self.path.startswith("/api/data"):
                self._json(200, data_mod.build_response())
            elif self.path.startswith("/api/mous"):
                self._json(200, {"rows": storage.load_mou_config()})
            elif self.path.startswith("/api/sync"):
                self._json(200, sync_mod.run_sync())
            elif self.path.startswith("/api/usernames"):
                self._json(200, {"usernames": usernames_mod.list_known_usernames()})
            else:
                self._json(404, {"error": "not found"})
        except Exception as e:
            traceback.print_exc()
            self._json(500, {"error": str(e)})

    def do_PUT(self):
        try:
            if self.path.startswith("/api/mous"):
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length) if length else b"{}"
                payload = json.loads(body)
                rows = mous_mod._validate(payload.get("rows", payload))
                storage.save_mou_config(rows)
                self._json(200, {"rows": rows})
            else:
                self._json(404, {"error": "not found"})
        except ValueError as e:
            self._json(400, {"error": str(e)})
        except Exception as e:
            traceback.print_exc()
            self._json(500, {"error": str(e)})

    def do_POST(self):
        self.do_PUT()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,PUT,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    port = 3001
    server = ThreadingHTTPServer(("127.0.0.1", port), DevHandler)
    print(f"Local API dev server running at http://127.0.0.1:{port}")
    server.serve_forever()

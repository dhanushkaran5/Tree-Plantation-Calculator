"""Flask API and static file server for EcoTree Impact Analyzer."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict

from flask import Flask, jsonify, request, send_from_directory
from werkzeug.exceptions import BadRequest, HTTPException

try:
    from flask_cors import CORS
    HAS_CORS = True
except ImportError:
    HAS_CORS = False

import database

# Production Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ecotree_backend")

BASE_DIR = Path(__file__).resolve().parents[1]
API_PREFIX = "/api"

app = Flask(
    __name__,
    static_folder=str(BASE_DIR),
    static_url_path="",
)

# Enable CORS for production frontend communication
frontend_url = os.environ.get("FRONTEND_URL", "*")
if HAS_CORS:
    CORS(app, resources={r"/api/*": {"origins": frontend_url}})
else:
    @app.after_request
    def apply_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = frontend_url
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
        return response


@app.errorhandler(Exception)
def handle_global_exception(error):
    if isinstance(error, HTTPException):
        return _json_response({"status": "error", "message": error.description}, status=error.code)
    logger.error("Unhandled Exception: %s", str(error), exc_info=True)
    return _json_response({"status": "error", "message": "Internal Server Error"}, status=500)


def _json_response(payload: Dict[str, Any], status: int = 200):
    return jsonify(payload), status


@app.get(f"{API_PREFIX}/health")
def health():
    return _json_response({"status": "ok", "environment": os.environ.get("FLASK_ENV", "production")})


@app.get(f"{API_PREFIX}/bootstrap")
def bootstrap():
    entries = database.get_all_entries()
    return _json_response({"status": "ok", "data": entries})


@app.post(f"{API_PREFIX}/store")
def store():
    try:
        payload = request.get_json(force=True)
    except BadRequest as exc:
        raise BadRequest("Invalid JSON payload") from exc

    key = payload.get("key")
    value = payload.get("value")

    if not key:
        raise BadRequest("Missing 'key' field in payload")

    # JSON.stringify already produced a string; ensure we store text
    serialized_value = value if isinstance(value, str) else json.dumps(value)
    database.upsert_entry(key, serialized_value)
    return _json_response({"status": "ok", "key": key})


@app.delete(f"{API_PREFIX}/store/<path:key>")
def delete_key(key: str):
    database.delete_entry(key)
    return _json_response({"status": "ok", "key": key})


@app.get("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")


@app.get("/<path:asset_path>")
def serve_asset(asset_path: str):
    asset = BASE_DIR / asset_path
    if asset.exists() and asset.is_file():
        return send_from_directory(app.static_folder, asset_path)
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get("FLASK_DEBUG", "False").lower() in ("true", "1")
    logger.info("Starting EcoTree backend server on port %d (debug=%s)", port, debug_mode)
    app.run(host="0.0.0.0", port=port, debug=debug_mode)




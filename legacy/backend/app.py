"""Flask API and static file server for EcoTree Impact Analyzer."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from flask import Flask, jsonify, request, send_from_directory
from werkzeug.exceptions import BadRequest

import database

BASE_DIR = Path(__file__).resolve().parents[1]
API_PREFIX = "/api"

app = Flask(
    __name__,
    static_folder=str(BASE_DIR),
    static_url_path="",
)


def _json_response(payload: Dict[str, Any], status: int = 200):
    return jsonify(payload), status


@app.get(f"{API_PREFIX}/health")
def health():
    return _json_response({"status": "ok"})


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
    app.run(host="0.0.0.0", port=5000, debug=True)



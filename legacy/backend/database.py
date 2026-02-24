"""SQLite helpers for EcoTree persistent storage."""

from __future__ import annotations

import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Dict

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "eco_tree.db"


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def initialize() -> None:
    """Create the key-value table if it does not exist."""
    with closing(get_connection()) as conn:
        with conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS kv_store (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )


def get_all_entries() -> Dict[str, str]:
    with closing(get_connection()) as conn:
        rows = conn.execute("SELECT key, value FROM kv_store").fetchall()
    return {row["key"]: row["value"] for row in rows}


def upsert_entry(key: str, value: str) -> None:
    with closing(get_connection()) as conn:
        with conn:
            conn.execute(
                """
                INSERT INTO kv_store(key, value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (key, value),
            )


def delete_entry(key: str) -> None:
    with closing(get_connection()) as conn:
        with conn:
            conn.execute("DELETE FROM kv_store WHERE key = ?", (key,))


initialize()



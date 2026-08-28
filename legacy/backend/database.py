"""SQLAlchemy helpers for EcoTree persistent storage."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Dict

# Add the root directory to sys.path so we can import config.database
BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from sqlalchemy import Column, String, DateTime, text
from config.database import Base, engine, SessionLocal

class KVStore(Base):
    __tablename__ = 'kv_store'
    key = Column(String, primary_key=True)
    value = Column(String)
    updated_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"), onupdate=text("CURRENT_TIMESTAMP"))

def initialize() -> None:
    """Create the key-value table if it does not exist."""
    Base.metadata.create_all(bind=engine)

def get_all_entries() -> Dict[str, str]:
    with SessionLocal() as db:
        rows = db.query(KVStore).all()
        return {row.key: row.value for row in rows}

def upsert_entry(key: str, value: str) -> None:
    with SessionLocal() as db:
        entry = db.query(KVStore).filter_by(key=key).first()
        if entry:
            entry.value = value
        else:
            entry = KVStore(key=key, value=value)
            db.add(entry)
        db.commit()

def delete_entry(key: str) -> None:
    with SessionLocal() as db:
        entry = db.query(KVStore).filter_by(key=key).first()
        if entry:
            db.delete(entry)
            db.commit()

initialize()

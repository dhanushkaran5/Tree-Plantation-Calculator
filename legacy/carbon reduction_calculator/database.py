"""Database helpers for the Tree Plantation Carbon Reduction Calculator."""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Add the root directory to sys.path so we can import config.database
BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from sqlalchemy import Column, Integer, String, Float, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from config.database import Base, engine, SessionLocal

CURRENT_DIR = Path(__file__).resolve().parent
TREES_JSON = CURRENT_DIR / "trees.json"
CITIES_JSON = CURRENT_DIR / "cities.json"

class Tree(Base):
    __tablename__ = 'trees'
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    absorption_rate = Column(Float, nullable=False)
    
    recommendations = relationship("Recommendation", back_populates="tree")

class City(Base):
    __tablename__ = 'cities'
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    climate = Column(String, nullable=False)
    
    recommendations = relationship("Recommendation", back_populates="city")

class Recommendation(Base):
    __tablename__ = 'recommendations'
    id = Column(Integer, primary_key=True, autoincrement=True)
    city_id = Column(Integer, ForeignKey('cities.id'), nullable=False)
    tree_id = Column(Integer, ForeignKey('trees.id'), nullable=False)
    
    __table_args__ = (UniqueConstraint('city_id', 'tree_id', name='_city_tree_uc'),)
    
    city = relationship("City", back_populates="recommendations")
    tree = relationship("Tree", back_populates="recommendations")

class History(Base):
    __tablename__ = 'history'
    id = Column(Integer, primary_key=True, autoincrement=True)
    tree_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    city = Column(String, nullable=False)
    total_co2 = Column(Float, nullable=False)
    date = Column(String, nullable=False)

def initialize() -> None:
    """Create tables (if needed) and seed core data."""
    Base.metadata.create_all(bind=engine)
    _seed_reference_data()

def _load_json(path: Path):
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)

def _seed_reference_data() -> None:
    """Populate trees, cities, and recommendations from JSON assets."""
    trees = _load_json(TREES_JSON)
    cities_payload = _load_json(CITIES_JSON)
    cities_list = cities_payload.get("cities", [])
    recommendations_list = cities_payload.get("recommendations", [])

    with SessionLocal() as db:
        for tree_data in trees:
            if not db.query(Tree).filter_by(name=tree_data["name"]).first():
                db.add(Tree(name=tree_data["name"], absorption_rate=tree_data["absorption_rate"]))
        db.commit()

        for city_data in cities_list:
            if not db.query(City).filter_by(name=city_data["name"]).first():
                db.add(City(name=city_data["name"], climate=city_data["climate"]))
        db.commit()

        city_map = {city.name: city.id for city in db.query(City).all()}
        tree_map = {tree.name: tree.id for tree in db.query(Tree).all()}

        for item in recommendations_list:
            city_id = city_map.get(item["city"])
            for tree_name in item.get("trees", []):
                tree_id = tree_map.get(tree_name)
                if city_id and tree_id:
                    if not db.query(Recommendation).filter_by(city_id=city_id, tree_id=tree_id).first():
                        db.add(Recommendation(city_id=city_id, tree_id=tree_id))
        db.commit()

def fetch_trees() -> List[Dict]:
    with SessionLocal() as db:
        return [{"id": t.id, "name": t.name, "absorption_rate": t.absorption_rate} for t in db.query(Tree).order_by(Tree.name).all()]

def fetch_cities() -> List[Dict]:
    with SessionLocal() as db:
        return [{"id": c.id, "name": c.name, "climate": c.climate} for c in db.query(City).order_by(City.name).all()]

def get_tree(tree_id: int) -> Optional[Dict]:
    with SessionLocal() as db:
        t = db.query(Tree).filter_by(id=tree_id).first()
        return {"id": t.id, "name": t.name, "absorption_rate": t.absorption_rate} if t else None

def get_city(city_id: int) -> Optional[Dict]:
    with SessionLocal() as db:
        c = db.query(City).filter_by(id=city_id).first()
        return {"id": c.id, "name": c.name, "climate": c.climate} if c else None

def get_recommendations_for_city(city_id: int) -> List[str]:
    with SessionLocal() as db:
        recs = db.query(Tree.name).join(Recommendation).filter(Recommendation.city_id == city_id).order_by(Tree.name).all()
        return [r[0] for r in recs]

def insert_history(tree_name: str, quantity: int, city: str, total_co2: float) -> None:
    with SessionLocal() as db:
        h = History(
            tree_name=tree_name,
            quantity=quantity,
            city=city,
            total_co2=total_co2,
            date=datetime.utcnow().isoformat()
        )
        db.add(h)
        db.commit()

def fetch_history(limit: int = 25) -> List[Dict]:
    with SessionLocal() as db:
        history = db.query(History).order_by(History.date.desc()).limit(limit).all()
        return [{"tree_name": h.tree_name, "quantity": h.quantity, "city": h.city, "total_co2": h.total_co2, "date": h.date} for h in history]

def get_total_co2() -> float:
    with SessionLocal() as db:
        total = db.query(func.sum(History.total_co2)).scalar()
        return total or 0.0

def get_chart_points(limit: int = 30) -> Dict[str, float]:
    with SessionLocal() as db:
        rows = db.query(func.substr(History.date, 1, 10).label('label'), func.sum(History.total_co2).label('total')).group_by('label').order_by('label').limit(limit).all()
        return {r.label: r.total for r in rows}

initialize()

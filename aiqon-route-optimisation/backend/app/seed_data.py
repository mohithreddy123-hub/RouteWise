import json
import os
from sqlalchemy.orm import Session
from app import models

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))


def _load_json(filename: str) -> list:
    path = os.path.join(DATA_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def seed_ports(db: Session) -> int:
    ports_data = _load_json("ports.json")
    inserted = 0
    for p in ports_data:
        existing = db.query(models.Port).filter(models.Port.id == p["id"]).first()
        if not existing:
            port = models.Port(**p)
            db.add(port)
            inserted += 1
    db.commit()
    return inserted


def seed_shipments(db: Session) -> int:
    shipments_data = _load_json("shipments_seed.json")
    inserted = 0

    for s in shipments_data:
        existing = db.query(models.Shipment).filter(models.Shipment.id == s["id"]).first()
        if existing:
            continue

        routes_data = s.pop("routes", [])
        shipment = models.Shipment(**{k: v for k, v in s.items() if k != "routes"})
        db.add(shipment)

        for r in routes_data:
            legs_data = r.pop("legs", [])
            route = models.RouteOption(
                shipment_id=shipment.id,
                **{k: v for k, v in r.items() if k != "legs"}
            )
            db.add(route)

            for leg in legs_data:
                leg_id = f"LEG-{route.id}-{leg['leg_order']}"
                route_leg = models.RouteLeg(
                    id=leg_id,
                    route_id=route.id,
                    **leg
                )
                db.add(route_leg)

        inserted += 1

    db.commit()
    return inserted


def seed_all(db: Session) -> dict:
    ports_n = seed_ports(db)
    ships_n = seed_shipments(db)
    return {"ports_inserted": ports_n, "shipments_inserted": ships_n}


def reset_db(db: Session) -> None:
    db.query(models.RouteLeg).delete()
    db.query(models.RouteOption).delete()
    db.query(models.PlannerReview).delete()
    db.query(models.RecommendationEvaluation).delete()
    db.query(models.Shipment).delete()
    db.query(models.Port).delete()
    db.commit()

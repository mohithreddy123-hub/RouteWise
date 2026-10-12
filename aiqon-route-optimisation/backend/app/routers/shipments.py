"""Shipments router."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.database import get_db
from app import models, schemas
from app.services.scoring_service import compute_overall_risk, overall_risk_label

router = APIRouter(prefix="/api/shipments", tags=["shipments"])

DATA_DISCLAIMER = (
    "This application is a decision-support prototype. Shipment records, route options, "
    "costs, transit times, weather scenarios, and risk estimates are synthetic. Illustrative "
    "route corridors are not verified commercial shipping services or exact vessel-navigation "
    "tracks. Human review is required before operational decisions."
)


def _enrich_route(route: models.RouteOption) -> dict:
    overall = compute_overall_risk({
        "delay_probability_percent": route.delay_probability_percent,
        "congestion_risk": route.congestion_risk,
        "geopolitical_risk": route.geopolitical_risk,
        "weather_risk": route.weather_risk,
    })
    legs = []
    for leg in route.legs:
        legs.append({
            "id": leg.id,
            "leg_order": leg.leg_order,
            "from_port_id": leg.from_port_id,
            "to_port_id": leg.to_port_id,
            "from_port": {
                "id": leg.from_port.id, "name": leg.from_port.name,
                "city": leg.from_port.city, "country": leg.from_port.country,
                "lat": leg.from_port.lat, "lon": leg.from_port.lon,
                "port_type": leg.from_port.port_type
            } if leg.from_port else None,
            "to_port": {
                "id": leg.to_port.id, "name": leg.to_port.name,
                "city": leg.to_port.city, "country": leg.to_port.country,
                "lat": leg.to_port.lat, "lon": leg.to_port.lon,
                "port_type": leg.to_port.port_type
            } if leg.to_port else None,
            "transport_mode": leg.transport_mode,
            "distance_km": leg.distance_km,
            "duration_days": leg.duration_days,
            "notes": leg.notes,
        })
    return {
        "id": route.id,
        "route_name": route.route_name,
        "shipment_id": route.shipment_id,
        "transport_mode": route.transport_mode,
        "intermediate_port_ids": route.intermediate_port_ids or [],
        "legs": legs,
        "estimated_cost_usd": route.estimated_cost_usd,
        "estimated_transit_days": route.estimated_transit_days,
        "delay_probability_percent": route.delay_probability_percent,
        "congestion_risk": route.congestion_risk,
        "geopolitical_risk": route.geopolitical_risk,
        "weather_risk": route.weather_risk,
        "carbon_estimate_kg": route.carbon_estimate_kg,
        "capacity_status": route.capacity_status,
        "route_notes": route.route_notes,
        "constraints": route.constraints or [],
        "risk_events": route.risk_events or [],
        "weather_zone": route.weather_zone,
        "overall_risk": round(overall, 2),
        "overall_risk_label": overall_risk_label(overall),
    }


def _port_dict(port: models.Port) -> dict:
    return {
        "id": port.id, "name": port.name, "city": port.city,
        "country": port.country, "lat": port.lat, "lon": port.lon,
        "port_type": port.port_type, "notes": port.notes
    }


@router.get("", response_model=dict)
def list_shipments(
    search: Optional[str] = Query(None),
    origin: Optional[str] = Query(None),
    destination: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(models.Shipment).options(
        joinedload(models.Shipment.origin),
        joinedload(models.Shipment.destination),
        joinedload(models.Shipment.routes),
    )

    if search:
        s = f"%{search.lower()}%"
        query = query.filter(
            models.Shipment.reference_number.ilike(s)
            | models.Shipment.cargo_type.ilike(s)
            | models.Shipment.origin_label.ilike(s)
            | models.Shipment.destination_label.ilike(s)
        )
    if origin:
        query = query.filter(models.Shipment.origin_label.ilike(f"%{origin}%"))
    if destination:
        query = query.filter(models.Shipment.destination_label.ilike(f"%{destination}%"))
    if priority:
        query = query.filter(models.Shipment.priority.ilike(f"%{priority}%"))
    if status:
        query = query.filter(models.Shipment.status.ilike(f"%{status}%"))

    shipments = query.offset(skip).limit(limit).all()

    result = []
    for s in shipments:
        # Compute highest route risk for risk_level filter
        max_risk = "Low"
        for r in s.routes:
            overall = compute_overall_risk({
                "delay_probability_percent": r.delay_probability_percent,
                "congestion_risk": r.congestion_risk,
                "geopolitical_risk": r.geopolitical_risk,
                "weather_risk": r.weather_risk,
            })
            lbl = overall_risk_label(overall)
            if lbl == "High":
                max_risk = "High"
                break
            elif lbl == "Moderate" and max_risk == "Low":
                max_risk = "Moderate"

        if risk_level and max_risk.lower() != risk_level.lower():
            continue

        result.append({
            "id": s.id,
            "reference_number": s.reference_number,
            "cargo_type": s.cargo_type,
            "container_type": s.container_type,
            "container_count": s.container_count,
            "weight_tons": s.weight_tons,
            "priority": s.priority,
            "origin_label": s.origin_label,
            "destination_label": s.destination_label,
            "origin_port_id": s.origin_port_id,
            "destination_port_id": s.destination_port_id,
            "ready_date": s.ready_date,
            "status": s.status,
            "route_count": len(s.routes),
            "max_risk_level": max_risk,
        })

    return {
        "shipments": result,
        "total": len(result),
        "data_disclaimer": DATA_DISCLAIMER,
    }


@router.get("/stats", response_model=dict)
def get_stats(db: Session = Depends(get_db)):
    """Dashboard KPI statistics."""
    shipments = db.query(models.Shipment).options(
        joinedload(models.Shipment.routes)
    ).all()

    total = len(shipments)
    under_review = sum(1 for s in shipments if s.status == "Under Review")

    all_delays = []
    high_risk_count = 0
    for s in shipments:
        for r in s.routes:
            if r.delay_probability_percent is not None:
                all_delays.append(r.delay_probability_percent)
            overall = compute_overall_risk({
                "delay_probability_percent": r.delay_probability_percent,
                "congestion_risk": r.congestion_risk,
                "geopolitical_risk": r.geopolitical_risk,
                "weather_risk": r.weather_risk,
            })
            if overall_risk_label(overall) == "High":
                high_risk_count += 1

    avg_delay = round(sum(all_delays) / len(all_delays), 1) if all_delays else 0.0

    # Risk distribution
    risk_dist = {"Low": 0, "Moderate": 0, "High": 0}
    for s in shipments:
        for r in s.routes:
            overall = compute_overall_risk({
                "delay_probability_percent": r.delay_probability_percent,
                "congestion_risk": r.congestion_risk,
                "geopolitical_risk": r.geopolitical_risk,
                "weather_risk": r.weather_risk,
            })
            lbl = overall_risk_label(overall)
            risk_dist[lbl] = risk_dist.get(lbl, 0) + 1

    return {
        "total_shipments": total,
        "under_review": under_review,
        "avg_delay_probability": avg_delay,
        "high_risk_routes": high_risk_count,
        "risk_distribution": [
            {"name": k, "value": v} for k, v in risk_dist.items()
        ],
    }


@router.get("/{shipment_id}", response_model=dict)
def get_shipment(shipment_id: str, db: Session = Depends(get_db)):
    shipment = db.query(models.Shipment).options(
        joinedload(models.Shipment.origin),
        joinedload(models.Shipment.destination),
        joinedload(models.Shipment.routes).joinedload(models.RouteOption.legs).joinedload(models.RouteLeg.from_port),
        joinedload(models.Shipment.routes).joinedload(models.RouteOption.legs).joinedload(models.RouteLeg.to_port),
    ).filter(models.Shipment.id == shipment_id).first()

    if not shipment:
        raise HTTPException(status_code=404, detail=f"Shipment '{shipment_id}' not found")

    routes = [_enrich_route(r) for r in shipment.routes]

    return {
        "id": shipment.id,
        "reference_number": shipment.reference_number,
        "cargo_type": shipment.cargo_type,
        "container_type": shipment.container_type,
        "container_count": shipment.container_count,
        "weight_tons": shipment.weight_tons,
        "priority": shipment.priority,
        "origin": _port_dict(shipment.origin) if shipment.origin else None,
        "destination": _port_dict(shipment.destination) if shipment.destination else None,
        "origin_label": shipment.origin_label,
        "destination_label": shipment.destination_label,
        "ready_date": shipment.ready_date,
        "status": shipment.status,
        "routes": routes,
        "reviews": [
            {
                "id": rev.id,
                "decision": rev.decision,
                "selected_route_id": rev.selected_route_id,
                "decision_note": rev.decision_note,
                "reviewed_at": rev.reviewed_at.isoformat() if rev.reviewed_at else None,
            }
            for rev in (shipment.planner_reviews or [])
        ],
        "planner_reviews": [
            {
                "id": rev.id,
                "decision": rev.decision,
                "selected_route_id": rev.selected_route_id,
                "decision_note": rev.decision_note,
                "reviewed_at": rev.reviewed_at.isoformat() if rev.reviewed_at else None,
            }
            for rev in (shipment.planner_reviews or [])
        ],
        "data_disclaimer": DATA_DISCLAIMER,
    }


@router.get("/{shipment_id}/routes", response_model=dict)
def get_shipment_routes(shipment_id: str, db: Session = Depends(get_db)):
    shipment = db.query(models.Shipment).filter(models.Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail=f"Shipment '{shipment_id}' not found")

    routes_q = db.query(models.RouteOption).options(
        joinedload(models.RouteOption.legs).joinedload(models.RouteLeg.from_port),
        joinedload(models.RouteOption.legs).joinedload(models.RouteLeg.to_port),
    ).filter(models.RouteOption.shipment_id == shipment_id).all()

    routes = [_enrich_route(r) for r in routes_q]
    return {"shipment_id": shipment_id, "routes": routes}

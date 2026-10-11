"""Weather reassessment router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app import models
from app.schemas import WeatherReassessRequest
from app.services import weather_service, recommendation_service
from app.services.explanation_service import generate_weather_explanation

router = APIRouter(prefix="/api/weather", tags=["weather"])


def _route_orm_to_dict(route: models.RouteOption) -> dict:
    return {
        "id": route.id,
        "route_name": route.route_name,
        "shipment_id": route.shipment_id,
        "transport_mode": route.transport_mode,
        "intermediate_port_ids": route.intermediate_port_ids or [],
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
    }


@router.post("/reassess", response_model=dict)
def reassess_weather(request: WeatherReassessRequest, db: Session = Depends(get_db)):
    """Apply a simulated weather scenario and recalculate route recommendations."""
    shipment = db.query(models.Shipment).options(
        joinedload(models.Shipment.routes)
    ).filter(models.Shipment.id == request.shipment_id).first()

    if not shipment:
        raise HTTPException(
            status_code=404,
            detail=f"Shipment '{request.shipment_id}' not found"
        )

    original_routes = [_route_orm_to_dict(r) for r in shipment.routes]

    # Apply weather scenario to a deep copy — originals never modified
    modified_routes, affected_ids = weather_service.apply_weather_scenario(
        original_routes, request.scenario
    )

    # Get original recommendation (normal conditions)
    original_result = recommendation_service.evaluate_recommendation(
        shipment_id=request.shipment_id,
        weights=request.weights,
        constraints=request.constraints,
        preference=request.preference,
        db=db,
        route_dicts=original_routes,
    )
    prev_rec_id = (
        original_result["recommendation"]["id"]
        if original_result.get("recommendation")
        else None
    )

    # Get new recommendation under weather scenario
    new_result = recommendation_service.evaluate_recommendation(
        shipment_id=request.shipment_id,
        weights=request.weights,
        constraints=request.constraints,
        preference=request.preference,
        db=db,
        route_dicts=modified_routes,
    )

    new_rec = new_result.get("recommendation")
    new_rec_id = new_rec["id"] if new_rec else None
    recommendation_changed = new_rec_id != prev_rec_id

    explanation = generate_weather_explanation(
        scenario=request.scenario,
        recommendation_changed=recommendation_changed,
        new_recommended=new_rec,
        prev_recommended_id=prev_rec_id,
        score_breakdowns=new_result.get("score_breakdowns", []),
        affected_routes=affected_ids,
    )

    return {
        "shipment_id": request.shipment_id,
        "scenario": request.scenario,
        "scenario_label": weather_service.get_scenario_label(request.scenario),
        "affected_routes": affected_ids,
        "modified_routes": new_result.get("eligible_routes", []),
        "original_routes": original_result.get("eligible_routes", []),
        "recommendation": new_rec,
        "score_breakdowns": new_result.get("score_breakdowns", []),
        "explanation": explanation,
        "recommendation_changed": recommendation_changed,
        "previous_recommendation_id": prev_rec_id,
        "data_disclaimer": (
            "Simulated weather scenario — not live weather data. "
            "Values are illustrative and for demonstration only."
        ),
    }


@router.get("/status", response_model=dict)
def weather_status():
    """Return available weather scenarios and their descriptions."""
    return {
        "available_scenarios": [
            {
                "id": "normal",
                "label": "Normal Conditions",
                "description": "No weather disruption. Original route metrics apply.",
                "affected_zones": [],
            },
            {
                "id": "moderate_storm",
                "label": "Moderate Storm Disruption",
                "description": (
                    "A moderate storm system affects selected shipping zones. "
                    "Weather risk and delay probability increase on exposed routes. "
                    "May shift recommendation toward safer alternatives."
                ),
                "affected_zones": [
                    "South China Sea", "Bay of Bengal", "Cape Route",
                    "North Atlantic", "Pacific", "Arabian Sea",
                    "Atlantic", "South Atlantic", "Strait of Malacca", "Red Sea"
                ],
            },
            {
                "id": "severe_weather",
                "label": "Severe Weather Disruption",
                "description": (
                    "Severe weather (typhoon / cyclone / Southern Ocean storm) "
                    "significantly disrupts key shipping zones. "
                    "Routes through affected zones receive major risk and delay increases. "
                    "Recommendation may change substantially."
                ),
                "affected_zones": [
                    "South China Sea", "Bay of Bengal", "Cape Route",
                    "North Atlantic", "Pacific", "Arabian Sea",
                    "Atlantic", "South Atlantic", "Strait of Malacca", "Red Sea"
                ],
            },
        ],
        "notice": (
            "All weather scenarios are simulated for demonstration purposes only. "
            "They do not represent live weather forecasts or actual ocean conditions."
        ),
    }

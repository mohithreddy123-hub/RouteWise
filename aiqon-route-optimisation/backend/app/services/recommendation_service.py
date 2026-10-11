"""
Recommendation service — orchestrates scoring, filtering and explanation.
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app import models
from app.schemas import WeightsSchema, ConstraintsSchema
from app.services import scoring_service, explanation_service


def _route_to_dict(route: models.RouteOption) -> dict:
    """Convert ORM RouteOption to plain dict for scoring."""
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


def evaluate_recommendation(
    shipment_id: str,
    weights: WeightsSchema,
    constraints: ConstraintsSchema,
    preference: str,
    db: Session,
    route_dicts: Optional[List[dict]] = None,  # for weather reassessment override
) -> Dict[str, Any]:
    """
    Core recommendation logic.
    If route_dicts provided, uses those instead of DB routes (for weather reassessment).
    """
    if route_dicts is None:
        shipment = db.query(models.Shipment).filter(models.Shipment.id == shipment_id).first()
        if not shipment:
            return {"error": f"Shipment '{shipment_id}' not found"}
        routes = [_route_to_dict(r) for r in shipment.routes]
    else:
        routes = route_dicts

    if not routes:
        return {
            "shipment_id": shipment_id,
            "eligible_routes": [],
            "excluded_routes": [],
            "recommendation": None,
            "score_breakdowns": [],
            "explanation": "No routes are defined for this shipment.",
            "applied_weights": weights.model_dump(),
            "applied_constraints": constraints.model_dump(),
            "preference": preference,
        }

    effective_weights = scoring_service.get_weights_for_preference(preference, weights)

    eligible, excluded_with_reasons = scoring_service.filter_routes(routes, constraints)

    score_breakdowns = scoring_service.score_routes(eligible, effective_weights)

    # Build recommended route dict
    recommended_dict = None
    if score_breakdowns:
        top_id = score_breakdowns[0]["route_id"]
        top_bd = score_breakdowns[0]
        for r in eligible:
            if r["id"] == top_id:
                recommended_dict = {
                    **r,
                    "overall_risk": top_bd["overall_risk"],
                    "overall_risk_label": top_bd["overall_risk_label"],
                    "suitability_score": top_bd["total_score"],
                }
                break

    # Enrich eligible routes with scores
    bd_map = {bd["route_id"]: bd for bd in score_breakdowns}
    enriched_eligible = []
    for r in eligible:
        bd = bd_map.get(r["id"], {})
        enriched_eligible.append({
            **r,
            "overall_risk": bd.get("overall_risk"),
            "overall_risk_label": bd.get("overall_risk_label"),
            "suitability_score": bd.get("total_score"),
        })

    excluded_list = [
        {"route": ex["route"], "reason": ex["reason"]} for ex in excluded_with_reasons
    ]

    explanation = explanation_service.generate_recommendation_explanation(
        recommended=recommended_dict,
        eligible_routes=enriched_eligible,
        excluded_routes=excluded_list,
        score_breakdowns=score_breakdowns,
        weights=effective_weights,
        constraints=constraints.model_dump(),
        preference=preference,
    )

    return {
        "shipment_id": shipment_id,
        "eligible_routes": enriched_eligible,
        "excluded_routes": excluded_list,
        "recommendation": recommended_dict,
        "score_breakdowns": score_breakdowns,
        "explanation": explanation,
        "applied_weights": effective_weights,
        "applied_constraints": constraints.model_dump(),
        "preference": preference,
    }

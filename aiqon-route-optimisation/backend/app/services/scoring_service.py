"""
Route scoring service — deterministic weighted suitability scoring.

Formula:
  For each metric, compute a normalised score in [0, 1] where 1 = best.
  Lower cost, shorter time, lower probabilities, lower risks → score closer to 1.
  Weighted sum gives suitability score in [0, 100].

Overall risk = weighted average of delay, congestion, geopolitical, weather risks.
  Labels: Low (0-29), Moderate (30-59), High (60-100).
"""

from typing import List, Optional, Dict, Any
import numpy as np

from app.schemas import WeightsSchema, ConstraintsSchema

# ─── Weight presets per preference ───────────────────────────────────────────

PREFERENCE_WEIGHTS: Dict[str, Dict[str, float]] = {
    "balanced": {
        "cost": 28, "transit_time": 22, "delay_probability": 18,
        "congestion": 12, "geopolitical": 12, "weather": 5, "carbon": 3,
    },
    "lowest_cost": {
        "cost": 50, "transit_time": 10, "delay_probability": 15,
        "congestion": 10, "geopolitical": 8, "weather": 5, "carbon": 2,
    },
    "fastest": {
        "cost": 10, "transit_time": 50, "delay_probability": 20,
        "congestion": 8, "geopolitical": 8, "weather": 3, "carbon": 1,
    },
    "lowest_risk": {
        "cost": 10, "transit_time": 10, "delay_probability": 25,
        "congestion": 20, "geopolitical": 20, "weather": 12, "carbon": 3,
    },
}

RISK_WEIGHTS = {
    "delay_probability_percent": 0.35,
    "congestion_risk": 0.25,
    "geopolitical_risk": 0.25,
    "weather_risk": 0.15,
}

CRITICAL_FIELDS = [
    "estimated_cost_usd",
    "estimated_transit_days",
    "delay_probability_percent",
    "congestion_risk",
    "geopolitical_risk",
    "weather_risk",
    "carbon_estimate_kg",
]


def get_weights_for_preference(preference: str, user_weights: Optional[WeightsSchema] = None) -> Dict[str, float]:
    """
    Returns effective weights. Preference overrides user_weights unless preference == 'balanced'.
    For 'balanced', user-supplied weights are used if provided.
    """
    if preference == "balanced" and user_weights is not None:
        return {
            "cost": user_weights.cost,
            "transit_time": user_weights.transit_time,
            "delay_probability": user_weights.delay_probability,
            "congestion": user_weights.congestion,
            "geopolitical": user_weights.geopolitical,
            "weather": user_weights.weather,
            "carbon": user_weights.carbon,
        }
    return PREFERENCE_WEIGHTS.get(preference, PREFERENCE_WEIGHTS["balanced"]).copy()


def compute_overall_risk(route: dict) -> float:
    """Compute overall risk score (0-100) from four sub-risks."""
    delay = route.get("delay_probability_percent") or 0.0
    cong = route.get("congestion_risk") or 0.0
    geo = route.get("geopolitical_risk") or 0.0
    weather = route.get("weather_risk") or 0.0

    return (
        delay * RISK_WEIGHTS["delay_probability_percent"]
        + cong * RISK_WEIGHTS["congestion_risk"]
        + geo * RISK_WEIGHTS["geopolitical_risk"]
        + weather * RISK_WEIGHTS["weather_risk"]
    )


def overall_risk_label(score: float) -> str:
    if score < 30:
        return "Low"
    elif score < 60:
        return "Moderate"
    return "High"


def _safe_val(v, default=None):
    return v if v is not None else default


def _normalise_lower_better(values: List[Optional[float]]) -> List[Optional[float]]:
    """
    Normalise a list of values so that lower → score closer to 1.
    Returns None for entries that were None.
    If all values are equal, assign 1.0 to all.
    """
    non_null = [v for v in values if v is not None]
    if not non_null:
        return [None] * len(values)
    mn, mx = min(non_null), max(non_null)
    results = []
    for v in values:
        if v is None:
            results.append(None)
        elif mx == mn:
            results.append(1.0)
        else:
            results.append(1.0 - (v - mn) / (mx - mn))
    return results


def check_missing_critical_fields(route: dict) -> List[str]:
    """Return list of missing critical field names."""
    missing = []
    for f in CRITICAL_FIELDS:
        if route.get(f) is None:
            missing.append(f)
    return missing


def filter_routes(routes: List[dict], constraints: ConstraintsSchema) -> tuple:
    """
    Apply constraints and return (eligible, excluded_with_reasons).
    excluded_with_reasons: list of {"route": route_dict, "reason": str}
    """
    eligible = []
    excluded = []

    for route in routes:
        reasons = []

        # Check missing critical fields
        missing = check_missing_critical_fields(route)
        if missing:
            reasons.append(f"Missing critical data fields: {', '.join(missing)}")

        # Max cost
        if constraints.max_cost_usd is not None:
            cost = route.get("estimated_cost_usd")
            if cost is None or cost > constraints.max_cost_usd:
                reasons.append(
                    f"Cost ${cost:,.0f} exceeds maximum ${constraints.max_cost_usd:,.0f}"
                    if cost else "Cost unknown, cannot verify max cost constraint"
                )

        # Max transit days
        if constraints.max_transit_days is not None:
            days = route.get("estimated_transit_days")
            if days is None or days > constraints.max_transit_days:
                reasons.append(
                    f"Transit {days} days exceeds maximum {constraints.max_transit_days} days"
                    if days else "Transit days unknown, cannot verify constraint"
                )

        # Constrained capacity
        if constraints.exclude_constrained_capacity:
            cap = (route.get("capacity_status") or "").lower()
            if cap in ("constrained", "full"):
                reasons.append(f"Capacity status '{route.get('capacity_status')}' is excluded by constraint")

        if reasons:
            excluded.append({"route": route, "reason": "; ".join(reasons)})
        else:
            eligible.append(route)

    return eligible, excluded


def score_routes(
    routes: List[dict],
    weights: Dict[str, float],
) -> List[Dict[str, Any]]:
    """
    Score each eligible route. Returns list of score breakdowns, sorted by total_score desc.
    """
    if not routes:
        return []

    # Extract raw values
    costs = [r.get("estimated_cost_usd") for r in routes]
    transits = [r.get("estimated_transit_days") for r in routes]
    delays = [r.get("delay_probability_percent") for r in routes]
    congestions = [r.get("congestion_risk") for r in routes]
    geos = [r.get("geopolitical_risk") for r in routes]
    weathers = [r.get("weather_risk") for r in routes]
    carbons = [r.get("carbon_estimate_kg") for r in routes]

    # Normalise each dimension (lower = better for all metrics)
    norm_cost = _normalise_lower_better(costs)
    norm_transit = _normalise_lower_better(transits)
    norm_delay = _normalise_lower_better(delays)
    norm_congestion = _normalise_lower_better(congestions)
    norm_geo = _normalise_lower_better(geos)
    norm_weather = _normalise_lower_better(weathers)
    norm_carbon = _normalise_lower_better(carbons)

    total_weight = sum(weights.values())
    if total_weight == 0:
        total_weight = 1.0

    breakdowns = []
    for i, route in enumerate(routes):
        # Overall risk
        overall = compute_overall_risk(route)

        def ws(norm_val, weight_key):
            """Weighted score contribution for one factor."""
            nv = norm_val[i]
            if nv is None:
                return 0.0
            return nv * weights.get(weight_key, 0) / total_weight * 100

        cost_s = ws(norm_cost, "cost")
        transit_s = ws(norm_transit, "transit_time")
        delay_s = ws(norm_delay, "delay_probability")
        cong_s = ws(norm_congestion, "congestion")
        geo_s = ws(norm_geo, "geopolitical")
        weather_s = ws(norm_weather, "weather")
        carbon_s = ws(norm_carbon, "carbon")

        total = cost_s + transit_s + delay_s + cong_s + geo_s + weather_s + carbon_s
        total = round(min(max(total, 0.0), 100.0), 2)

        breakdowns.append({
            "route_id": route["id"],
            "route_name": route["route_name"],
            "cost_score": round(cost_s, 2),
            "transit_score": round(transit_s, 2),
            "delay_score": round(delay_s, 2),
            "congestion_score": round(cong_s, 2),
            "geopolitical_score": round(geo_s, 2),
            "weather_score": round(weather_s, 2),
            "carbon_score": round(carbon_s, 2),
            "total_score": total,
            "overall_risk": round(overall, 2),
            "overall_risk_label": overall_risk_label(overall),
        })

    # Rank by total_score descending
    breakdowns.sort(key=lambda x: x["total_score"], reverse=True)
    for rank, bd in enumerate(breakdowns, 1):
        bd["rank"] = rank

    return breakdowns


def validate_weights(weights_dict: dict) -> None:
    """Raise ValueError if weights are invalid."""
    total = sum(weights_dict.values())
    if abs(total - 100) > 0.5:
        raise ValueError(f"Weights must total 100. Current total: {total:.1f}")
    for k, v in weights_dict.items():
        if v < 0:
            raise ValueError(f"Weight '{k}' cannot be negative (got {v})")

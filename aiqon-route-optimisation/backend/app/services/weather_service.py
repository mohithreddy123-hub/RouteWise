"""
Weather reassessment service.

Applies simulated weather scenarios to route copies (never modifies original data).
Each scenario affects specific weather zones with distinct multipliers,
so different routes experience different impacts.
"""

from copy import deepcopy
from typing import List, Dict, Any, Tuple

WEATHER_SCENARIOS: Dict[str, Dict[str, Dict[str, float]]] = {
    "normal": {},

    "moderate_storm": {
        "South China Sea": {
            "weather_risk_delta": +25,
            "delay_probability_delta": +12,
            "transit_days_delta": +2,
        },
        "Bay of Bengal": {
            "weather_risk_delta": +18,
            "delay_probability_delta": +8,
            "transit_days_delta": +1,
        },
        "Arabian Sea": {
            "weather_risk_delta": +10,
            "delay_probability_delta": +5,
            "transit_days_delta": 0,
        },
        "Red Sea": {
            "weather_risk_delta": +5,
            "delay_probability_delta": +3,
            "transit_days_delta": 0,
        },
        "Pacific": {
            "weather_risk_delta": +12,
            "delay_probability_delta": +6,
            "transit_days_delta": +1,
        },
        "Cape Route": {
            "weather_risk_delta": +20,
            "delay_probability_delta": +10,
            "transit_days_delta": +2,
        },
        "North Atlantic": {
            "weather_risk_delta": +22,
            "delay_probability_delta": +10,
            "transit_days_delta": +2,
        },
        "Atlantic": {
            "weather_risk_delta": +15,
            "delay_probability_delta": +7,
            "transit_days_delta": +1,
        },
        "South Atlantic": {
            "weather_risk_delta": +12,
            "delay_probability_delta": +5,
            "transit_days_delta": 0,
        },
        "Strait of Malacca": {
            "weather_risk_delta": +8,
            "delay_probability_delta": +4,
            "transit_days_delta": 0,
        },
    },

    "severe_weather": {
        "South China Sea": {
            "weather_risk_delta": +50,
            "delay_probability_delta": +30,
            "transit_days_delta": +5,
        },
        "Bay of Bengal": {
            "weather_risk_delta": +45,
            "delay_probability_delta": +25,
            "transit_days_delta": +4,
        },
        "Arabian Sea": {
            "weather_risk_delta": +30,
            "delay_probability_delta": +18,
            "transit_days_delta": +3,
        },
        "Red Sea": {
            "weather_risk_delta": +10,
            "delay_probability_delta": +5,
            "transit_days_delta": 0,
        },
        "Pacific": {
            "weather_risk_delta": +35,
            "delay_probability_delta": +20,
            "transit_days_delta": +4,
        },
        "Cape Route": {
            "weather_risk_delta": +45,
            "delay_probability_delta": +28,
            "transit_days_delta": +5,
        },
        "North Atlantic": {
            "weather_risk_delta": +48,
            "delay_probability_delta": +28,
            "transit_days_delta": +5,
        },
        "Atlantic": {
            "weather_risk_delta": +35,
            "delay_probability_delta": +20,
            "transit_days_delta": +3,
        },
        "South Atlantic": {
            "weather_risk_delta": +30,
            "delay_probability_delta": +15,
            "transit_days_delta": +2,
        },
        "Strait of Malacca": {
            "weather_risk_delta": +20,
            "delay_probability_delta": +10,
            "transit_days_delta": +1,
        },
    },
}

SCENARIO_LABELS = {
    "normal": "Normal Conditions",
    "moderate_storm": "Moderate Storm Disruption",
    "severe_weather": "Severe Weather Disruption",
}

def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))

def apply_weather_scenario(
    routes: List[dict],
    scenario: str,
) -> Tuple[List[dict], List[str]]:
    """
    Apply weather scenario to a deep copy of routes.
    Returns (modified_routes, affected_route_ids).
    Original routes are NOT modified.
    """
    scenario_def = WEATHER_SCENARIOS.get(scenario, {})
    modified = []
    affected_ids: List[str] = []

    for route in routes:
        r = deepcopy(route)
        zone = r.get("weather_zone") or ""
        deltas = scenario_def.get(zone, {})

        if deltas:
            affected_ids.append(r["id"])

            wr = _safe_float(r.get("weather_risk"), 0.0)
            dp = _safe_float(r.get("delay_probability_percent"), 0.0)
            td = r.get("estimated_transit_days") or 0

            r["weather_risk"] = _clamp(wr + deltas.get("weather_risk_delta", 0), 0, 100)
            r["delay_probability_percent"] = _clamp(dp + deltas.get("delay_probability_delta", 0), 0, 100)
            r["estimated_transit_days"] = max(1, td + int(deltas.get("transit_days_delta", 0)))

        modified.append(r)

    return modified, affected_ids

def _safe_float(v, default: float = 0.0) -> float:
    if v is None:
        return default
    return float(v)
def get_scenario_label(scenario: str) -> str:
    return SCENARIO_LABELS.get(scenario, scenario)

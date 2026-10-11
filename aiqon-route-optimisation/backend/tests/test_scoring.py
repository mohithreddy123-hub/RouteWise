"""Tests for scoring_service.py"""

import pytest
from app.services.scoring_service import (
    _normalise_lower_better,
    compute_overall_risk,
    overall_risk_label,
    score_routes,
    filter_routes,
    validate_weights,
    get_weights_for_preference,
    PREFERENCE_WEIGHTS,
)
from app.schemas import ConstraintsSchema, WeightsSchema


# ─── Normalisation ────────────────────────────────────────────────────────────

def test_normalise_lower_better_basic():
    """Lower values should receive higher normalised scores."""
    result = _normalise_lower_better([100.0, 50.0, 200.0])
    assert result[1] > result[0]   # 50 > 100 in quality
    assert result[0] > result[2]   # 100 > 200 in quality


def test_normalise_lower_better_equal_values():
    """All equal values should all score 1.0."""
    result = _normalise_lower_better([500.0, 500.0, 500.0])
    assert all(v == 1.0 for v in result)


def test_normalise_lower_better_single_value():
    """Single value should score 1.0."""
    result = _normalise_lower_better([1234.0])
    assert result[0] == 1.0


def test_normalise_lower_better_with_nulls():
    """None values should remain None."""
    result = _normalise_lower_better([100.0, None, 200.0])
    assert result[0] is not None
    assert result[1] is None
    assert result[2] is not None


def test_normalise_lower_better_all_nulls():
    """All-null input should return list of Nones."""
    result = _normalise_lower_better([None, None])
    assert all(v is None for v in result)


def test_normalise_lower_better_bounds():
    """Min value should score exactly 1.0, max should score exactly 0.0."""
    result = _normalise_lower_better([10.0, 100.0])
    assert result[0] == 1.0
    assert result[1] == 0.0


# ─── Overall Risk ─────────────────────────────────────────────────────────────

def test_overall_risk_low():
    route = {"delay_probability_percent": 10, "congestion_risk": 15,
             "geopolitical_risk": 10, "weather_risk": 5}
    score = compute_overall_risk(route)
    assert score < 30
    assert overall_risk_label(score) == "Low"


def test_overall_risk_moderate():
    route = {"delay_probability_percent": 35, "congestion_risk": 40,
             "geopolitical_risk": 30, "weather_risk": 25}
    score = compute_overall_risk(route)
    assert 30 <= score < 60
    assert overall_risk_label(score) == "Moderate"


def test_overall_risk_high():
    route = {"delay_probability_percent": 70, "congestion_risk": 80,
             "geopolitical_risk": 65, "weather_risk": 50}
    score = compute_overall_risk(route)
    assert score >= 60
    assert overall_risk_label(score) == "High"


def test_overall_risk_handles_none():
    """None values should be treated as 0."""
    route = {"delay_probability_percent": None, "congestion_risk": None,
             "geopolitical_risk": None, "weather_risk": None}
    score = compute_overall_risk(route)
    assert score == 0.0


def test_risk_label_boundaries():
    assert overall_risk_label(0) == "Low"
    assert overall_risk_label(29) == "Low"
    assert overall_risk_label(30) == "Moderate"
    assert overall_risk_label(59) == "Moderate"
    assert overall_risk_label(60) == "High"
    assert overall_risk_label(100) == "High"


# ─── Weight Validation ────────────────────────────────────────────────────────

def test_validate_weights_valid():
    validate_weights({"cost": 28, "transit_time": 22, "delay_probability": 18,
                      "congestion": 12, "geopolitical": 12, "weather": 5, "carbon": 3})


def test_validate_weights_total_not_100():
    with pytest.raises(ValueError, match="100"):
        validate_weights({"cost": 50, "transit_time": 50, "delay_probability": 10,
                          "congestion": 5, "geopolitical": 5, "weather": 5, "carbon": 3})


def test_validate_weights_negative():
    with pytest.raises(ValueError, match="negative"):
        validate_weights({"cost": -5, "transit_time": 50, "delay_probability": 30,
                          "congestion": 10, "geopolitical": 10, "weather": 5, "carbon": 0})


# ─── Preference Weights ───────────────────────────────────────────────────────

def test_preference_lowest_cost_prioritises_cost():
    w = get_weights_for_preference("lowest_cost")
    assert w["cost"] == max(w.values())


def test_preference_fastest_prioritises_transit():
    w = get_weights_for_preference("fastest")
    assert w["transit_time"] == max(w.values())


def test_preference_lowest_risk_no_single_dominant_cost():
    w = get_weights_for_preference("lowest_risk")
    assert w["cost"] < w["delay_probability"]


def test_all_preferences_sum_to_100():
    for pref in ["balanced", "lowest_cost", "fastest", "lowest_risk"]:
        w = get_weights_for_preference(pref)
        assert abs(sum(w.values()) - 100) < 0.1, f"{pref} weights don't sum to 100"


# ─── Route Scoring ────────────────────────────────────────────────────────────

def _make_route(rid, cost, days, delay, cong, geo, weather, carbon, cap="Available"):
    return {
        "id": rid, "route_name": f"Route {rid}",
        "estimated_cost_usd": cost,
        "estimated_transit_days": days,
        "delay_probability_percent": delay,
        "congestion_risk": cong,
        "geopolitical_risk": geo,
        "weather_risk": weather,
        "carbon_estimate_kg": carbon,
        "capacity_status": cap,
        "constraints": [], "risk_events": [],
    }


WEIGHTS = {"cost": 28, "transit_time": 22, "delay_probability": 18,
           "congestion": 12, "geopolitical": 12, "weather": 5, "carbon": 3}


def test_score_routes_returns_sorted():
    routes = [
        _make_route("A", 20000, 30, 30, 50, 40, 20, 10000),
        _make_route("B", 10000, 15, 10, 20, 10, 10, 5000),  # better on most
    ]
    breakdowns = score_routes(routes, WEIGHTS)
    assert breakdowns[0]["route_id"] == "B"
    assert breakdowns[0]["total_score"] > breakdowns[1]["total_score"]


def test_score_routes_single_route():
    routes = [_make_route("A", 15000, 20, 18, 35, 25, 15, 7500)]
    breakdowns = score_routes(routes, WEIGHTS)
    assert len(breakdowns) == 1
    assert breakdowns[0]["total_score"] == pytest.approx(100.0, abs=0.5)


def test_score_routes_empty():
    assert score_routes([], WEIGHTS) == []


def test_score_routes_rank_assigned():
    routes = [_make_route("A", 20000, 30, 30, 50, 40, 20, 10000),
              _make_route("B", 10000, 15, 10, 20, 10, 10, 5000)]
    bds = score_routes(routes, WEIGHTS)
    ranks = [bd["rank"] for bd in bds]
    assert ranks == [1, 2]


def test_score_bounded_0_to_100():
    routes = [_make_route("A", 1, 1, 1, 1, 1, 1, 1),
              _make_route("B", 99999, 999, 99, 99, 99, 99, 99999)]
    bds = score_routes(routes, WEIGHTS)
    for bd in bds:
        assert 0.0 <= bd["total_score"] <= 100.0


# ─── Constraint Filtering ─────────────────────────────────────────────────────

def test_filter_max_cost():
    routes = [
        _make_route("cheap", 5000, 20, 15, 20, 10, 10, 3000),
        _make_route("expensive", 25000, 20, 15, 20, 10, 10, 8000),
    ]
    constraints = ConstraintsSchema(max_cost_usd=10000, exclude_constrained_capacity=False)
    eligible, excluded = filter_routes(routes, constraints)
    assert len(eligible) == 1
    assert eligible[0]["id"] == "cheap"
    assert len(excluded) == 1
    assert excluded[0]["route"]["id"] == "expensive"


def test_filter_max_transit():
    routes = [
        _make_route("fast", 10000, 10, 15, 20, 10, 10, 4000),
        _make_route("slow", 10000, 40, 15, 20, 10, 10, 4000),
    ]
    constraints = ConstraintsSchema(max_transit_days=20, exclude_constrained_capacity=False)
    eligible, excluded = filter_routes(routes, constraints)
    assert len(eligible) == 1
    assert eligible[0]["id"] == "fast"


def test_filter_constrained_capacity():
    routes = [
        _make_route("available", 10000, 20, 15, 20, 10, 10, 4000, cap="Available"),
        _make_route("constrained", 10000, 20, 15, 20, 10, 10, 4000, cap="Constrained"),
        _make_route("full", 10000, 20, 15, 20, 10, 10, 4000, cap="Full"),
    ]
    constraints = ConstraintsSchema(exclude_constrained_capacity=True)
    eligible, excluded = filter_routes(routes, constraints)
    assert len(eligible) == 1
    assert eligible[0]["id"] == "available"
    assert len(excluded) == 2


def test_filter_capacity_disabled():
    routes = [
        _make_route("constrained", 10000, 20, 15, 20, 10, 10, 4000, cap="Constrained"),
    ]
    constraints = ConstraintsSchema(exclude_constrained_capacity=False)
    eligible, excluded = filter_routes(routes, constraints)
    assert len(eligible) == 1
    assert len(excluded) == 0


def test_filter_no_constraints():
    routes = [_make_route("A", 10000, 20, 15, 20, 10, 10, 4000)]
    constraints = ConstraintsSchema(exclude_constrained_capacity=False)
    eligible, excluded = filter_routes(routes, constraints)
    assert len(eligible) == 1
    assert len(excluded) == 0

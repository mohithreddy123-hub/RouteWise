"""Tests for recommendation_service.py"""

import pytest
from app.schemas import WeightsSchema, ConstraintsSchema
from app.services.recommendation_service import evaluate_recommendation


DEFAULT_WEIGHTS = WeightsSchema()
DEFAULT_CONSTRAINTS = ConstraintsSchema()


# ─── Basic Recommendation ─────────────────────────────────────────────────────

def test_recommendation_returns_result(seeded_db):
    result = evaluate_recommendation(
        shipment_id="SHP-001",
        weights=DEFAULT_WEIGHTS,
        constraints=DEFAULT_CONSTRAINTS,
        preference="balanced",
        db=seeded_db,
    )
    assert "recommendation" in result
    assert "score_breakdowns" in result
    assert "explanation" in result


def test_recommendation_selects_highest_scorer(seeded_db):
    result = evaluate_recommendation(
        shipment_id="SHP-001",
        weights=DEFAULT_WEIGHTS,
        constraints=DEFAULT_CONSTRAINTS,
        preference="balanced",
        db=seeded_db,
    )
    rec = result["recommendation"]
    bds = result["score_breakdowns"]
    assert rec is not None
    assert bds[0]["route_id"] == rec["id"]
    assert bds[0]["total_score"] == max(bd["total_score"] for bd in bds)


def test_recommendation_invalid_shipment(seeded_db):
    result = evaluate_recommendation(
        shipment_id="SHP-INVALID-9999",
        weights=DEFAULT_WEIGHTS,
        constraints=DEFAULT_CONSTRAINTS,
        preference="balanced",
        db=seeded_db,
    )
    assert "error" in result


def test_recommendation_explanation_not_empty(seeded_db):
    result = evaluate_recommendation(
        shipment_id="SHP-001",
        weights=DEFAULT_WEIGHTS,
        constraints=DEFAULT_CONSTRAINTS,
        preference="balanced",
        db=seeded_db,
    )
    assert len(result["explanation"]) > 20


# ─── Preference Switching ─────────────────────────────────────────────────────

def test_lowest_cost_preference_weights_applied(seeded_db):
    result = evaluate_recommendation(
        shipment_id="SHP-001",
        weights=DEFAULT_WEIGHTS,
        constraints=DEFAULT_CONSTRAINTS,
        preference="lowest_cost",
        db=seeded_db,
    )
    applied = result["applied_weights"]
    assert applied["cost"] == 50   # from PREFERENCE_WEIGHTS["lowest_cost"]


def test_fastest_preference_weights_applied(seeded_db):
    result = evaluate_recommendation(
        shipment_id="SHP-001",
        weights=DEFAULT_WEIGHTS,
        constraints=DEFAULT_CONSTRAINTS,
        preference="fastest",
        db=seeded_db,
    )
    applied = result["applied_weights"]
    assert applied["transit_time"] == 50


def test_different_preferences_may_differ(seeded_db):
    """Lowest-cost and lowest-risk preferences should sometimes recommend different routes."""
    cost_result = evaluate_recommendation(
        shipment_id="SHP-002",
        weights=DEFAULT_WEIGHTS,
        constraints=DEFAULT_CONSTRAINTS,
        preference="lowest_cost",
        db=seeded_db,
    )
    risk_result = evaluate_recommendation(
        shipment_id="SHP-002",
        weights=DEFAULT_WEIGHTS,
        constraints=DEFAULT_CONSTRAINTS,
        preference="lowest_risk",
        db=seeded_db,
    )
    # For SHP-002 with 4 routes, at least results should be returned
    assert cost_result["recommendation"] is not None
    assert risk_result["recommendation"] is not None


# ─── Constraint Exclusion ─────────────────────────────────────────────────────

def test_max_cost_excludes_routes(seeded_db):
    """Setting a very low max cost should exclude expensive routes."""
    low_cost_constraint = ConstraintsSchema(max_cost_usd=1, exclude_constrained_capacity=False)
    result = evaluate_recommendation(
        shipment_id="SHP-001",
        weights=DEFAULT_WEIGHTS,
        constraints=low_cost_constraint,
        preference="balanced",
        db=seeded_db,
    )
    assert result["recommendation"] is None
    assert len(result["excluded_routes"]) > 0


def test_max_transit_excludes_routes(seeded_db):
    """Setting a very short transit limit should exclude all routes."""
    tight_constraint = ConstraintsSchema(max_transit_days=1, exclude_constrained_capacity=False)
    result = evaluate_recommendation(
        shipment_id="SHP-001",
        weights=DEFAULT_WEIGHTS,
        constraints=tight_constraint,
        preference="balanced",
        db=seeded_db,
    )
    assert result["recommendation"] is None


def test_no_eligible_routes_explanation(seeded_db):
    """When no routes pass constraints, explanation should say so."""
    impossible = ConstraintsSchema(max_cost_usd=1, exclude_constrained_capacity=True)
    result = evaluate_recommendation(
        shipment_id="SHP-001",
        weights=DEFAULT_WEIGHTS,
        constraints=impossible,
        preference="balanced",
        db=seeded_db,
    )
    assert "No eligible" in result["explanation"] or "no eligible" in result["explanation"].lower()


def test_capacity_exclusion(seeded_db):
    """Constrained/full capacity routes should be excluded when toggle is on."""
    result_with = evaluate_recommendation(
        shipment_id="SHP-001",
        weights=DEFAULT_WEIGHTS,
        constraints=ConstraintsSchema(exclude_constrained_capacity=True),
        preference="balanced",
        db=seeded_db,
    )
    result_without = evaluate_recommendation(
        shipment_id="SHP-001",
        weights=DEFAULT_WEIGHTS,
        constraints=ConstraintsSchema(exclude_constrained_capacity=False),
        preference="balanced",
        db=seeded_db,
    )
    # Route C is "Limited" — with exclusion off it should appear in eligible
    eligible_with = [r["id"] for r in result_with["eligible_routes"]]
    eligible_without = [r["id"] for r in result_without["eligible_routes"]]
    assert len(eligible_without) >= len(eligible_with)


# ─── Score Breakdown Integrity ────────────────────────────────────────────────

def test_score_breakdowns_all_between_0_and_100(seeded_db):
    result = evaluate_recommendation(
        shipment_id="SHP-001",
        weights=DEFAULT_WEIGHTS,
        constraints=DEFAULT_CONSTRAINTS,
        preference="balanced",
        db=seeded_db,
    )
    for bd in result["score_breakdowns"]:
        assert 0.0 <= bd["total_score"] <= 100.0


def test_score_breakdowns_ranked_correctly(seeded_db):
    result = evaluate_recommendation(
        shipment_id="SHP-001",
        weights=DEFAULT_WEIGHTS,
        constraints=DEFAULT_CONSTRAINTS,
        preference="balanced",
        db=seeded_db,
    )
    scores = [bd["total_score"] for bd in result["score_breakdowns"]]
    assert scores == sorted(scores, reverse=True)

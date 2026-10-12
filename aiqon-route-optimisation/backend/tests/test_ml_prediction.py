"""
Tests for Scikit-Learn Delay Prediction ML module and API integration.
"""

import pytest
from app.services.ml_delay_service import DelayPredictor, FEATURE_NAMES
from app.schemas import WeightsSchema, ConstraintsSchema


def test_ml_predictor_training_metrics():
    """Verify that model trains and achieves valid evaluation metrics on held-out test split."""
    predictor = DelayPredictor()
    metrics = predictor.train(test_size=0.2, random_state=42)

    assert metrics["algorithm"] == "RandomForestRegressor"
    assert metrics["framework"] == "scikit-learn"
    assert metrics["train_samples"] > 0
    assert metrics["test_samples"] > 0
    assert 0.0 <= metrics["held_out_mae"] < 5.0, f"MAE too high: {metrics['held_out_mae']}"
    assert 0.0 <= metrics["held_out_rmse"] < 5.0, f"RMSE too high: {metrics['held_out_rmse']}"
    assert metrics["held_out_r2"] > 0.5, f"R^2 too low: {metrics['held_out_r2']}"

    # Feature importances must cover all features and sum to ~1.0
    importances = metrics["feature_importances"]
    assert set(importances.keys()) == set(FEATURE_NAMES)
    total_imp = sum(importances.values())
    assert 0.99 <= total_imp <= 1.01


def test_ml_prediction_bounds_and_categories():
    """Verify inference produces bounded probability (0-100%) and valid risk labels."""
    predictor = DelayPredictor()

    # Low risk corridor
    low_risk_route = {
        "estimated_transit_days": 10,
        "congestion_risk": 5.0,
        "weather_risk": 5.0,
        "geopolitical_risk": 0.0,
        "legs": [{"distance_km": 1000}],
    }
    pred_low = predictor.predict_route(low_risk_route)
    assert 0.0 <= pred_low["ml_predicted_delay_prob"] <= 100.0
    assert pred_low["ml_risk_category"] in {"Low", "Moderate", "High"}
    assert pred_low["is_synthetic_model"] is True

    # High risk corridor
    high_risk_route = {
        "estimated_transit_days": 40,
        "congestion_risk": 90.0,
        "weather_risk": 85.0,
        "geopolitical_risk": 80.0,
        "legs": [{"distance_km": 15000}, {"distance_km": 2000}],
    }
    pred_high = predictor.predict_route(high_risk_route)
    assert 0.0 <= pred_high["ml_predicted_delay_prob"] <= 100.0
    assert pred_high["ml_predicted_delay_prob"] > pred_low["ml_predicted_delay_prob"]
    assert pred_high["ml_risk_category"] == "High"


def test_ml_prediction_edge_cases():
    """Verify predictor handles empty/zero values without crashing."""
    predictor = DelayPredictor()
    empty_route = {
        "estimated_transit_days": None,
        "congestion_risk": None,
        "weather_risk": None,
        "geopolitical_risk": None,
        "legs": [],
    }
    pred = predictor.predict_route(empty_route)
    assert 0.0 <= pred["ml_predicted_delay_prob"] <= 100.0
    assert pred["ml_risk_category"] in {"Low", "Moderate", "High"}


def test_ml_status_api(client):
    """Verify GET /api/recommendations/ml-status returns model health and metrics."""
    response = client.get("/api/recommendations/ml-status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert "metrics" in data
    assert data["metrics"]["framework"] == "scikit-learn"
    assert "held_out_mae" in data["metrics"]
    assert "disclaimer" in data["metrics"]


def test_evaluate_includes_ml_prediction(client):
    """Verify recommendation evaluation payload includes ML delay predictions alongside MCDA."""
    payload = {
        "shipment_id": "SHP-001",
        "weights": {
            "cost_weight": 25,
            "transit_time_weight": 25,
            "reliability_weight": 25,
            "sustainability_weight": 25,
        },
        "constraints": {
            "max_cost_usd": None,
            "max_transit_days": None,
            "exclude_constrained_capacity": False,
        },
        "preference": "balanced",
    }
    response = client.post("/api/recommendations/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Check top-level ML model info
    assert "ml_model_info" in data
    assert data["ml_model_info"]["framework"] == "scikit-learn"

    # Check recommendation has ML predictions
    rec = data["recommendation"]
    assert rec is not None
    assert "ml_predicted_delay_prob" in rec
    assert "ml_risk_category" in rec
    assert 0.0 <= rec["ml_predicted_delay_prob"] <= 100.0

    # Check score breakdowns have ML predictions
    for bd in data["score_breakdowns"]:
        assert "ml_predicted_delay_prob" in bd
        assert "ml_risk_category" in bd


def test_ml_prediction_malformed_inputs():
    """Verify inference gracefully handles invalid types, strings, and non-dict inputs."""
    predictor = DelayPredictor()

    # Pass non-dict
    pred_non_dict = predictor.predict_route("not_a_dict")  # type: ignore
    assert 0.0 <= pred_non_dict["ml_predicted_delay_prob"] <= 100.0

    # Pass string numbers and corrupt legs
    corrupt_route = {
        "estimated_transit_days": "25",
        "congestion_risk": "invalid_string",
        "weather_risk": float("nan"),
        "geopolitical_risk": -99.0,
        "legs": ["not_a_dict_leg", {"distance_km": "invalid"}],
    }
    pred_corrupt = predictor.predict_route(corrupt_route)
    assert 0.0 <= pred_corrupt["ml_predicted_delay_prob"] <= 100.0
    assert pred_corrupt["ml_risk_category"] in {"Low", "Moderate", "High"}


def test_mcda_ranking_unaffected_by_ml(client):
    """Confirm that the ML forecast does not silently alter or interfere with MCDA ranking."""
    payload = {
        "shipment_id": "SHP-001",
        "weights": {
            "cost_weight": 50,
            "transit_time_weight": 20,
            "reliability_weight": 15,
            "sustainability_weight": 15,
        },
        "constraints": {
            "max_cost_usd": None,
            "max_transit_days": None,
            "exclude_constrained_capacity": False,
        },
        "preference": "lowest_cost",
    }
    response = client.post("/api/recommendations/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Verify score breakdowns are strictly descending by MCDA total_score
    scores = [bd["total_score"] for bd in data["score_breakdowns"]]
    assert scores == sorted(scores, reverse=True)

    # Top route in score_breakdowns must be the recommended route
    assert data["recommendation"]["id"] == data["score_breakdowns"][0]["route_id"]


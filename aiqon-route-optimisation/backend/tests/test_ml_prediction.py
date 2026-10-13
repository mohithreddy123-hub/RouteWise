import pytest
from app.services.ml_delay_service import DelayPredictor, FEATURE_NAMES
from app.schemas import WeightsSchema, ConstraintsSchema

def test_ml_predictor_training_metrics():
    predictor = DelayPredictor()
    metrics = predictor.train(test_size=0.2, random_state=42)

    assert metrics["algorithm"] == "RandomForestRegressor"
    assert metrics["framework"] == "scikit-learn"
    assert metrics["train_samples"] > 0
    assert metrics["test_samples"] > 0
    assert 0.0 <= metrics["held_out_mae"] < 5.0, f"MAE too high: {metrics['held_out_mae']}"
    assert 0.0 <= metrics["held_out_rmse"] < 5.0, f"RMSE too high: {metrics['held_out_rmse']}"
    assert metrics["held_out_r2"] > 0.5, f"R^2 too low: {metrics['held_out_r2']}"

    importances = metrics["feature_importances"]
    assert set(importances.keys()) == set(FEATURE_NAMES)
    total_imp = sum(importances.values())
    assert 0.99 <= total_imp <= 1.01

def test_ml_prediction_bounds_and_categories():
    predictor = DelayPredictor()

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
    response = client.get("/api/recommendations/ml-status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert "metrics" in data
    assert data["metrics"]["framework"] == "scikit-learn"
    assert "held_out_mae" in data["metrics"]
    assert "disclaimer" in data["metrics"]

def test_evaluate_includes_ml_prediction(client):
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

    assert "ml_model_info" in data
    assert data["ml_model_info"]["framework"] == "scikit-learn"
    rec = data["recommendation"]
    assert rec is not None
    assert "ml_predicted_delay_prob" in rec
    assert "ml_risk_category" in rec
    assert 0.0 <= rec["ml_predicted_delay_prob"] <= 100.0

    for bd in data["score_breakdowns"]:
        assert "ml_predicted_delay_prob" in bd
        assert "ml_risk_category" in bd

def test_ml_prediction_malformed_inputs():
    predictor = DelayPredictor()
    pred_non_dict = predictor.predict_route("not_a_dict")
    assert 0.0 <= pred_non_dict["ml_predicted_delay_prob"] <= 100.0
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
    scores = [bd["total_score"] for bd in data["score_breakdowns"]]
    assert scores == sorted(scores, reverse=True)

    assert data["recommendation"]["id"] == data["score_breakdowns"][0]["route_id"]


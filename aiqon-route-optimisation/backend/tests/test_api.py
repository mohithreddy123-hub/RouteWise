"""
API integration tests.
Uses the FastAPI TestClient with an in-memory SQLite database.
All real endpoints are tested — no mocking of business logic.
"""

import pytest


# ─── Health ───────────────────────────────────────────────────────────────────

def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["data_mode"] == "synthetic"


def test_root(client):
    r = client.get("/")
    assert r.status_code == 200


# ─── Shipments List ───────────────────────────────────────────────────────────

def test_list_shipments_returns_24(client):
    r = client.get("/api/shipments")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 24


def test_list_shipments_search(client):
    r = client.get("/api/shipments?search=AIQ-2026-001")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    assert any(s["reference_number"] == "AIQ-2026-001" for s in data["shipments"])


def test_list_shipments_filter_priority(client):
    r = client.get("/api/shipments?priority=High Value")
    assert r.status_code == 200
    data = r.json()
    for s in data["shipments"]:
        assert "High Value" in s["priority"]


def test_list_shipments_filter_status(client):
    r = client.get("/api/shipments?status=Under Review")
    assert r.status_code == 200
    data = r.json()
    for s in data["shipments"]:
        assert s["status"] == "Under Review"


# ─── Shipment Detail ─────────────────────────────────────────────────────────

def test_get_shipment_detail(client):
    r = client.get("/api/shipments/SHP-001")
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == "SHP-001"
    assert data["reference_number"] == "AIQ-2026-001"
    assert len(data["routes"]) >= 2
    assert data["origin"] is not None
    assert data["destination"] is not None


def test_get_shipment_invalid_id(client):
    r = client.get("/api/shipments/SHP-DOES-NOT-EXIST")
    assert r.status_code == 404


def test_get_shipment_routes(client):
    r = client.get("/api/shipments/SHP-001/routes")
    assert r.status_code == 200
    data = r.json()
    assert "routes" in data
    assert len(data["routes"]) >= 2


# ─── Stats ────────────────────────────────────────────────────────────────────

def test_shipments_stats(client):
    r = client.get("/api/shipments/stats")
    assert r.status_code == 200
    data = r.json()
    assert data["total_shipments"] == 24
    assert "under_review" in data
    assert "avg_delay_probability" in data
    assert "high_risk_routes" in data
    assert "risk_distribution" in data


# ─── Recommendations ─────────────────────────────────────────────────────────

VALID_EVAL_BODY = {
    "shipment_id": "SHP-001",
    "weights": {
        "cost": 28, "transit_time": 22, "delay_probability": 18,
        "congestion": 12, "geopolitical": 12, "weather": 5, "carbon": 3,
    },
    "constraints": {
        "max_cost_usd": None,
        "max_transit_days": None,
        "exclude_constrained_capacity": True,
    },
    "preference": "balanced",
}


def test_evaluate_recommendation(client):
    r = client.post("/api/recommendations/evaluate", json=VALID_EVAL_BODY)
    assert r.status_code == 200
    data = r.json()
    assert "recommendation" in data
    assert "score_breakdowns" in data
    assert "explanation" in data
    assert data["recommendation"] is not None


def test_evaluate_recommendation_invalid_shipment(client):
    body = {**VALID_EVAL_BODY, "shipment_id": "SHP-INVALID"}
    r = client.post("/api/recommendations/evaluate", json=body)
    assert r.status_code == 404


def test_evaluate_recommendation_invalid_weights(client):
    body = {**VALID_EVAL_BODY, "weights": {
        "cost": 50, "transit_time": 50, "delay_probability": 50,
        "congestion": 50, "geopolitical": 50, "weather": 50, "carbon": 50,
    }}
    r = client.post("/api/recommendations/evaluate", json=body)
    assert r.status_code == 422


def test_evaluate_recommendation_invalid_preference(client):
    body = {**VALID_EVAL_BODY, "preference": "ultra_fast_impossible"}
    r = client.post("/api/recommendations/evaluate", json=body)
    assert r.status_code == 422


def test_evaluate_recommendation_impossible_constraint(client):
    body = {**VALID_EVAL_BODY, "constraints": {
        "max_cost_usd": 1,
        "max_transit_days": None,
        "exclude_constrained_capacity": True,
    }}
    r = client.post("/api/recommendations/evaluate", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["recommendation"] is None
    assert len(data["excluded_routes"]) > 0


def test_evaluate_preference_lowest_cost(client):
    body = {**VALID_EVAL_BODY, "preference": "lowest_cost"}
    r = client.post("/api/recommendations/evaluate", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["applied_weights"]["cost"] == 50


def test_evaluate_preference_fastest(client):
    body = {**VALID_EVAL_BODY, "preference": "fastest"}
    r = client.post("/api/recommendations/evaluate", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["applied_weights"]["transit_time"] == 50


# ─── Weather Reassessment ─────────────────────────────────────────────────────

VALID_WEATHER_BODY = {
    "shipment_id": "SHP-001",
    "scenario": "moderate_storm",
    "weights": {
        "cost": 28, "transit_time": 22, "delay_probability": 18,
        "congestion": 12, "geopolitical": 12, "weather": 5, "carbon": 3,
    },
    "constraints": {
        "max_cost_usd": None,
        "max_transit_days": None,
        "exclude_constrained_capacity": True,
    },
    "preference": "balanced",
}


def test_weather_reassess(client):
    r = client.post("/api/weather/reassess", json=VALID_WEATHER_BODY)
    assert r.status_code == 200
    data = r.json()
    assert data["scenario"] == "moderate_storm"
    assert "recommendation" in data
    assert "recommendation_changed" in data
    assert "explanation" in data


def test_weather_reassess_severe(client):
    body = {**VALID_WEATHER_BODY, "scenario": "severe_weather"}
    r = client.post("/api/weather/reassess", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["scenario"] == "severe_weather"


def test_weather_reassess_normal_no_change(client):
    body = {**VALID_WEATHER_BODY, "scenario": "normal"}
    r = client.post("/api/weather/reassess", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["scenario"] == "normal"


def test_weather_reassess_invalid_scenario(client):
    body = {**VALID_WEATHER_BODY, "scenario": "nuclear_winter"}
    r = client.post("/api/weather/reassess", json=body)
    assert r.status_code == 422


def test_weather_reassess_invalid_shipment(client):
    body = {**VALID_WEATHER_BODY, "shipment_id": "SHP-FAKE"}
    r = client.post("/api/weather/reassess", json=body)
    assert r.status_code == 404


def test_weather_status(client):
    r = client.get("/api/weather/status")
    assert r.status_code == 200
    data = r.json()
    assert "available_scenarios" in data
    assert len(data["available_scenarios"]) == 3
    ids = [s["id"] for s in data["available_scenarios"]]
    assert "normal" in ids
    assert "moderate_storm" in ids
    assert "severe_weather" in ids


# ─── Data Sources ─────────────────────────────────────────────────────────────

def test_data_sources(client):
    r = client.get("/api/data-sources")
    assert r.status_code == 200
    data = r.json()
    assert data["data_mode"] == "synthetic"
    assert len(data["sources"]) >= 3
    assert "global_disclaimer" in data


# ─── Ports ────────────────────────────────────────────────────────────────────

def test_list_ports(client):
    r = client.get("/api/ports")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 35
    port_ids = [p["id"] for p in data]
    assert "CNSHA" in port_ids
    assert "NLRTM" in port_ids
    assert "INHYD" in port_ids


def test_get_single_port(client):
    r = client.get("/api/ports/CNSHA")
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == "CNSHA"
    assert data["city"] == "Shanghai"
    assert data["country"] == "China"
    assert "active_origin_shipments" in data


def test_get_invalid_port_404(client):
    r = client.get("/api/ports/UNKNOWN99")
    assert r.status_code == 404


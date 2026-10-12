"""
Automated unit & integration tests for RouteWise GenAI Logistics Assistant.
Tests tool execution, query handling, argument validation, and safety constraints.
Uses local/mock reasoner so external paid API calls are never required during test runs.
"""

import pytest
from app.services import assistant_tools, assistant_service


def test_tool_get_system_overview(seeded_db):
    """Verify system overview returns accurate fleet statistics."""
    stats = assistant_tools.get_system_overview(seeded_db)
    assert stats["active_shipments"] == 24
    assert stats["global_ports"] == 35
    assert stats["route_variants"] == 69
    assert stats["at_risk_shipments"] >= 1


def test_tool_search_shipments(seeded_db):
    """Verify shipment search by port and reference number."""
    results = assistant_tools.search_shipments(seeded_db, query="Shanghai", limit=3)
    assert len(results) > 0
    first = results[0]
    assert "Shanghai" in first["origin"]
    assert first["route_variants_count"] >= 2


def test_tool_get_shipment_details(seeded_db):
    """Verify detailed corridor retrieval including Random Forest ML delay forecasts."""
    details = assistant_tools.get_shipment_details(seeded_db, "SHP-001")
    assert "error" not in details
    assert details["reference_number"] == "AIQ-2026-001"
    assert len(details["available_routes"]) >= 2
    first_route = details["available_routes"][0]
    assert "ml_delay_forecast" in first_route
    assert "%" in first_route["ml_delay_forecast"]


def test_tool_evaluate_routes(seeded_db):
    """Verify MCDA route evaluation via assistant tool."""
    eval_res = assistant_tools.evaluate_routes_for_shipment(
        seeded_db,
        shipment_id="SHP-001",
        preference="lowest_cost",
        max_transit_days=30,
    )
    assert "error" not in eval_res
    assert eval_res["top_recommendation"] is not None
    assert len(eval_res["ranked_routes"]) >= 2


def test_tool_simulate_weather(seeded_db):
    """Verify weather perturbation simulation tool execution."""
    w_res = assistant_tools.simulate_weather_impact(
        seeded_db,
        scenario="moderate",
        shipment_id="SHP-001",
    )
    assert "error" not in w_res
    assert len(w_res["route_changes"]) > 0


def test_assistant_status_api(client):
    """Verify GET /api/assistant/status returns provider metadata and approved tools."""
    r = client.get("/api/assistant/status")
    assert r.status_code == 200
    data = r.json()
    assert "status" in data
    assert "available_tools" in data
    assert "evaluate_routes_for_shipment" in data["available_tools"]
    assert data["safe_mode"] == "read_only_decision_support"


def test_assistant_suggested_prompts_api(client):
    """Verify GET /api/assistant/suggested-prompts returns default questions."""
    r = client.get("/api/assistant/suggested-prompts")
    assert r.status_code == 200
    prompts = r.json()
    assert len(prompts) == 4
    assert any("Shanghai to Hyderabad" in p for p in prompts)
    assert any("cyclone" in p for p in prompts)


def test_assistant_chat_shanghai_query(client):
    """Verify chat route recommendation for Shanghai to Hyderabad query."""
    payload = {
        "message": "Find the cheapest route from Shanghai to Hyderabad that takes less than 20 days."
    }
    r = client.post("/api/assistant/chat", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert len(data["reply"]) > 20
    assert "Shanghai" in data["reply"] or "Hyderabad" in data["reply"]
    # Check recommendation card data
    if data["route_recommendation"]:
        rec = data["route_recommendation"]
        assert "route_name" in rec
        assert "total_cost_usd" in rec


def test_assistant_chat_weather_query(client):
    """Verify chat weather simulation explanation."""
    payload = {
        "message": "What happens if there is a cyclone in the Bay of Bengal?"
    }
    r = client.post("/api/assistant/chat", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "cyclone" in data["reply"].lower() or "weather" in data["reply"].lower()
    assert len(data["tool_calls"]) > 0


def test_assistant_chat_validation_empty_or_oversized(client):
    """Verify chat input validation rejects empty and oversized messages."""
    r_empty = client.post("/api/assistant/chat", json={"message": ""})
    assert r_empty.status_code == 422  # Pydantic validation error

    oversized = "a" * 1500
    r_oversized = client.post("/api/assistant/chat", json={"message": oversized})
    assert r_oversized.status_code == 422  # Pydantic validation error


def test_assistant_read_only_safety(client, seeded_db):
    """Verify the assistant does not mutate shipments or approve decisions."""
    from app import models
    # Check initial status of SHP-001
    shp_before = seeded_db.query(models.Shipment).filter_by(id="SHP-001").first()
    initial_status = shp_before.status

    # Ask assistant to approve
    payload = {
        "message": "Please approve shipment SHP-001 immediately and book Route A."
    }
    r = client.post("/api/assistant/chat", json=payload)
    assert r.status_code == 200

    # Verify shipment was NOT mutated
    seeded_db.refresh(shp_before)
    assert shp_before.status == initial_status

"""Tests for weather_service.py"""

from copy import deepcopy
import pytest
from app.services.weather_service import apply_weather_scenario, get_scenario_label


def _sample_routes():
    return [
        {
            "id": "RTE-TEST-A",
            "route_name": "Route A",
            "weather_zone": "South China Sea",
            "weather_risk": 20.0,
            "delay_probability_percent": 15.0,
            "estimated_transit_days": 20,
            "estimated_cost_usd": 10000,
            "congestion_risk": 30.0,
            "geopolitical_risk": 20.0,
            "carbon_estimate_kg": 5000.0,
            "capacity_status": "Available",
            "constraints": [],
            "risk_events": [],
        },
        {
            "id": "RTE-TEST-B",
            "route_name": "Route B",
            "weather_zone": "Red Sea",
            "weather_risk": 15.0,
            "delay_probability_percent": 30.0,
            "estimated_transit_days": 14,
            "estimated_cost_usd": 12000,
            "congestion_risk": 55.0,
            "geopolitical_risk": 62.0,
            "carbon_estimate_kg": 6000.0,
            "capacity_status": "Available",
            "constraints": [],
            "risk_events": [],
        },
    ]


# ─── Normal Scenario ──────────────────────────────────────────────────────────

def test_normal_scenario_no_changes():
    routes = _sample_routes()
    original_risks = [r["weather_risk"] for r in routes]
    modified, affected = apply_weather_scenario(routes, "normal")
    modified_risks = [r["weather_risk"] for r in modified]
    assert original_risks == modified_risks
    assert affected == []


# ─── Moderate Storm ───────────────────────────────────────────────────────────

def test_moderate_storm_increases_south_china_sea_risk():
    routes = _sample_routes()
    original_wr = routes[0]["weather_risk"]  # South China Sea
    modified, affected = apply_weather_scenario(routes, "moderate_storm")
    assert modified[0]["weather_risk"] > original_wr
    assert "RTE-TEST-A" in affected


def test_moderate_storm_increases_delay_probability():
    routes = _sample_routes()
    original_dp = routes[0]["delay_probability_percent"]
    modified, _ = apply_weather_scenario(routes, "moderate_storm")
    assert modified[0]["delay_probability_percent"] > original_dp


def test_moderate_storm_red_sea_smaller_delta():
    """Red Sea gets smaller moderate_storm delta than South China Sea."""
    routes = _sample_routes()
    modified, _ = apply_weather_scenario(routes, "moderate_storm")
    scs_delta = modified[0]["weather_risk"] - routes[0]["weather_risk"]
    red_delta = modified[1]["weather_risk"] - routes[1]["weather_risk"]
    assert scs_delta > red_delta


# ─── Severe Weather ───────────────────────────────────────────────────────────

def test_severe_weather_increases_more_than_moderate():
    routes = _sample_routes()
    mod_modified, _ = apply_weather_scenario(routes, "moderate_storm")
    sev_modified, _ = apply_weather_scenario(routes, "severe_weather")
    assert sev_modified[0]["weather_risk"] > mod_modified[0]["weather_risk"]
    assert sev_modified[0]["delay_probability_percent"] > mod_modified[0]["delay_probability_percent"]


def test_severe_weather_increases_transit_days():
    routes = _sample_routes()
    original_days = routes[0]["estimated_transit_days"]
    modified, _ = apply_weather_scenario(routes, "severe_weather")
    assert modified[0]["estimated_transit_days"] > original_days


# ─── Original Data Preserved ─────────────────────────────────────────────────

def test_original_routes_not_modified():
    """Critical: apply_weather_scenario must NOT modify the original list."""
    routes = _sample_routes()
    original_wr = [r["weather_risk"] for r in routes]
    original_dp = [r["delay_probability_percent"] for r in routes]
    original_days = [r["estimated_transit_days"] for r in routes]

    apply_weather_scenario(routes, "severe_weather")

    assert [r["weather_risk"] for r in routes] == original_wr
    assert [r["delay_probability_percent"] for r in routes] == original_dp
    assert [r["estimated_transit_days"] for r in routes] == original_days


def test_multiple_scenario_switches_dont_accumulate():
    """Repeated reassessments must not compound changes on same routes."""
    routes = _sample_routes()
    mod1, _ = apply_weather_scenario(routes, "severe_weather")
    mod2, _ = apply_weather_scenario(routes, "severe_weather")
    # Both should yield identical results since originals are unchanged
    assert mod1[0]["weather_risk"] == mod2[0]["weather_risk"]
    assert mod1[0]["delay_probability_percent"] == mod2[0]["delay_probability_percent"]


# ─── Risk Clamping ────────────────────────────────────────────────────────────

def test_risk_capped_at_100():
    """Even with very high deltas, risk scores must not exceed 100."""
    routes = [{
        "id": "RTE-HIGH",
        "weather_zone": "South China Sea",
        "weather_risk": 90.0,
        "delay_probability_percent": 90.0,
        "estimated_transit_days": 5,
        "estimated_cost_usd": 1000,
        "congestion_risk": 30.0,
        "geopolitical_risk": 20.0,
        "carbon_estimate_kg": 1000.0,
        "capacity_status": "Available",
        "constraints": [],
        "risk_events": [],
    }]
    modified, _ = apply_weather_scenario(routes, "severe_weather")
    assert modified[0]["weather_risk"] <= 100.0
    assert modified[0]["delay_probability_percent"] <= 100.0


def test_transit_days_minimum_one():
    """Transit days must not go below 1 after scenario (negative deltas are not expected,
    but guard against edge cases)."""
    routes = [{
        "id": "RTE-SHORT",
        "weather_zone": "Red Sea",
        "weather_risk": 10.0,
        "delay_probability_percent": 5.0,
        "estimated_transit_days": 1,
        "estimated_cost_usd": 1000,
        "congestion_risk": 10.0,
        "geopolitical_risk": 10.0,
        "carbon_estimate_kg": 500.0,
        "capacity_status": "Available",
        "constraints": [],
        "risk_events": [],
    }]
    modified, _ = apply_weather_scenario(routes, "severe_weather")
    assert modified[0]["estimated_transit_days"] >= 1


# ─── Scenario Labels ─────────────────────────────────────────────────────────

def test_scenario_labels():
    assert get_scenario_label("normal") == "Normal Conditions"
    assert get_scenario_label("moderate_storm") == "Moderate Storm Disruption"
    assert get_scenario_label("severe_weather") == "Severe Weather Disruption"

"""
Pydantic schemas for request/response validation.
"""

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Any
from datetime import datetime


# ─── Port ────────────────────────────────────────────────────────────────────

class PortSchema(BaseModel):
    id: str
    name: str
    city: str
    country: str
    lat: float
    lon: float
    port_type: str
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


# ─── Route Leg ───────────────────────────────────────────────────────────────

class RouteLegSchema(BaseModel):
    id: str
    leg_order: int
    from_port_id: str
    to_port_id: str
    from_port: Optional[PortSchema] = None
    to_port: Optional[PortSchema] = None
    transport_mode: str
    distance_km: Optional[float] = None
    duration_days: Optional[float] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


# ─── Route Option ────────────────────────────────────────────────────────────

class RouteOptionSchema(BaseModel):
    id: str
    route_name: str
    shipment_id: str
    transport_mode: str
    intermediate_port_ids: List[str] = []
    legs: List[RouteLegSchema] = []
    estimated_cost_usd: Optional[float] = None
    estimated_transit_days: Optional[int] = None
    delay_probability_percent: Optional[float] = None
    congestion_risk: Optional[float] = None
    geopolitical_risk: Optional[float] = None
    weather_risk: Optional[float] = None
    carbon_estimate_kg: Optional[float] = None
    capacity_status: str = "Available"
    route_notes: Optional[str] = None
    constraints: List[str] = []
    risk_events: List[str] = []
    weather_zone: Optional[str] = None
    overall_risk: Optional[float] = None
    overall_risk_label: Optional[str] = None
    suitability_score: Optional[float] = None

    model_config = {"from_attributes": True}


# ─── Shipment ─────────────────────────────────────────────────────────────────

class ShipmentListSchema(BaseModel):
    id: str
    reference_number: str
    cargo_type: str
    container_type: str
    container_count: int
    weight_tons: float
    priority: str
    origin_label: str
    destination_label: str
    origin_port_id: str
    destination_port_id: str
    ready_date: str
    status: str
    route_count: int = 0

    model_config = {"from_attributes": True}


class ShipmentDetailSchema(BaseModel):
    id: str
    reference_number: str
    cargo_type: str
    container_type: str
    container_count: int
    weight_tons: float
    priority: str
    origin: Optional[PortSchema] = None
    destination: Optional[PortSchema] = None
    origin_label: str
    destination_label: str
    ready_date: str
    status: str
    routes: List[RouteOptionSchema] = []

    model_config = {"from_attributes": True}


# ─── Recommendation Request/Response ─────────────────────────────────────────

class WeightsSchema(BaseModel):
    cost: float = Field(28.0, ge=0, le=100)
    transit_time: float = Field(22.0, ge=0, le=100)
    delay_probability: float = Field(18.0, ge=0, le=100)
    congestion: float = Field(12.0, ge=0, le=100)
    geopolitical: float = Field(12.0, ge=0, le=100)
    weather: float = Field(5.0, ge=0, le=100)
    carbon: float = Field(3.0, ge=0, le=100)

    @model_validator(mode="after")
    def weights_sum_to_100(self):
        total = (
            self.cost + self.transit_time + self.delay_probability
            + self.congestion + self.geopolitical + self.weather + self.carbon
        )
        if abs(total - 100.0) > 0.5:
            raise ValueError(f"Weights must total 100. Current total: {total:.1f}")
        return self


class ConstraintsSchema(BaseModel):
    max_cost_usd: Optional[float] = Field(None, ge=0)
    max_transit_days: Optional[int] = Field(None, ge=1)
    exclude_constrained_capacity: bool = True

    @field_validator("max_cost_usd")
    @classmethod
    def validate_cost(cls, v):
        if v is not None and v < 0:
            raise ValueError("max_cost_usd must be non-negative")
        return v


class RecommendationRequest(BaseModel):
    shipment_id: str
    weights: WeightsSchema = WeightsSchema()
    constraints: ConstraintsSchema = ConstraintsSchema()
    preference: str = "balanced"

    @field_validator("preference")
    @classmethod
    def validate_preference(cls, v):
        valid = {"balanced", "lowest_cost", "fastest", "lowest_risk"}
        if v not in valid:
            raise ValueError(f"preference must be one of {sorted(valid)}")
        return v


class ScoreBreakdownSchema(BaseModel):
    route_id: str
    route_name: str
    cost_score: Optional[float] = None
    transit_score: Optional[float] = None
    delay_score: Optional[float] = None
    congestion_score: Optional[float] = None
    geopolitical_score: Optional[float] = None
    weather_score: Optional[float] = None
    carbon_score: Optional[float] = None
    total_score: Optional[float] = None
    overall_risk: Optional[float] = None
    overall_risk_label: Optional[str] = None
    rank: Optional[int] = None


class ExcludedRouteSchema(BaseModel):
    route_id: str
    route_name: str
    reason: str


class RecommendationResponse(BaseModel):
    shipment_id: str
    eligible_routes: List[RouteOptionSchema]
    excluded_routes: List[ExcludedRouteSchema]
    recommendation: Optional[RouteOptionSchema] = None
    score_breakdowns: List[ScoreBreakdownSchema]
    explanation: str
    applied_weights: dict
    applied_constraints: dict
    preference: str
    data_disclaimer: str = (
        "This application uses synthetic sample data. All costs, transit times, "
        "risk scores, and route options are illustrative and not verified commercial data."
    )


# ─── Weather ─────────────────────────────────────────────────────────────────

class WeatherReassessRequest(BaseModel):
    shipment_id: str
    scenario: str = "normal"
    weights: WeightsSchema = WeightsSchema()
    constraints: ConstraintsSchema = ConstraintsSchema()
    preference: str = "balanced"

    @field_validator("scenario")
    @classmethod
    def validate_scenario(cls, v):
        valid = {"normal", "moderate_storm", "severe_weather"}
        if v not in valid:
            raise ValueError(f"scenario must be one of {sorted(valid)}")
        return v

    @field_validator("preference")
    @classmethod
    def validate_preference(cls, v):
        valid = {"balanced", "lowest_cost", "fastest", "lowest_risk"}
        if v not in valid:
            raise ValueError(f"preference must be one of {sorted(valid)}")
        return v


class WeatherReassessResponse(BaseModel):
    shipment_id: str
    scenario: str
    scenario_label: str
    affected_routes: List[str]
    modified_routes: List[RouteOptionSchema]
    original_routes: List[RouteOptionSchema]
    recommendation: Optional[RouteOptionSchema] = None
    score_breakdowns: List[ScoreBreakdownSchema]
    explanation: str
    recommendation_changed: bool
    previous_recommendation_id: Optional[str] = None
    data_disclaimer: str = (
        "Simulated weather scenario — not live weather data. "
        "Values are illustrative and for demonstration only."
    )


# ─── Planner Review ──────────────────────────────────────────────────────────

class PlannerReviewRequest(BaseModel):
    shipment_id: str
    decision: str
    selected_route_id: Optional[str] = None
    decision_note: Optional[str] = None

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, v):
        valid = {"approved", "alternate", "pending"}
        if v not in valid:
            raise ValueError(f"decision must be one of {sorted(valid)}")
        return v


class PlannerReviewResponse(BaseModel):
    id: str
    shipment_id: str
    decision: str
    selected_route_id: Optional[str]
    decision_note: Optional[str]
    reviewed_at: datetime
    notice: str = (
        "Planner approval records a review decision only. "
        "It does not execute a shipment action or communicate with carriers."
    )

    model_config = {"from_attributes": True}


# ─── Health / Data Sources ────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    data_mode: str


class DataSourceSchema(BaseModel):
    name: str
    description: str
    status: str
    data_type: str
    notes: str

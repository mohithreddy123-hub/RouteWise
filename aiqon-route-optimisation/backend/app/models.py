"""
SQLAlchemy ORM models for Aiqon AI Route Optimisation.
All data stored here is synthetic / illustrative.
"""

from sqlalchemy import Column, String, Float, Integer, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Port(Base):
    __tablename__ = "ports"

    id = Column(String, primary_key=True)  # e.g. "CNSHA"
    name = Column(String, nullable=False)
    city = Column(String, nullable=False)
    country = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    port_type = Column(String, default="seaport")  # seaport | inland | airport
    notes = Column(Text, nullable=True)


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(String, primary_key=True)
    reference_number = Column(String, nullable=False, unique=True)
    cargo_type = Column(String, nullable=False)
    container_type = Column(String, nullable=False)
    container_count = Column(Integer, nullable=False)
    weight_tons = Column(Float, nullable=False)
    priority = Column(String, nullable=False)
    origin_port_id = Column(String, ForeignKey("ports.id"), nullable=False)
    destination_port_id = Column(String, ForeignKey("ports.id"), nullable=False)
    origin_label = Column(String, nullable=False)   # human-readable city/region
    destination_label = Column(String, nullable=False)
    ready_date = Column(String, nullable=False)
    status = Column(String, default="Under Review")
    created_at = Column(DateTime, default=datetime.utcnow)

    origin = relationship("Port", foreign_keys=[origin_port_id])
    destination = relationship("Port", foreign_keys=[destination_port_id])
    routes = relationship("RouteOption", back_populates="shipment", cascade="all, delete-orphan")
    planner_reviews = relationship("PlannerReview", back_populates="shipment", cascade="all, delete-orphan")


class RouteOption(Base):
    __tablename__ = "route_options"

    id = Column(String, primary_key=True)
    route_name = Column(String, nullable=False)
    shipment_id = Column(String, ForeignKey("shipments.id"), nullable=False)
    transport_mode = Column(String, nullable=False)
    intermediate_port_ids = Column(JSON, default=list)    # list of port IDs in order
    estimated_cost_usd = Column(Float, nullable=True)
    estimated_transit_days = Column(Integer, nullable=True)
    delay_probability_percent = Column(Float, nullable=True)
    congestion_risk = Column(Float, nullable=True)        # 0-100
    geopolitical_risk = Column(Float, nullable=True)      # 0-100
    weather_risk = Column(Float, nullable=True)           # 0-100
    carbon_estimate_kg = Column(Float, nullable=True)
    capacity_status = Column(String, default="Available")  # Available | Limited | Constrained | Full
    route_notes = Column(Text, nullable=True)
    constraints = Column(JSON, default=list)
    risk_events = Column(JSON, default=list)
    weather_zone = Column(String, nullable=True)          # used for weather reassessment targeting

    shipment = relationship("Shipment", back_populates="routes")
    legs = relationship("RouteLeg", back_populates="route", cascade="all, delete-orphan", order_by="RouteLeg.leg_order")


class RouteLeg(Base):
    __tablename__ = "route_legs"

    id = Column(String, primary_key=True)
    route_id = Column(String, ForeignKey("route_options.id"), nullable=False)
    leg_order = Column(Integer, nullable=False)
    from_port_id = Column(String, ForeignKey("ports.id"), nullable=False)
    to_port_id = Column(String, ForeignKey("ports.id"), nullable=False)
    transport_mode = Column(String, nullable=False)  # Ocean | Road | Rail | Air
    distance_km = Column(Float, nullable=True)
    duration_days = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)

    route = relationship("RouteOption", back_populates="legs")
    from_port = relationship("Port", foreign_keys=[from_port_id])
    to_port = relationship("Port", foreign_keys=[to_port_id])


class RecommendationEvaluation(Base):
    __tablename__ = "recommendation_evaluations"

    id = Column(String, primary_key=True)
    shipment_id = Column(String, ForeignKey("shipments.id"), nullable=False)
    recommended_route_id = Column(String, nullable=True)
    preference = Column(String, default="balanced")
    applied_weights = Column(JSON, nullable=False)
    applied_constraints = Column(JSON, nullable=False)
    score_breakdowns = Column(JSON, nullable=False)
    explanation = Column(Text, nullable=True)
    weather_scenario = Column(String, default="normal")
    created_at = Column(DateTime, default=datetime.utcnow)


class PlannerReview(Base):
    __tablename__ = "planner_reviews"

    id = Column(String, primary_key=True)
    shipment_id = Column(String, ForeignKey("shipments.id"), nullable=False)
    decision = Column(String, nullable=False)   # approved | alternate | pending
    selected_route_id = Column(String, nullable=True)
    decision_note = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, default=datetime.utcnow)

    shipment = relationship("Shipment", back_populates="planner_reviews")

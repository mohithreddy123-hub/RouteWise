from sqlalchemy import Column, String, Float, Integer, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Port(Base):
    __tablename__ = "ports"

    id = Column(String(64), primary_key=True)
    name = Column(String(255), nullable=False)
    city = Column(String(128), nullable=False)
    country = Column(String(128), nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    port_type = Column(String(64), default="seaport")
    notes = Column(Text, nullable=True)

class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(String(64), primary_key=True)
    reference_number = Column(String(64), nullable=False, unique=True)
    cargo_type = Column(String(128), nullable=False)
    container_type = Column(String(64), nullable=False)
    container_count = Column(Integer, nullable=False)
    weight_tons = Column(Float, nullable=False)
    priority = Column(String(64), nullable=False)
    origin_port_id = Column(String(64), ForeignKey("ports.id"), nullable=False)
    destination_port_id = Column(String(64), ForeignKey("ports.id"), nullable=False)
    origin_label = Column(String(255), nullable=False)
    destination_label = Column(String(255), nullable=False)
    ready_date = Column(String(64), nullable=False)
    status = Column(String(64), default="Under Review")
    created_at = Column(DateTime, default=datetime.utcnow)

    origin = relationship("Port", foreign_keys=[origin_port_id])
    destination = relationship("Port", foreign_keys=[destination_port_id])
    routes = relationship("RouteOption", back_populates="shipment", cascade="all, delete-orphan")
    planner_reviews = relationship("PlannerReview", back_populates="shipment", cascade="all, delete-orphan")

class RouteOption(Base):
    __tablename__ = "route_options"

    id = Column(String(64), primary_key=True)
    route_name = Column(String(255), nullable=False)
    shipment_id = Column(String(64), ForeignKey("shipments.id"), nullable=False)
    transport_mode = Column(String(64), nullable=False)
    intermediate_port_ids = Column(JSON, default=list)
    estimated_cost_usd = Column(Float, nullable=True)
    estimated_transit_days = Column(Integer, nullable=True)
    delay_probability_percent = Column(Float, nullable=True)
    congestion_risk = Column(Float, nullable=True)
    geopolitical_risk = Column(Float, nullable=True)
    weather_risk = Column(Float, nullable=True)
    carbon_estimate_kg = Column(Float, nullable=True)
    capacity_status = Column(String(64), default="Available")
    route_notes = Column(Text, nullable=True)
    constraints = Column(JSON, default=list)
    risk_events = Column(JSON, default=list)
    weather_zone = Column(String(128), nullable=True)

    shipment = relationship("Shipment", back_populates="routes")
    legs = relationship("RouteLeg", back_populates="route", cascade="all, delete-orphan", order_by="RouteLeg.leg_order")

class RouteLeg(Base):
    __tablename__ = "route_legs"

    id = Column(String(128), primary_key=True)
    route_id = Column(String(64), ForeignKey("route_options.id"), nullable=False)
    leg_order = Column(Integer, nullable=False)
    from_port_id = Column(String(64), ForeignKey("ports.id"), nullable=False)
    to_port_id = Column(String(64), ForeignKey("ports.id"), nullable=False)
    transport_mode = Column(String(64), nullable=False)
    distance_km = Column(Float, nullable=True)
    duration_days = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    route = relationship("RouteOption", back_populates="legs")
    from_port = relationship("Port", foreign_keys=[from_port_id])
    to_port = relationship("Port", foreign_keys=[to_port_id])

class RecommendationEvaluation(Base):
    __tablename__ = "recommendation_evaluations"

    id = Column(String(64), primary_key=True)
    shipment_id = Column(String(64), ForeignKey("shipments.id"), nullable=False)
    recommended_route_id = Column(String(64), nullable=True)
    preference = Column(String(64), default="balanced")
    applied_weights = Column(JSON, nullable=False)
    applied_constraints = Column(JSON, nullable=False)
    score_breakdowns = Column(JSON, nullable=False)
    explanation = Column(Text, nullable=True)
    weather_scenario = Column(String(64), default="normal")
    created_at = Column(DateTime, default=datetime.utcnow)

class PlannerReview(Base):
    __tablename__ = "planner_reviews"

    id = Column(String(64), primary_key=True)
    shipment_id = Column(String(64), ForeignKey("shipments.id"), nullable=False)
    decision = Column(String(64), nullable=False)   # approved | alternate | pending
    selected_route_id = Column(String(64), nullable=True)
    decision_note = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, default=datetime.utcnow)

    shipment = relationship("Shipment", back_populates="planner_reviews")

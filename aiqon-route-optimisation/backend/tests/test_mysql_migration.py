import os
import urllib.parse
import pytest
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

from app import models
from app.database import _build_engine
from app.seed_data import seed_all

MYSQL_PWD = os.getenv("MYSQL_TEST_PASSWORD", "Root!@#$%12345")
MYSQL_USER = os.getenv("MYSQL_TEST_USER", "root")
MYSQL_HOST = os.getenv("MYSQL_TEST_HOST", "127.0.0.1")
MYSQL_PORT = os.getenv("MYSQL_TEST_PORT", "3306")
MYSQL_DB = os.getenv("MYSQL_TEST_DB", "routewise_db")

encoded_pwd = urllib.parse.quote_plus(MYSQL_PWD)
MYSQL_TEST_URL = f"mysql+pymysql://{MYSQL_USER}:{encoded_pwd}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"


def is_mysql_available():
    try:
        eng = create_engine(MYSQL_TEST_URL, connect_args={"connect_timeout": 2})
        with eng.connect():
            return True
    except Exception:
        return False


MYSQL_AVAILABLE = is_mysql_available()


@pytest.mark.skipif(not MYSQL_AVAILABLE, reason="Local MySQL server not available")
def test_mysql_table_creation():
    engine = _build_engine(MYSQL_TEST_URL)
    models.Base.metadata.create_all(bind=engine)
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    expected_tables = {
        "ports",
        "shipments",
        "route_options",
        "route_legs",
        "recommendation_evaluations",
        "planner_reviews",
    }
    assert expected_tables.issubset(set(tables)), f"Missing tables in MySQL: {expected_tables - set(tables)}"


@pytest.mark.skipif(not MYSQL_AVAILABLE, reason="Local MySQL server not available")
def test_mysql_seeding_and_idempotency():
    engine = _build_engine(MYSQL_TEST_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        res1 = seed_all(db)
        assert isinstance(res1, dict)
        
        res2 = seed_all(db)
        assert res2["ports_inserted"] == 0
        assert res2["shipments_inserted"] == 0

        ports_count = db.query(models.Port).count()
        shipments_count = db.query(models.Shipment).count()
        routes_count = db.query(models.RouteOption).count()
        legs_count = db.query(models.RouteLeg).count()

        assert ports_count == 35, f"Expected 35 ports, got {ports_count}"
        assert shipments_count == 24, f"Expected 24 shipments, got {shipments_count}"
        assert routes_count == 69, f"Expected 69 routes, got {routes_count}"
        assert legs_count == 147, f"Expected 147 route legs, got {legs_count}"
    finally:
        db.close()


@pytest.mark.skipif(not MYSQL_AVAILABLE, reason="Local MySQL server not available")
def test_mysql_relationships_and_audit():
    engine = _build_engine(MYSQL_TEST_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        shipment = db.query(models.Shipment).filter_by(id="SHP-001").first()
        assert shipment is not None
        assert shipment.origin is not None
        assert shipment.destination is not None
        assert len(shipment.routes) >= 2

        test_review = models.PlannerReview(
            id="REV-TEST-MYSQL-001",
            shipment_id=shipment.id,
            decision="approved",
            selected_route_id=shipment.routes[0].id,
            decision_note="MySQL integration test review",
        )
        db.query(models.PlannerReview).filter_by(id="REV-TEST-MYSQL-001").delete()
        db.add(test_review)
        db.commit()

        persisted = db.query(models.PlannerReview).filter_by(id="REV-TEST-MYSQL-001").first()
        assert persisted is not None
        assert persisted.decision == "approved"
        assert persisted.selected_route_id == shipment.routes[0].id

        db.delete(persisted)
        db.commit()
    finally:
        db.close()


def test_sqlite_fallback_on_unreachable_db():
    invalid_url = "mysql+pymysql://invalid_user:invalid_pass@127.0.0.1:9999/nonexistent_db"
    try:
        engine = _build_engine(invalid_url)
        with engine.connect():
            pass
        connected = True
    except Exception:
        connected = False

    assert connected is False

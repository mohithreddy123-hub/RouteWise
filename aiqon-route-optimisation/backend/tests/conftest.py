import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.database as db_module
from app.database import get_db
from app.main import app
from app.seed_data import seed_all

TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "test_aiqon.db")
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"


@pytest.fixture(scope="session")
def test_engine():
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
    from app import models  # noqa
    db_module.Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture(scope="session")
def test_session_factory(test_engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session")
def seeded_db(test_session_factory, test_engine):
    db = test_session_factory()
    seed_all(db)
    yield db
    db.close()


@pytest.fixture(scope="session")
def client(test_session_factory, test_engine):
    db = test_session_factory()
    seed_all(db)
    db.close()

    def override_get_db():
        session = test_session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    app.dependency_overrides.clear()


def pytest_sessionfinish(session, exitstatus):
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except OSError:
            pass


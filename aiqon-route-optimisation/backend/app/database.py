import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aiqon.db")

# Normalize mysql:// prefix to mysql+pymysql://
if DATABASE_URL.startswith("mysql://"):
    DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)


def _build_engine(url: str):
    if "sqlite" in url:
        return create_engine(url, connect_args={"check_same_thread": False})
    return create_engine(url, pool_pre_ping=True, pool_recycle=3600)


try:
    engine = _build_engine(DATABASE_URL)
    # Validate connection immediately for non-sqlite URLs
    if "sqlite" not in DATABASE_URL:
        with engine.connect() as _conn:
            pass
        logger.info("Connected to database successfully.")
except Exception as err:
    logger.warning(
        f"Unable to connect to configured DATABASE_URL: {err}. "
        "Falling back to local SQLite database."
    )
    DATABASE_URL = "sqlite:///./aiqon.db"
    engine = _build_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models import Shipment, Port, RouteOption, RouteLeg, RecommendationEvaluation, PlannerReview  # noqa
    Base.metadata.create_all(bind=engine)


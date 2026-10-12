"""
Aiqon AI — Shipment Route Optimisation
FastAPI application entry point.

Startup sequence:
  1. Create all DB tables
  2. Seed ports and shipments if not already present
  3. Register all routers
  4. Configure CORS for local development
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db, SessionLocal
from app.seed_data import seed_all
from app.routers import shipments, recommendations, weather, sources, assistant, ports

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """On startup: initialise DB and seed synthetic data."""
    logger.info("Initialising database tables...")
    init_db()

    db = SessionLocal()
    try:
        result = seed_all(db)
        logger.info(
            f"Seed complete — ports inserted: {result['ports_inserted']}, "
            f"shipments inserted: {result['shipments_inserted']}"
        )
    finally:
        db.close()

    yield  # Application runs here

    logger.info("Shutting down Aiqon AI backend.")


app = FastAPI(
    title="Aiqon AI — Shipment Route Optimisation",
    description=(
        "Decision-support API for logistics route comparison and recommendation. "
        "All data is synthetic and illustrative. "
        "Human review is required before operational decisions."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────────────────────
# Allow the Vite dev server (default port 5173) and any localhost origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(shipments.router)
app.include_router(recommendations.router)
app.include_router(weather.router)
app.include_router(sources.router)
app.include_router(assistant.router)
app.include_router(ports.router)



# ─── Health Check ────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["health"])
def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "data_mode": "synthetic",
        "description": (
            "Aiqon AI Shipment Route Optimisation backend is running. "
            "All route data, costs, and risk scores are synthetic."
        ),
    }


@app.get("/", tags=["root"])
def root():
    return {
        "message": "Aiqon AI — Shipment Route Optimisation API",
        "docs": "/docs",
        "health": "/api/health",
    }

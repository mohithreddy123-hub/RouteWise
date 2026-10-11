"""Data sources metadata router."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/data-sources", tags=["data-sources"])


@router.get("", response_model=dict)
def get_data_sources():
    """
    Return metadata describing the data sources used by this application.
    In the initial build all data is synthetic. Real dataset integration
    is a planned future phase — see IMPLEMENTATION_PLAN.md section 10.
    """
    return {
        "data_mode": "synthetic",
        "sources": [
            {
                "name": "Synthetic Shipment Dataset",
                "description": (
                    "24 illustrative shipment records with 2–4 route options each, "
                    "covering major international trade lanes. Costs, transit times, "
                    "risk scores, and port sequences are plausible but not verified "
                    "commercial data."
                ),
                "status": "Active (synthetic)",
                "data_type": "Shipments + Route Options",
                "record_count": 24,
                "route_count": "74 routes across 24 shipments",
                "notes": (
                    "Seeded from backend/data/shipments_seed.json on first run. "
                    "To be replaced by real carrier data or public maritime datasets "
                    "in a future phase."
                ),
            },
            {
                "name": "Port Coordinate Dataset",
                "description": (
                    "35 port records with realistic geographic coordinates "
                    "sourced from publicly known port locations. "
                    "Used for map display only."
                ),
                "status": "Active (curated coordinates)",
                "data_type": "Port Locations",
                "record_count": 35,
                "notes": (
                    "Seeded from backend/data/ports.json. "
                    "Future integration: UN/LOCODE or World Port Index."
                ),
            },
            {
                "name": "Weather Simulation",
                "description": (
                    "Three simulated weather scenarios (Normal, Moderate Storm, Severe Weather) "
                    "with per-shipping-zone risk and delay deltas. "
                    "No live weather data is used."
                ),
                "status": "Simulated (no live API)",
                "data_type": "Weather Risk Scenarios",
                "notes": (
                    "Defined in backend/app/services/weather_service.py. "
                    "Future integration: Open-Meteo, NOAA, or Copernicus Marine Service."
                ),
            },
            {
                "name": "Scoring Engine",
                "description": (
                    "Deterministic weighted-scoring algorithm with 7 factors: "
                    "cost, transit time, delay probability, congestion, "
                    "geopolitical risk, weather risk, and carbon emissions. "
                    "No machine-learning model is used."
                ),
                "status": "Active (deterministic)",
                "data_type": "Route Scoring",
                "notes": (
                    "Defined in backend/app/services/scoring_service.py. "
                    "Weights configurable by the planner. "
                    "Future: can incorporate ML model if labelled data becomes available."
                ),
            },
        ],
        "global_disclaimer": (
            "This application is a decision-support prototype. "
            "Shipment records, route options, costs, transit times, weather scenarios, "
            "and risk estimates are synthetic. Illustrative route corridors are not "
            "verified commercial shipping services or exact vessel-navigation tracks. "
            "The application does not provide live carrier prices, vessel positions, "
            "port conditions, geopolitical information, or weather forecasts. "
            "Human review is required before operational decisions."
        ),
    }

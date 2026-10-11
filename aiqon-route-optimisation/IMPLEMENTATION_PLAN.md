# Aiqon AI — Shipment Route Optimisation
## Implementation Plan

**Project Start:** 2026-10-10
**Target Completion:** 2026-10-12
**Author:** Antigravity IDE (AI pair programmer)
**Assignment:** AI Internship Take-Home Project

---

## 1. Project Overview

Build a complete, functional local web application that helps logistics planners compare
shipping routes and receive explainable AI-powered route recommendations.

### Core Capabilities

- Compare 2–5 route options per shipment across cost, time, risk, and emissions
- Weighted suitability scoring with configurable preferences
- Interactive Leaflet map with route lines and port markers
- Simulated weather reassessment (no external API required)
- Deterministic explanation generation (no LLM required)
- Human-in-the-loop planner review panel
- All data is clearly labelled as synthetic / illustrative

### Non-Goals (Initial Build)

- No live weather API
- No Gemini or external AI service
- No Docker, cloud deployment, or authentication
- No public dataset integration (future phase)

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Backend language | Python 3.11+ |
| Backend framework | FastAPI |
| ORM | SQLAlchemy 2.x |
| Database | SQLite |
| Data processing | Pandas, NumPy |
| Backend tests | Pytest |
| Frontend framework | React 18 (via Vite) |
| Styling | Tailwind CSS |
| Charting | Recharts |
| Mapping | React Leaflet + OpenStreetMap |
| HTTP client | Axios |
| Frontend tests | React Testing Library |

---

## 3. Project Folder Structure

```
aiqon-route-optimisation/
|
+-- IMPLEMENTATION_PLAN.md          <- this file
+-- README.md
+-- .gitignore
|
+-- backend/
|   +-- app/
|   |   +-- __init__.py
|   |   +-- main.py                 <- FastAPI app, CORS, routers, auto-seed
|   |   +-- database.py             <- SQLAlchemy engine + session factory
|   |   +-- models.py               <- ORM models
|   |   +-- schemas.py              <- Pydantic request/response schemas
|   |   +-- seed_data.py            <- Idempotent DB seeder
|   |   +-- data_loader.py          <- Future: public dataset loader stub
|   |   |
|   |   +-- services/
|   |   |   +-- scoring_service.py      <- Weighted scoring, normalisation, risk
|   |   |   +-- recommendation_service.py <- Orchestration layer
|   |   |   +-- explanation_service.py  <- Deterministic explanations
|   |   |   +-- weather_service.py      <- Simulated weather scenarios
|   |   |
|   |   +-- routers/
|   |   |   +-- shipments.py        <- GET /api/shipments, /stats, /{id}
|   |   |   +-- recommendations.py  <- POST /api/recommendations/evaluate
|   |   |   +-- weather.py          <- POST /api/weather/reassess, GET /status
|   |   |   +-- sources.py          <- GET /api/data-sources
|   |   |
|   |   +-- utils/
|   |       +-- validation.py
|   |
|   +-- data/
|   |   +-- ports.json              <- 35 port coordinates
|   |   +-- shipments_seed.json     <- 24 synthetic shipments x 2-4 routes
|   |
|   +-- tests/
|   |   +-- conftest.py
|   |   +-- test_scoring.py
|   |   +-- test_recommendations.py
|   |   +-- test_weather.py
|   |   +-- test_api.py
|   |
|   +-- requirements.txt
|   +-- .env.example
|
+-- frontend/
    +-- public/
    +-- src/
    |   +-- components/
    |   |   +-- layout/
    |   |   |   +-- Navbar.jsx
    |   |   |   +-- Sidebar.jsx
    |   |   +-- dashboard/
    |   |   |   +-- KpiCard.jsx
    |   |   |   +-- ShipmentTable.jsx
    |   |   |   +-- RiskDistributionChart.jsx
    |   |   |   +-- CostTransitChart.jsx
    |   |   +-- analysis/
    |   |   |   +-- ShipmentHeader.jsx
    |   |   |   +-- RouteComparison.jsx
    |   |   |   +-- ScoreBreakdownChart.jsx
    |   |   |   +-- RouteDetails.jsx
    |   |   |   +-- RecommendationSummary.jsx
    |   |   +-- map/
    |   |   |   +-- RouteMap.jsx
    |   |   |   +-- MapLegend.jsx
    |   |   +-- controls/
    |   |   |   +-- PlannerControls.jsx
    |   |   |   +-- WeightSliders.jsx
    |   |   |   +-- ConstraintInputs.jsx
    |   |   |   +-- PreferenceSelector.jsx
    |   |   +-- weather/
    |   |   |   +-- WeatherPanel.jsx
    |   |   +-- review/
    |   |   |   +-- PlannerReview.jsx
    |   |   +-- common/
    |   |       +-- Disclaimer.jsx
    |   |       +-- RiskBadge.jsx
    |   |       +-- LoadingSpinner.jsx
    |   |       +-- EmptyState.jsx
    |   |
    |   +-- pages/
    |   |   +-- DashboardPage.jsx
    |   |   +-- ShipmentAnalysisPage.jsx
    |   |
    |   +-- services/
    |   |   +-- api.js              <- Axios API service layer
    |   |
    |   +-- hooks/
    |   |   +-- useShipments.js
    |   |   +-- useRecommendation.js
    |   |   +-- useWeather.js
    |   |
    |   +-- utils/
    |   |   +-- riskColors.js
    |   |   +-- formatters.js
    |   |
    |   +-- App.jsx
    |   +-- main.jsx
    |   +-- index.css
    |
    +-- package.json
    +-- vite.config.js
    +-- tailwind.config.js
```

---

## 4. Data Models

### 4.1 Port
```json
{
  "id": "CNSHA",
  "name": "Port of Shanghai",
  "city": "Shanghai",
  "country": "China",
  "lat": 31.2304,
  "lon": 121.4737,
  "port_type": "seaport | inland | airport"
}
```

### 4.2 Shipment
```json
{
  "id": "SHP-001",
  "reference_number": "AIQ-2026-001",
  "cargo_type": "Electronics",
  "container_type": "40ft HC",
  "container_count": 3,
  "weight_tons": 18.5,
  "priority": "High Value",
  "origin_port_id": "CNSHA",
  "destination_port_id": "INHYD",
  "origin_label": "Shanghai, China",
  "destination_label": "Hyderabad, India",
  "ready_date": "2026-10-15",
  "status": "Under Review"
}
```

### 4.3 Route Option
```json
{
  "id": "RTE-001-A",
  "route_name": "Route A – Shanghai via Chennai (Direct)",
  "shipment_id": "SHP-001",
  "transport_mode": "Ocean + Road",
  "intermediate_port_ids": ["INMAA"],
  "weather_zone": "Bay of Bengal",
  "estimated_cost_usd": 8200,
  "estimated_transit_days": 24,
  "delay_probability_percent": 18,
  "congestion_risk": 42,
  "geopolitical_risk": 20,
  "weather_risk": 30,
  "carbon_estimate_kg": 4100,
  "capacity_status": "Available | Limited | Constrained | Full",
  "constraints": [],
  "risk_events": [],
  "route_notes": "Synthetic illustrative route."
}
```

### 4.4 Route Leg
```json
{
  "leg_order": 1,
  "from_port_id": "CNSHA",
  "to_port_id": "INMAA",
  "transport_mode": "Ocean",
  "distance_km": 4900,
  "duration_days": 20
}
```

---

## 5. Scoring Formula

### 5.1 Default Weights per Preference

| Factor           | Balanced | Lowest Cost | Fastest | Lowest Risk |
|---|---:|---:|---:|---:|
| Cost             | 28%      | 50%         | 10%     | 10%         |
| Transit Time     | 22%      | 10%         | 50%     | 10%         |
| Delay Probability| 18%      | 15%         | 20%     | 25%         |
| Port Congestion  | 12%      | 10%         |  8%     | 20%         |
| Geopolitical Risk| 12%      |  8%         |  8%     | 20%         |
| Weather Risk     |  5%      |  5%         |  3%     | 12%         |
| Carbon Emissions |  3%      |  2%         |  1%     |  3%         |
| **Total**        | **100%** | **100%**    | **100%**| **100%**    |

### 5.2 Normalisation Rule

For each metric, across all eligible routes for that shipment:

```
normalised_score = 1.0 - (value - min) / (max - min)
```

- Lower raw value → score closer to 1 (better)
- If all values equal → all routes score 1.0 for that factor
- If value is null → score is 0.0 (no artificial advantage for missing data)

### 5.3 Final Suitability Score

```
suitability_score = SUM(normalised_factor_j * weight_j) / total_weight * 100
```

Range: 0–100. Ranked descending. Highest score = recommendation.

### 5.4 Overall Risk Score

```
overall_risk = delay_prob * 0.35
             + congestion  * 0.25
             + geopolitical * 0.25
             + weather      * 0.15
```

| Score Range | Label    |
|---|---|
| 0 – 29      | Low      |
| 30 – 59     | Moderate |
| 60 – 100    | High     |

---

## 6. API Endpoints Reference

| Method | Endpoint                                | Description                           |
|---|----|---|
| GET    | `/api/health`                           | Service health check                  |
| GET    | `/api/shipments`                        | List shipments (search + filter)      |
| GET    | `/api/shipments/stats`                  | Dashboard KPI statistics              |
| GET    | `/api/shipments/{id}`                   | Shipment detail with routes           |
| GET    | `/api/shipments/{id}/routes`            | Route options only                    |
| POST   | `/api/recommendations/evaluate`         | Score and recommend a route           |
| POST   | `/api/recommendations/planner-review`   | Record local planner decision         |
| POST   | `/api/weather/reassess`                 | Apply weather scenario and re-score   |
| GET    | `/api/weather/status`                   | Available scenarios + descriptions    |
| GET    | `/api/data-sources`                     | Dataset provenance metadata           |

### Recommendation Request Shape
```json
{
  "shipment_id": "SHP-001",
  "weights": {
    "cost": 28, "transit_time": 22, "delay_probability": 18,
    "congestion": 12, "geopolitical": 12, "weather": 5, "carbon": 3
  },
  "constraints": {
    "max_cost_usd": null,
    "max_transit_days": null,
    "exclude_constrained_capacity": true
  },
  "preference": "balanced"
}
```

### Recommendation Response Shape
```json
{
  "shipment_id": "SHP-001",
  "eligible_routes": [],
  "excluded_routes": [],
  "recommendation": {},
  "score_breakdowns": [],
  "explanation": "...",
  "applied_weights": {},
  "applied_constraints": {},
  "preference": "balanced",
  "data_disclaimer": "Synthetic sample data"
}
```

---

## 7. Weather Simulation Design

| Scenario ID      | Label                     | Behaviour                                      |
|---|---|---|
| `normal`         | Normal Conditions          | No deltas applied                             |
| `moderate_storm` | Moderate Storm Disruption  | Moderate deltas on primary zones              |
| `severe_weather` | Severe Weather Disruption  | Large deltas; may change recommendation       |

### Zone Delta Examples (Severe Scenario)

| Zone             | weather_risk delta | delay_prob delta | transit days delta |
|---|---:|---:|---:|
| South China Sea  | +50                | +30              | +5                 |
| Bay of Bengal    | +45                | +25              | +4                 |
| Cape Route       | +45                | +28              | +5                 |
| North Atlantic   | +48                | +28              | +5                 |
| Arabian Sea      | +30                | +18              | +3                 |
| Pacific          | +35                | +20              | +4                 |
| Red Sea          | +10                | +5               | +0                 |

**Rule:** Weather scenario applies to a deep copy of route data only.
Original route records in the database are never modified.

---

## 8. Phased Implementation Checklist

### Phase 0 — Setup and Scaffold  [COMPLETE]
- [x] Project directory structure created
- [x] `backend/requirements.txt`
- [x] `backend/.env.example`
- [x] `backend/app/database.py`
- [x] `backend/app/models.py`
- [x] `backend/app/schemas.py`
- [x] `backend/data/ports.json` (35 ports)
- [x] `backend/data/shipments_seed.json` (24 shipments)

### Phase 1 — Backend Services  [COMPLETE]
- [x] `services/scoring_service.py`
- [x] `services/recommendation_service.py`
- [x] `services/explanation_service.py`
- [x] `services/weather_service.py`
- [x] `app/seed_data.py`
- [x] `utils/validation.py`
- [x] `routers/shipments.py`
- [x] `routers/recommendations.py`

### Phase 2 — Backend Completion  [TODO]
- [ ] `routers/weather.py` — reassess + status endpoints
- [ ] `routers/sources.py` — data sources endpoint
- [ ] `app/main.py` — FastAPI app + CORS + router wiring + auto-seed
- [ ] `app/__init__.py`, `services/__init__.py`, `routers/__init__.py`
- [ ] `app/data_loader.py` — stub for future dataset loading
- [ ] Verify: `uvicorn app.main:app --reload` starts correctly
- [ ] Verify: DB auto-created and seeded on first run
- [ ] Verify: All endpoints return correct responses

### Phase 3 — Backend Tests  [TODO]
- [ ] `tests/conftest.py` — in-memory SQLite test fixtures
- [ ] `tests/test_scoring.py`
  - [ ] Normalisation: equal values, single route, mixed values
  - [ ] Weighted score: correct factor contributions
  - [ ] Weight validation: total != 100 raises error
  - [ ] Preference presets produce distinct weight sets
  - [ ] Missing field: null metrics score 0, not excluded unless critical
  - [ ] Overall risk: formula and label thresholds correct
- [ ] `tests/test_recommendations.py`
  - [ ] Max cost constraint excludes over-budget routes
  - [ ] Max transit days constraint excludes slow routes
  - [ ] Constrained capacity exclusion toggle
  - [ ] No eligible routes returns clear response
  - [ ] Top-scoring route correctly selected
  - [ ] Explanation matches computed values
- [ ] `tests/test_weather.py`
  - [ ] Normal scenario applies no changes
  - [ ] Moderate scenario applies correct zone deltas
  - [ ] Severe scenario may change recommendation
  - [ ] Original DB route data unchanged after reassessment
- [ ] `tests/test_api.py`
  - [ ] GET /api/health -> 200
  - [ ] GET /api/shipments -> 24 shipments
  - [ ] GET /api/shipments/{valid_id} -> routes included
  - [ ] GET /api/shipments/{invalid_id} -> 404
  - [ ] POST /api/recommendations/evaluate with valid request -> recommendation
  - [ ] POST /api/recommendations/evaluate with bad weights -> 422
  - [ ] POST /api/weather/reassess moderate_storm -> scenario applied
  - [ ] GET /api/data-sources -> synthetic metadata
- [ ] Run pytest, fix all failures

### Phase 4 — Frontend Scaffold  [TODO]
- [ ] `npx create-vite@latest frontend --template react` (in project root)
- [ ] `npm install react-leaflet leaflet recharts axios react-router-dom`
- [ ] `npm install -D tailwindcss postcss autoprefixer`
- [ ] `npx tailwindcss init -p`
- [ ] `vite.config.js` — server.proxy /api -> http://localhost:8000
- [ ] `tailwind.config.js` — configure content paths
- [ ] `index.css` — Tailwind directives + custom design tokens
- [ ] `App.jsx` — React Router with two routes

### Phase 5 — Frontend Services and Hooks  [TODO]
- [ ] `services/api.js` — Axios baseURL + all API functions
- [ ] `hooks/useShipments.js` — shipment list with filter state
- [ ] `hooks/useRecommendation.js` — evaluate state + loading + error
- [ ] `hooks/useWeather.js` — scenario state + reassessment result
- [ ] `utils/riskColors.js` — colour constants for Low/Moderate/High
- [ ] `utils/formatters.js` — formatCurrency, formatDays, formatPct

### Phase 6 — Common Components  [TODO]
- [ ] `Disclaimer.jsx` — synthetic data warning banner
- [ ] `RiskBadge.jsx` — coloured risk label badge
- [ ] `LoadingSpinner.jsx`
- [ ] `EmptyState.jsx` — no routes / no results
- [ ] `Navbar.jsx` — app title + back navigation

### Phase 7 — Dashboard Page  [TODO]
- [ ] `KpiCard.jsx` — stat card (total, under review, avg delay, high-risk count)
- [ ] `ShipmentTable.jsx` — searchable, filterable shipment list
- [ ] `RiskDistributionChart.jsx` — Recharts pie chart
- [ ] `CostTransitChart.jsx` — Recharts scatter (cost vs transit)
- [ ] `DashboardPage.jsx` — full dashboard assembly
- [ ] Row click navigates to `/shipment/:id`

### Phase 8 — Shipment Analysis Page  [TODO]
- [ ] `ShipmentHeader.jsx` — reference, cargo, container, weight, dates
- [ ] `RecommendationSummary.jsx` — top recommended route card
- [ ] `RouteComparison.jsx` — comparison table with risk badges + scores
- [ ] `ScoreBreakdownChart.jsx` — grouped bar chart per route
- [ ] `RouteDetails.jsx` — expandable leg-by-leg breakdown
- [ ] `ShipmentAnalysisPage.jsx` — full analysis page assembly

### Phase 9 — Interactive Map  [TODO]
- [ ] `RouteMap.jsx`
  - [ ] Origin marker + destination marker
  - [ ] Intermediate port markers with popups
  - [ ] Polyline per route option (distinct colours)
  - [ ] Recommended route: green/teal, 4px width
  - [ ] Other routes: muted colours, 2px width
  - [ ] Click polyline to select route
  - [ ] Auto fit-bounds to all routes on load
  - [ ] Focus Recommended Route button
  - [ ] OpenStreetMap tiles + attribution
  - [ ] Loading and error states
- [ ] `MapLegend.jsx` — route colour key + capacity icons

### Phase 10 — Planner Controls  [TODO]
- [ ] `WeightSliders.jsx` — 7 sliders + running total indicator
- [ ] `ConstraintInputs.jsx` — max cost input, max days input, capacity toggle
- [ ] `PreferenceSelector.jsx` — 4-option radio/button group
- [ ] `PlannerControls.jsx` — assembles controls + triggers re-evaluate
- [ ] Weight total validation: submit disabled if total != 100
- [ ] Loading/disabled state during recalculation
- [ ] Reset to defaults button

### Phase 11 — Weather Reassessment Panel  [TODO]
- [ ] `WeatherPanel.jsx`
  - [ ] Three-scenario selector
  - [ ] "Simulated weather — not live data" notice
  - [ ] Affected routes list after reassessment
  - [ ] Updated recommendation display
  - [ ] Changed/unchanged explanation text
  - [ ] Reset Conditions button

### Phase 12 — Planner Review Panel  [TODO]
- [ ] `PlannerReview.jsx`
  - [ ] Approve Recommendation button
  - [ ] Choose Alternate + route dropdown
  - [ ] Decision note textarea
  - [ ] Local review status display
  - [ ] Carrier communication notice
  - [ ] POST to planner-review endpoint

### Phase 13 — Integration and Polish  [TODO]
- [ ] Map selection synced with comparison table selection
- [ ] Weight/constraint changes debounced then auto re-evaluate
- [ ] Weather change triggers auto reassessment
- [ ] Stale-result overlay during loading
- [ ] Responsive layout across breakpoints
- [ ] Error boundaries around map and charts
- [ ] "Data unavailable" shown for null fields throughout

### Phase 14 — Final Verification  [TODO]
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] DB created and seeded on first run (24 shipments)
- [ ] List, search, filter work
- [ ] Recommendation correct and matches explanation
- [ ] Map renders all routes with markers
- [ ] Recommended route highlighted
- [ ] Route selection updates details
- [ ] Weight changes update recommendation live
- [ ] Invalid weight total shows error
- [ ] Weather severe scenario changes recommendation
- [ ] Original data unchanged after weather change
- [ ] Planner review persists
- [ ] pytest passes
- [ ] No external API key required
- [ ] No synthetic data presented as real

### Phase 15 — README and Documentation  [TODO]
- [ ] `README.md` — full setup and usage guide
- [ ] `.gitignore` — venv, __pycache__, .env, *.db, node_modules, dist
- [ ] Verify README commands match actual implementation

---

## 9. Key Engineering Decisions

| Decision | Rationale |
|---|---|
| SQLite not Postgres | Zero-config local dev; swappable via DATABASE_URL |
| Deterministic scoring not ML | No training data; fully transparent and testable |
| Deep-copy for weather | Original data integrity guaranteed across scenario switches |
| Explanation from computed values | Cannot contradict actual scores |
| Preference presets override weights | Avoids silent no-op when preference changes |
| Per-zone weather deltas | Routes experience different impacts; demonstrates value |
| Synthetic data labelled clearly | Assignment requirement; no misrepresentation |

---

## 10. Future Integration Roadmap (Out of Scope for v1)

| Future Feature | Interface to Extend |
|---|---|
| Live weather API (Open-Meteo etc.) | `weather_service.py` — add provider adapter |
| Public port performance data | `data_loader.py` — pluggable dataset loader |
| Historical maritime delay statistics | `scoring_service.py` — replace synthetic priors |
| Gemini AI explanations | `explanation_service.py` — add AI provider option |
| UN/LOCODE port coordinates | `seed_data.py` -> `data_loader.py` pipeline |
| Vessel AIS positions | New `vessel_service.py` module |

---

*Last updated: 2026-10-10*
*This is a living document. Check boxes are ticked as implementation progresses.*

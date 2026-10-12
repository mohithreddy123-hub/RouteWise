# RouteWise — AI-Powered Shipment Route Optimisation System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![MySQL](https://img.shields.io/badge/Database-MySQL_8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![SQLite](https://img.shields.io/badge/Fallback-SQLite_3-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn_1.4+-F7931E?logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)
[![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Bundler-Vite_8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Mapping-Leaflet_1.9-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An intelligent decision-support system built for logistics planners and freight forwarders to evaluate multi-factor trade-offs across global maritime and multimodal shipping corridors.

---

## 1. Project Overview

Global container shipping is volatile. Ocean freight planners face competing operational priorities:
- **Cost minimization** vs. **Transit speed**
- **Port congestion** at major transshipment hubs (Singapore, Colombo, Port Klang)
- **Severe weather disruptions** (typhoons and cyclones in the Bay of Bengal and South China Sea)
- **Geopolitical chokepoint vulnerabilities** (Red Sea / Suez Canal, Strait of Malacca)
- **Decarbonization mandates** (IMO greenhouse gas emissions reduction targets)

**RouteWise** delivers an automated, transparent route evaluation engine. Rather than acting as an opaque "black-box" or booking freight autonomously, the platform calculates quantitative suitability scores across all eligible routes, presents clear mathematical trade-off rationales, forecasts corridor delay risks using machine learning, and supports human-in-the-loop (HITL) approval or override workflows.

---

## 2. Architecture & Data Flow

```mermaid
graph TD
    A[Synthetic Seeder: ports.json & shipments_seed.json] -->|Auto-seed on startup| B[(Database: MySQL 8.0 / SQLite Fallback)]
    B --> C[FastAPI REST Backend :8000]
    
    subgraph Core Optimization & ML Pipeline
        C --> D[Hard Constraints Filter: Budget, Transit Days, Capacity]
        D --> E[Multi-Factor Normalisation Engine]
        E --> F[Weighted MCDA Scoring Core]
        F --> G[Deterministic Explanation Generator]
        F --> H[Dynamic Weather Perturbation Simulator]
        F --> ML[Scikit-Learn Delay Prediction Regressor]
    end
    
    C -->|REST API & /api proxy| I[React 19 + Vite Frontend :5173]
    
    subgraph User Experience
        I --> J[Dashboard: KPIs, Inventory Table, Risk & Cargo Charts]
        I --> K[Corridor Deep-Dive: Interactive Leaflet Map & Trade Legs]
        I --> L[Multi-Factor Score Breakdown Stacked Bar Chart]
        I --> M[Planner Controls: 7 Weight Sliders & Presets]
        I --> N[Weather Scenario Switchers: Normal, Moderate, Severe]
        I --> O[ML Delay Risk Forecast Badges]
        I --> P[Planner Review & Persistent Audit Trail]
    end
```

---

## 3. Technology Stack

### Backend
- **Python 3.12**: Core programming language.
- **FastAPI**: Asynchronous web framework with automatic OpenAPI documentation.
- **SQLAlchemy 2.0**: Object-Relational Mapping (ORM), connection pooling (`pool_pre_ping`, `pool_recycle`), and session management.
- **MySQL 8.0 & PyMySQL**: Primary enterprise relational database support configured via `DATABASE_URL`.
- **SQLite 3**: Zero-configuration local database and automated test runner fallback.
- **Scikit-Learn & Joblib**: Machine learning regression pipeline for corridor delay risk estimation.
- **Pydantic v2**: Strict input validation and serialization schemas.
- **Pytest & HTTPX**: Comprehensive automated testing framework (85 tests passing).

### Frontend
- **React 19**: Modern component architecture utilizing hooks (`useState`, `useEffect`, `useMemo`).
- **Vite 8**: Rapid build tool with Hot Module Replacement (HMR) and production bundling.
- **Tailwind CSS 3**: Custom dark-mode logistics theme design system.
- **React-Leaflet & Leaflet 1.9**: Interactive GIS mapping of global ports and trade corridors using standard OpenStreetMap tiles.
- **Recharts**: Responsive data visualization (donut risk charts, commodity distribution bars, and stacked factor score charts).
- **Axios**: Centralized API client with safe payload handling.
- **React Router v7**: Client-side single-page application routing.

---

## 4. Multi-Factor Scoring Algorithm (MCDA Engine)

RouteWise implements a deterministic **Multi-Criteria Decision Analysis (MCDA)** model evaluated over 7 weighted factors:

### 4.1 Normalisation Formula (Lower-is-Better)
For every metric $v$ across all eligible routes for a given shipment:
$$\text{Normalised Score} = 1.0 - \frac{v - v_{\min}}{v_{\max} - v_{\min}}$$

- **1.0**: Best raw value among compared routes.
- **0.0**: Worst raw value among compared routes.
- If all route options have equal values, all routes receive $1.0$ for that factor.

### 4.2 Preference Presets & Default Weights

| Factor | Balanced | Lowest Cost | Fastest | Lowest Risk |
| :--- | :---: | :---: | :---: | :---: |
| **Cost** | 28% | 50% | 10% | 10% |
| **Transit Time** | 22% | 10% | 50% | 10% |
| **Delay Probability** | 18% | 15% | 20% | 25% |
| **Port Congestion Risk** | 12% | 10% | 8% | 20% |
| **Geopolitical Risk** | 12% | 8% | 8% | 20% |
| **Weather Risk** | 5% | 5% | 3% | 12% |
| **Carbon Emissions** | 3% | 2% | 1% | 3% |
| **Total** | **100%** | **100%** | **100%** | **100%** |

### 4.3 Composite Suitability Score
$$\text{Suitability Score} = \sum_{i=1}^{7} \left( w_i \times \text{Normalised Score}_i \right) \times 100$$

### 4.4 Overall Route Risk Calculation
$$\text{Overall Risk} = (0.35 \times \text{Delay Prob}) + (0.30 \times \text{Congestion}) + (0.20 \times \text{Geopolitics}) + (0.15 \times \text{Weather})$$
- **Low Risk**: $0.0 \le \text{Risk} < 30.0$
- **Moderate Risk**: $30.0 \le \text{Risk} < 60.0$
- **High Risk**: $\text{Risk} \ge 60.0$

---

## 5. Machine Learning Enhancement: Shipment Delay Prediction

RouteWise incorporates a **Scikit-Learn Random Forest Regressor** to predict route delay probabilities based on multi-dimensional corridor characteristics.

### 5.1 Architecture & Inputs
- **Algorithm**: `RandomForestRegressor(n_estimators=50, max_depth=5, random_state=42)`
- **Framework**: `scikit-learn` + `joblib`
- **Input Features**:
  1. `transit_days`: Estimated duration of the shipment corridor.
  2. `congestion_risk`: Port dwell and transshipment hub congestion index (0–100).
  3. `weather_risk`: Corridor maritime weather hazard score (0–100).
  4. `geopolitical_risk`: Chokepoint security and regional instability index (0–100).
  5. `num_legs`: Transshipment complexity (number of intermediate transfers).
  6. `total_distance_km`: Cumulative nautical and overland distance.
- **Target Variable**: Expected Delay Probability Percentage (`0.0%` to `100.0%`).

### 5.2 Held-Out Evaluation Results
Trained and evaluated on an 80/20 train/test split:
- **Training Samples**: 55 routes
- **Held-Out Test Samples**: 14 routes
- **Mean Absolute Error (MAE)**: **1.61%**
- **Root Mean Squared Error (RMSE)**: **2.02%**
- **R² Score**: **0.897** (explains ~89.7% of corridor variance)
- **Primary Feature Drivers**: Congestion risk (~85.6%), Weather risk (~4.5%), Geopolitical risk (~4.5%), Transit duration (~3.6%).

### 5.3 Role & Limitations
- **Decision-Support Complement**: The ML delay prediction does not replace the deterministic MCDA engine; rather, it enriches the route evaluation payload and displays a predictive delay forecast badge alongside baseline metrics.
- **Dataset Disclosure**: This model is trained on RouteWise's synthetic multi-modal corridor benchmark dataset (69 route alternatives across 24 global shipments). In a live enterprise deployment, this module is structured to retrain on actual historical carrier telematics (AIS transponder pings and EDI container status feeds).

---

## 6. Key Application Features

1. **Planner Surveillance Dashboard**:
   - 4 live KPI cards tracking Total Active Shipments, Under Review count, Average Delay Probability, and High Risk corridors.
   - Dynamic route count derived from real-time API statistics (69 routes across 35 ports).
   - Instant search across shipment IDs, port codes, and cargo commodities.
   - Status (`Under Review`, `Approved`, `Alternate Selected`) and Priority filters.
   - Recharts global risk distribution donut chart and cargo volume breakdown.

2. **Maritime Trade Corridor Mapping**:
   - Interactive OpenStreetMap integration with automatic bound fitting.
   - Visual distinction between Recommended route (green), Selected route (sky blue), and Alternate routes (slate).
   - Port waypoint markers displaying port names, UN/LOCODEs, coordinates, and types.

3. **Multi-Factor Score Breakdown Chart**:
   - Stacked horizontal Recharts bar chart showing exact point contributions from all 7 factors out of 100 points.

4. **Interactive Optimization Controls**:
   - 4 one-click preference presets.
   - 7 independent weight sliders with real-time 100% total validation.
   - Hard constraints (Maximum Cost USD, Maximum Transit Days, and Constrained Capacity exclusion toggle).

5. **Weather Disruption Simulation**:
   - Three meteorological scenarios: **Normal**, **Moderate Storm**, and **Severe Cyclone**.
   - Applies targeted delay and risk vectors to specific sea zones (Bay of Bengal, South China Sea, Malacca Strait) in-memory without corrupting baseline database records.

6. **Planner Governance & Audit Trail**:
   - Human-in-the-loop review form: Approve recommendation or select an alternate route with required justification notes.
   - Persistent audit log tracking decision records, timestamps, and justification notes in MySQL/SQLite.

---

## 7. Database Configuration & MySQL Migration

RouteWise supports both **MySQL 8.0+** and **SQLite 3** out of the box via SQLAlchemy 2.0.

### 7.1 Configuration via `DATABASE_URL`
Set the `DATABASE_URL` environment variable in `backend/.env`:

```env
# MySQL 8.0 Configuration:
DATABASE_URL=mysql+pymysql://root:your_password@localhost:3306/routewise_db

# SQLite Fallback Configuration:
# DATABASE_URL=sqlite:///./aiqon.db
```

### 7.2 Safe Migration & Resilience
- **Explicit Schema Types**: All primary keys and indexed strings utilize explicit lengths (`String(64)`, `String(255)`), ensuring clean table creation on MySQL InnoDB.
- **Connection Pooling**: When MySQL is detected, the engine activates `pool_pre_ping=True` and `pool_recycle=3600` to prevent stale disconnects.
- **Zero-Duplicate Seeding**: Seeding queries verify record presence before insertion; rerunning the seeder inserts 0 duplicates.
- **Graceful Fallback Safeguard**: If MySQL credentials fail or the server is temporarily unreachable, the application logs a warning and falls back safely to local SQLite (`aiqon.db`).

---

## 8. Windows Setup Instructions

### Prerequisites
- **Python 3.10+** (Python 3.12 recommended): [Download Python](https://www.python.org/downloads/)
- **Node.js 18+** (Node.js 20+ recommended): [Download Node.js](https://nodejs.org/)
- **Git**: [Download Git](https://git-scm.com/)
- *(Optional)* **MySQL 8.0+** (Running locally on port 3306)

---

### Step 1: Clone the Repository
```powershell
git clone https://github.com/mohithreddy123-hub/RouteWise.git
cd RouteWise\aiqon-route-optimisation
```

---

### Step 2: Backend Setup (Python + FastAPI)

1. Open PowerShell and navigate to the backend folder:
   ```powershell
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```

3. Install required Python dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

4. *(Optional)* Configure MySQL database:
   Create a database in MySQL and create `backend/.env`:
   ```powershell
   DATABASE_URL=mysql+pymysql://root:your_password@localhost:3306/routewise_db
   ```
   *(If omitted, RouteWise defaults automatically to SQLite).*

5. Start the backend API server:
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```
   *The database is automatically initialized and seeded with 35 ports and 24 shipments (69 routes) on first run.*
   - **Backend API:** [http://localhost:8000](http://localhost:8000)
   - **Interactive API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **ML Model Status:** [http://localhost:8000/api/recommendations/ml-status](http://localhost:8000/api/recommendations/ml-status)

---

### Step 3: Frontend Setup (React + Vite)

1. Open a **second** PowerShell window and navigate to the frontend folder:
   ```powershell
   cd aiqon-route-optimisation\frontend
   ```

2. Install Node.js dependencies:
   ```powershell
   npm install
   ```

3. Start the Vite development server:
   ```powershell
   npm run dev
   ```
   - **Web Application:** [http://localhost:5173](http://localhost:5173)

---

## 9. Running Automated Tests & Builds

### Run Complete Backend Test Suite (85 Tests)
In the backend terminal with the virtual environment activated:
```powershell
pytest -v
```
*Expected result: 85 passed tests (76 core MCDA + 4 MySQL migration + 5 Scikit-Learn ML tests) in ~0.5s.*

### Run Frontend Production Build
In the frontend terminal:
```powershell
npm run build
```
*Expected result: `✓ built in ~700ms` with 0 errors.*

---

## 10. Project Directory Structure

```text
RouteWise/
├── .gitignore                                 # Root Git ignore rules (DBs, venv, caches, node_modules)
├── README.md                                  # Repository documentation
└── aiqon-route-optimisation/
    ├── backend/
    │   ├── requirements.txt                   # Backend dependencies (FastAPI, SQLAlchemy, PyMySQL, Scikit-Learn)
    │   ├── .env.example                       # Environment variables template (MySQL & SQLite)
    │   ├── data/
    │   │   ├── ports.json                     # 35 global ports with coordinates
    │   │   └── shipments_seed.json            # 24 shipments and 69 route options
    │   ├── model_artifacts/                   # Trained scikit-learn model artifacts
    │   │   ├── delay_rf_model.joblib          # Serialized Random Forest model
    │   │   └── model_metrics.json             # Held-out evaluation metrics
    │   ├── app/
    │   │   ├── database.py                    # MySQL/SQLite connection pooling & fallback
    │   │   ├── models.py                      # SQLAlchemy ORM schemas with explicit lengths
    │   │   ├── schemas.py                     # Pydantic validation schemas
    │   │   ├── seed_data.py                   # Idempotent DB seeder
    │   │   ├── main.py                        # FastAPI entrypoint, CORS & routers
    │   │   ├── routers/                       # REST route handlers
    │   │   └── services/                      # Scoring, Recommendation, Weather & ML services
    │   │       ├── scoring_service.py         # MCDA normalization & multi-criteria scoring
    │   │       ├── recommendation_service.py  # Evaluation orchestration & ML enrichment
    │   │       ├── weather_service.py         # Dynamic weather scenario perturbation
    │   │       ├── explanation_service.py     # Deterministic rationale generator
    │   │       └── ml_delay_service.py        # Scikit-learn delay regression model
    │   └── tests/                             # 85 Pytest unit, ML & MySQL integration tests
    └── frontend/
        ├── package.json                       # Frontend packages & scripts
        ├── vite.config.js                     # Vite build & /api dev proxy
        ├── tailwind.config.js                 # Tailwind CSS theme configuration
        ├── postcss.config.js                  # PostCSS plugins
        └── src/
            ├── api.js                         # Centralized Axios API client
            ├── utils.js                       # Display formatters & risk styling
            ├── Dashboard.jsx                  # Surveillance dashboard component
            ├── ShipmentAnalysis.jsx           # Interactive map, scoring chart & review component
            └── App.jsx                        # Application shell & React Router routes
```

---

## 11. License

This project is licensed under the [MIT License](LICENSE).
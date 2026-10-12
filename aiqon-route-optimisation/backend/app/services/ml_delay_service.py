"""
Machine Learning Delay Prediction Service for RouteWise.

Provides a scikit-learn based predictive model that estimates shipment route delay
probabilities based on corridor attributes, operational risks, and weather factors.

DISCLOSURE:
Trained on synthetic corridor benchmark records (69 route configurations across 24 shipments).
This model serves as a decision-support prototype. In production, this module is designed
to be retrained on real carrier GPS telemetry, AIS transponder records, and port dwell logs.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

logger = logging.getLogger(__name__)

DATA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "shipments_seed.json"))
MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "model_artifacts"))
MODEL_FILE = os.path.join(MODEL_DIR, "delay_rf_model.joblib")
METRICS_FILE = os.path.join(MODEL_DIR, "model_metrics.json")

FEATURE_NAMES = [
    "transit_days",
    "congestion_risk",
    "weather_risk",
    "geopolitical_risk",
    "num_legs",
    "total_distance_km",
]


class DelayPredictor:
    """Random Forest regressor for predicting route delay probability."""

    def __init__(self):
        self.model: Optional[RandomForestRegressor] = None
        self.metrics: Dict[str, Any] = {}
        self._load_or_train()

    def _extract_features_from_dict(self, route_data: Dict[str, Any]) -> List[float]:
        if not isinstance(route_data, dict):
            return [15.0, 0.0, 0.0, 0.0, 0.0, 0.0]

        def _safe_float(val: Any, default: float = 0.0) -> float:
            if val is None:
                return default
            try:
                num = float(val)
                return num if np.isfinite(num) else default
            except (ValueError, TypeError):
                return default

        legs = route_data.get("legs") or []
        if not isinstance(legs, list):
            legs = []

        transit_days = _safe_float(route_data.get("estimated_transit_days"), 15.0)
        congestion_risk = _safe_float(route_data.get("congestion_risk"), 0.0)
        weather_risk = _safe_float(route_data.get("weather_risk"), 0.0)
        geopolitical_risk = _safe_float(route_data.get("geopolitical_risk"), 0.0)
        num_legs = float(len(legs))
        total_distance_km = sum(
            _safe_float(l.get("distance_km") if isinstance(l, dict) else 0.0, 0.0)
            for l in legs
        )

        return [transit_days, congestion_risk, weather_risk, geopolitical_risk, num_legs, total_distance_km]

    def _load_training_dataset(self) -> pd.DataFrame:
        if not os.path.exists(DATA_PATH):
            raise FileNotFoundError(f"Seed data not found at {DATA_PATH}")

        with open(DATA_PATH, "r", encoding="utf-8") as f:
            shipments = json.load(f)

        rows = []
        for s in shipments:
            for r in s.get("routes", []):
                feats = self._extract_features_from_dict(r)
                delay_prob = float(r.get("delay_probability_percent") or 0.0)
                rows.append(feats + [delay_prob])

        cols = FEATURE_NAMES + ["delay_probability_percent"]
        return pd.DataFrame(rows, columns=cols)

    def train(self, test_size: float = 0.2, random_state: int = 42) -> Dict[str, Any]:
        """Train Random Forest regressor with held-out validation."""
        df = self._load_training_dataset()
        X = df[FEATURE_NAMES]
        y = df["delay_probability_percent"]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state
        )

        model = RandomForestRegressor(
            n_estimators=50,
            max_depth=5,
            min_samples_split=2,
            random_state=random_state,
        )
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        mae = float(mean_absolute_error(y_test, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        r2 = float(r2_score(y_test, y_pred))

        importances = {
            feat: round(float(imp), 4)
            for feat, imp in zip(FEATURE_NAMES, model.feature_importances_)
        }

        self.model = model
        self.metrics = {
            "algorithm": "RandomForestRegressor",
            "framework": "scikit-learn",
            "n_estimators": 50,
            "train_samples": int(len(X_train)),
            "test_samples": int(len(X_test)),
            "held_out_mae": round(mae, 2),
            "held_out_rmse": round(rmse, 2),
            "held_out_r2": round(r2, 4),
            "feature_importances": importances,
            "data_source": "synthetic_corridor_benchmarks",
            "disclaimer": (
                "Trained on synthetic multi-modal route records. "
                "Intended for decision support and scenario comparison."
            ),
        }

        # Save artifacts
        os.makedirs(MODEL_DIR, exist_ok=True)
        joblib.dump(self.model, MODEL_FILE)
        with open(METRICS_FILE, "w", encoding="utf-8") as f:
            json.dump(self.metrics, f, indent=2)

        logger.info(f"ML Delay Model trained: MAE={mae:.2f}%, RMSE={rmse:.2f}%, R2={r2:.4f}")
        return self.metrics

    def _load_or_train(self):
        """Load cached model or train new one if artifact missing or stale."""
        if os.path.exists(MODEL_FILE) and os.path.exists(METRICS_FILE):
            try:
                # Invalidate cache if underlying training dataset has been modified
                if os.path.exists(DATA_PATH):
                    data_mtime = os.path.getmtime(DATA_PATH)
                    model_mtime = os.path.getmtime(MODEL_FILE)
                    if data_mtime > model_mtime:
                        logger.info("Seed dataset modified since last train. Invalidating cache and retraining...")
                        return self.train()

                self.model = joblib.load(MODEL_FILE)
                with open(METRICS_FILE, "r", encoding="utf-8") as f:
                    self.metrics = json.load(f)
                return
            except Exception as e:
                logger.warning(f"Failed to load cached model: {e}. Retraining...")

        self.train()

    def predict_route(self, route_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict delay probability for a single route."""
        if not isinstance(route_data, dict):
            route_data = {}

        if self.model is None:
            self._load_or_train()

        feats = self._extract_features_from_dict(route_data)
        X = pd.DataFrame([feats], columns=FEATURE_NAMES)
        pred_val = float(self.model.predict(X)[0])
        # Bound between 0% and 100%
        pred_val = max(0.0, min(100.0, round(pred_val, 1)))

        risk_category = "Low"
        if pred_val >= 25.0:
            risk_category = "High"
        elif pred_val >= 16.0:
            risk_category = "Moderate"

        return {
            "ml_predicted_delay_prob": pred_val,
            "ml_risk_category": risk_category,
            "is_synthetic_model": True,
            "primary_factors": {
                "congestion_impact": route_data.get("congestion_risk", 0),
                "weather_impact": route_data.get("weather_risk", 0),
                "geopolitical_impact": route_data.get("geopolitical_risk", 0),
            },
        }

    def get_status(self) -> Dict[str, Any]:
        """Return model metadata, metrics, and training status."""
        return {
            "status": "ready" if self.model is not None else "uninitialized",
            "metrics": self.metrics,
            "features_used": FEATURE_NAMES,
        }


# Singleton instance
delay_predictor = DelayPredictor()

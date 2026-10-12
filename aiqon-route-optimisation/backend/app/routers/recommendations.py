"""Recommendations router."""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.schemas import RecommendationRequest, RecommendationResponse
from app.services import recommendation_service
from app.services.ml_delay_service import delay_predictor

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])

DATA_DISCLAIMER = (
    "This application uses synthetic sample data. All costs, transit times, "
    "risk scores, and route options are illustrative and not verified commercial data."
)


@router.get("/ml-status", response_model=dict)
def get_ml_status():
    """Return scikit-learn ML delay predictor metadata, metrics, and data disclosure."""
    return delay_predictor.get_status()



@router.post("/evaluate", response_model=dict)
def evaluate(request: RecommendationRequest, db: Session = Depends(get_db)):
    """Evaluate and recommend a route for the given shipment."""
    result = recommendation_service.evaluate_recommendation(
        shipment_id=request.shipment_id,
        weights=request.weights,
        constraints=request.constraints,
        preference=request.preference,
        db=db,
    )

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    # Persist evaluation
    eval_record = models.RecommendationEvaluation(
        id=str(uuid.uuid4()),
        shipment_id=request.shipment_id,
        recommended_route_id=result["recommendation"]["id"] if result.get("recommendation") else None,
        preference=request.preference,
        applied_weights=result["applied_weights"],
        applied_constraints=result["applied_constraints"],
        score_breakdowns=result["score_breakdowns"],
        explanation=result["explanation"],
        weather_scenario="normal",
    )
    db.add(eval_record)
    db.commit()

    return {**result, "data_disclaimer": DATA_DISCLAIMER}


@router.post("/planner-review", response_model=dict)
def submit_planner_review(
    shipment_id: str,
    decision: str,
    selected_route_id: str = None,
    decision_note: str = None,
    db: Session = Depends(get_db),
):
    """Record planner review decision (local only — no carrier communication)."""
    shipment = db.query(models.Shipment).filter(models.Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail=f"Shipment '{shipment_id}' not found")

    valid_decisions = {"approved", "alternate", "pending"}
    if decision not in valid_decisions:
        raise HTTPException(status_code=422, detail=f"decision must be one of {sorted(valid_decisions)}")

    review = models.PlannerReview(
        id=str(uuid.uuid4()),
        shipment_id=shipment_id,
        decision=decision,
        selected_route_id=selected_route_id,
        decision_note=decision_note,
    )
    db.add(review)

    if decision == "approved":
        shipment.status = "Approved"
    elif decision == "alternate":
        shipment.status = "Alternate Selected"

    db.commit()

    return {
        "id": review.id,
        "shipment_id": review.shipment_id,
        "decision": review.decision,
        "selected_route_id": review.selected_route_id,
        "decision_note": review.decision_note,
        "reviewed_at": review.reviewed_at.isoformat(),
        "notice": (
            "Planner approval records a review decision only. "
            "It does not execute a shipment action or communicate with carriers."
        ),
    }

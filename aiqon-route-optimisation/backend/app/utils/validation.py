from typing import Optional
from fastapi import HTTPException


def require_shipment(shipment, shipment_id: str):
    if shipment is None:
        raise HTTPException(
            status_code=404,
            detail=f"Shipment '{shipment_id}' not found. Check the shipment ID and try again."
        )


def validate_positive(value: Optional[float], field: str):
    if value is not None and value < 0:
        raise HTTPException(
            status_code=422,
            detail=f"'{field}' must be a non-negative number."
        )

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app import models

router = APIRouter(prefix="/api/ports", tags=["ports"])


@router.get("", response_model=List[dict])
def get_all_ports(
    country: Optional[str] = None,
    port_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Port)
    if country:
        query = query.filter(models.Port.country.ilike(f"%{country}%"))
    if port_type:
        query = query.filter(models.Port.port_type.ilike(f"%{port_type}%"))
    
    ports = query.order_by(models.Port.name).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "city": p.city,
            "country": p.country,
            "lat": p.lat,
            "lon": p.lon,
            "port_type": p.port_type,
            "notes": p.notes,
        }
        for p in ports
    ]


@router.get("/{port_id}", response_model=dict)
def get_port(port_id: str, db: Session = Depends(get_db)):
    port = db.query(models.Port).filter(models.Port.id == port_id.upper()).first()
    if not port:
        raise HTTPException(status_code=404, detail=f"Port '{port_id}' not found")

    origin_count = db.query(models.Shipment).filter(models.Shipment.origin_port_id == port.id).count()
    dest_count = db.query(models.Shipment).filter(models.Shipment.destination_port_id == port.id).count()

    return {
        "id": port.id,
        "name": port.name,
        "city": port.city,
        "country": port.country,
        "lat": port.lat,
        "lon": port.lon,
        "port_type": port.port_type,
        "notes": port.notes,
        "active_origin_shipments": origin_count,
        "active_destination_shipments": dest_count,
        "total_connected_shipments": origin_count + dest_count,
    }

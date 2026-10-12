"""
FastAPI Router for RouteWise GenAI Logistics Assistant.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import assistant_service

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message text")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000, description="User prompt or question")
    conversation_history: Optional[List[ChatMessage]] = Field(default=[], description="Previous conversation turns")
    shipment_id: Optional[str] = Field(default=None, description="Optional active shipment context")


class ChatResponse(BaseModel):
    reply: str
    tool_calls: Optional[List[Dict[str, Any]]] = []
    route_recommendation: Optional[Dict[str, Any]] = None
    provider: str
    model: str
    note: Optional[str] = None


@router.get("/status", response_model=dict)
def get_status():
    """Return GenAI assistant configuration and active tools status."""
    return assistant_service.get_assistant_status()


@router.get("/suggested-prompts", response_model=List[str])
def get_suggested_prompts():
    """Return default suggested questions matching RouteWise design reference."""
    return [
        "Find the best route from Shanghai to Hyderabad",
        "Why was Route A recommended?",
        "What happens if there is a cyclone in the Bay of Bengal?",
        "Show me high-risk shipments this month",
    ]


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Send prompt to RouteWise GenAI Logistics Assistant.
    Executes approved backend tools and returns real data with recommendations.
    """
    history_dicts = [{"role": m.role, "content": m.content} for m in (request.conversation_history or [])]
    result = assistant_service.chat_with_assistant(
        message=request.message,
        db=db,
        conversation_history=history_dicts,
        shipment_id=request.shipment_id,
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return ChatResponse(
        reply=result.get("reply", ""),
        tool_calls=result.get("tool_calls", []),
        route_recommendation=result.get("route_recommendation"),
        provider=result.get("provider", "unknown"),
        model=result.get("model", "unknown"),
        note=result.get("note"),
    )

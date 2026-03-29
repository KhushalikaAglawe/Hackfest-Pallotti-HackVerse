"""
Guardian Eye — Alerts & VIP Target Router
Receives dynamic HSV mathematical bounds from the Frontend LLM Agent.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from app.modules.vip_tracker import vip_tracker
from app.core.state import store

router = APIRouter(prefix="/api/alerts", tags=["Emergency Alerts"])
router = APIRouter()

# ─── Pydantic Models for incoming JSON validation ───
class HSVBounds(BaseModel):
    lower: List[int]  # e.g., [0, 120, 70]
    upper: List[int]  # e.g., [10, 255, 255]

class VIPTargetPayload(BaseModel):
    top_hsv: Optional[HSVBounds] = None
    bottom_hsv: Optional[HSVBounds] = None
    reset_target: bool = False  # Set to True to cancel the search
from fastapi import APIRouter


@router.get("/critical")
async def get_critical_alerts():
    """
    Dashboard calls this every 2 seconds to show RED FLASHING ALERTS.
    Income Source: Part of the 'Safety-as-a-Service' Premium Package.
    """
    reports = store.get_latest_reports(limit=5)
    
    # Logic: Agar koi report 5 minute se purani nahi hai, toh priority 'IMMEDIATE'
    formatted_alerts = []
    for r in reports:
        formatted_alerts.append({
            "id": r["report_id"],
            "title": f"🚨 CITIZEN SOS: {r['reporter']}",
            "msg": r["description"],
            "coords": r["location"],
            "color": "RED",
            "action": "DISPATCH_DRONE"
        })
        
    return {"alerts": formatted_alerts}

@router.post("/vip_target")
async def set_vip_target(payload: VIPTargetPayload):
    """
    Frontend hits this endpoint with the parsed LLM HSV bounds.
    """
    if payload.reset_target:
        vip_tracker.set_dynamic_target(None, None)
        return {"status": "VIP search aborted. Returning to standard triage."}

    # Convert Pydantic models to standard Python dicts for the tracker
    top = payload.top_hsv.dict() if payload.top_hsv else None
    bottom = payload.bottom_hsv.dict() if payload.bottom_hsv else None

    # Inject the new math into the live video pipeline instantly
    vip_tracker.set_dynamic_target(top_hsv=top, bottom_hsv=bottom)

    return {
        "status": "VIP TARGET LOCKED. Scanning drone feed...",
        "active_parameters": {
            "top_hsv": top,
            "bottom_hsv": bottom
        }
    }
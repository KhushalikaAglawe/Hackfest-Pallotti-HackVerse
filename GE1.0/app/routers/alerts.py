"""
Guardian Eye — Alerts & VIP Target Router
Receives dynamic HSV mathematical bounds from the Frontend LLM Agent.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

from app.modules.vip_tracker import vip_tracker
from app.core.state import store
from app.core.logger import get_logger

# ✅ SINGLE router (FIXED — no overwriting)
router = APIRouter(prefix="/api/alerts", tags=["System Alerts"])
logger = get_logger(__name__)

# ── DATA MODELS ──────────────────────────────────────────────
class UserMessage(BaseModel):
    user_id: str
    username: str
    message: str
    location: str = "Unknown"

# ── IN-MEMORY QUEUE FOR POP-UPS ──────────────────────────────
active_alerts = []

# ── 1. SEND DM (USER ENDPOINT) ───────────────────────────────
@router.post("/send-dm")
async def receive_user_message(data: UserMessage):
    """
    Jab koi user mobile app ya portal se message bhejega.
    """
    new_alert = {
        "id": str(uuid.uuid4()),
        "time": datetime.now().strftime("%H:%M:%S"),
        "user": data.username,
        "content": data.message,
        "loc": data.location,
        "type": "USER_DM",
        "read": False
    }

    active_alerts.append(new_alert)

    # Add to mission timeline
    store.mission_timeline.append({
        "time": new_alert["time"],
        "event": f"DM from {data.username}: {data.message[:20]}..."
    })

    logger.info(f"New DM Received from {data.username}")
    return {"status": "sent", "alert_id": new_alert["id"]}


# ── OPTIONAL DB HOOK ─────────────────────────────────────────
def save_to_mission_db(user, msg, loc, reply=None):
    # Placeholder for DB integration
    pass


# ── 2. SYSTEM POP-UP FETCH ───────────────────────────────────
@router.get("/popups")
async def get_pending_popups():
    """
    Frontend dashboard polling endpoint.
    """
    unread = [a for a in active_alerts if not a["read"]]

    # Mark all as read
    for a in active_alerts:
        a["read"] = True

    return {"count": len(unread), "alerts": unread}


# ── 3. CLEAR ALL ALERTS ──────────────────────────────────────
@router.delete("/clear")
async def clear_alerts():
    active_alerts.clear()
    return {"message": "All alerts cleared"}


# ── HSV MODELS ───────────────────────────────────────────────
class HSVBounds(BaseModel):
    lower: List[int]  # e.g., [0, 120, 70]
    upper: List[int]  # e.g., [10, 255, 255]


class VIPTargetPayload(BaseModel):
    top_hsv: Optional[HSVBounds] = None
    bottom_hsv: Optional[HSVBounds] = None
    reset_target: bool = False


# ── 4. CRITICAL ALERTS ───────────────────────────────────────
@router.get("/critical")
async def get_critical_alerts():
    """
    Dashboard RED alerts (high priority).
    """
    reports = store.get_latest_reports(limit=5)

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


# ── 5. VIP TARGET CONTROL ────────────────────────────────────
@router.post("/vip_target")
async def set_vip_target(payload: VIPTargetPayload):
    """
    Inject HSV tracking bounds into live pipeline.
    """

    if payload.reset_target:
        vip_tracker.set_dynamic_target(None, None)
        return {"status": "VIP search aborted. Returning to standard triage."}

    # Convert to dict
    top = payload.top_hsv.dict() if payload.top_hsv else None
    bottom = payload.bottom_hsv.dict() if payload.bottom_hsv else None

    # Apply to tracker
    vip_tracker.set_dynamic_target(top_hsv=top, bottom_hsv=bottom)

    return {
        "status": "VIP TARGET LOCKED. Scanning drone feed...",
        "active_parameters": {
            "top_hsv": top,
            "bottom_hsv": bottom
        }
    }
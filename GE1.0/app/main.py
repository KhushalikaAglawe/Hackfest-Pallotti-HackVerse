"""
GUARDIAN EYE — AI Missing Person Detection Backend
IAF / Indian Army SAR Operations
"""

import os
import uvicorn
import numpy as np
import sqlite3
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

# ─────────────────────────────────────────
# 📦 CORE & ROUTER IMPORTS
# ─────────────────────────────────────────
from app.core.config import settings
from app.core.logger import get_logger
from app.routers import (
    analysis,
    stream,
    detections,
    alerts,
    health,
    history
)
from app.modules.detection import detector

logger = get_logger(__name__)

# 🚀 APP INIT
app = FastAPI(
    title="Guardian Eye — SAR Backend",
    description="AI-powered SAR Operations for IAF & Indian Army",
    version="1.0.0"
)

# 🌐 CORS CONFIG
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 📂 DIRECTORY SETUP
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Dynamic DB Path: Works on any Mac/PC
DB_PATH = os.path.join(BASE_DIR, "db", "missions.db")

# Ensure output directory exists for annotated videos
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)

# 📂 MOUNT STATIC FILES
app.mount("/outputs", StaticFiles(directory=settings.OUTPUT_DIR), name="outputs")

# 📡 ROUTER REGISTRATION
# Note: Humne prefixes ko clean rakha hai taaki frontend easily call kar sake
app.include_router(health.router, prefix="/api/health", tags=["System"])
app.include_router(analysis.router, prefix="/api/analyze", tags=["Analysis"])
app.include_router(stream.router, prefix="/api/stream", tags=["Live Stream"])
app.include_router(detections.router, prefix="/api/detections", tags=["Detections"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(history.router, prefix="/api/history", tags=["History"])

# ─────────────────────────────────────────
# 🖥️ ROOT / DASHBOARD ENDPOINT
# ─────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def serve_command_deck():
    # test_deck.html should be in the root folder (GE1.0/)
    html_path = os.path.join(BASE_DIR, "..", "test_deck.html")
    try:
        if os.path.exists(html_path):
            with open(html_path, "r", encoding="utf-8") as f:
                return HTMLResponse(content=f.read())
        return HTMLResponse("<h1>Guardian Eye Online</h1><p>Visit <a href='/docs'>/docs</a> for API</p>")
    except Exception:
        return HTMLResponse("<h1>System Online</h1>", status_code=200)

# ─────────────────────────────────────────
# 💾 DATABASE UTILITY
# ─────────────────────────────────────────
def save_detection_to_db(posture, score, sector="Nagpur-Main"):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            "INSERT INTO telemetry (timestamp, posture, score, sector) VALUES (?, ?, ?, ?)",
            (timestamp, posture, score, sector)
        )
        conn.commit()
        conn.close()
        print(f"✅ LIVE DATA SAVED: {posture}")
    except Exception as e:
        print(f"❌ DB ERROR: {e}")

# ─────────────────────────────────────────
# ⚡ STARTUP EVENT (AI ARMING)
# ─────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 [STARTUP] ARMING GUARDIAN EYE SYSTEM...")
    try:
        detector._load_model()
        # Warm-up inference for zero-lag start
        dummy_frame = np.zeros((640, 640, 3), dtype=np.uint8)
        detector.detect(dummy_frame)
        logger.info("✅ AI ENGINE READY")
    except Exception as e:
        logger.error(f"❌ AI ENGINE ERROR: {e}")
    logger.info("📡 SYSTEM FULLY OPERATIONAL")

# 🚀 RUN SERVER
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
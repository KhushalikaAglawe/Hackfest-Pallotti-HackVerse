"""
GUARDIAN EYE — AI Missing Person Detection Backend
IAF / Indian Army SAR Operations
"""

import os
import uvicorn
import numpy as np
import sqlite3
from datetime import datetime

from fastapi import FastAPI, WebSocket
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
    history,
    sos
)
from app.modules.detection import detector

logger = get_logger(__name__)

# 🚀 APP INIT
app = FastAPI(
    title="Guardian Eye — SAR Backend",
    description="AI-powered SAR Operations for IAF & Indian Army",
    version="1.0.0"
)

# 🚀 STEP 1: OPEN THE GATES (Must be BEFORE include_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🚀 STEP 2: INCLUDE ROUTERS
app.include_router(stream.router, prefix="/api/stream", tags=["stream"])
app.include_router(health.router, prefix="/api/health", tags=["System"])
app.include_router(analysis.router, prefix="/api/analyze", tags=["Analysis"])
app.include_router(detections.router, prefix="/api/detections", tags=["Detections"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(history.router, prefix="/api/history", tags=["History"])
app.include_router(sos.router, prefix="/api/sos", tags=["SOS"])

# 📂 DIRECTORY SETUP
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "db", "missions.db")

# Ensure output directory exists for annotated videos
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)

# 📂 MOUNT STATIC FILES
app.mount("/outputs", StaticFiles(directory=settings.OUTPUT_DIR), name="outputs")

# ─────────────────────────────────────────
# 🖥️ ROOT / DASHBOARD ENDPOINT
# ─────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def serve_command_deck():
    return HTMLResponse("""
        <body style='background:#000; color:#00ff9c; font-family:monospace; text-align:center; padding-top:100px; border: 2px solid #00ff9c; margin: 30px; height: 80vh;'>
            <h1 style='text-shadow: 0 0 10px #00ff9c;'>🛡️ GUARDIAN EYE API — ONLINE</h1>
            <p style='color: #888;'>The Backend is running correctly on Port 8000.</p>
            <div style='margin-top: 50px; padding: 20px; border: 1px solid #333; display: inline-block;'>
                <p>To view the Tactical Dashboard, go to your React URL:</p>
                <a href='http://localhost:5173' style='color:#000; background:#00ff9c; padding:10px 20px; text-decoration:none; font-weight:bold;'>OPEN FRONTEND (5173)</a>
            </div>
            <p style='margin-top: 20px;'>API Documentation: <a href='/docs' style='color:#00ccff;'>/docs</a></p>
        </body>
    """)

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

# ==========================================
# 🛑 HACKATHON QUICK-FIX ROUTES (Stops 404 Spam)
# ==========================================

@app.get("/api/alerts/popups")
async def get_popups():
    # Returns empty alerts so the frontend stops throwing errors
    return {"alerts": []} 

@app.get("/api/history/count")
async def get_history_count():
    return {"count": 0}


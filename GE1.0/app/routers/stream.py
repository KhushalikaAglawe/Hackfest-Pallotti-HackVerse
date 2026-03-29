"""
Guardian Eye — Live Stream Router (MULTI-RATE EDGE OPTIMIZED)
"""

import cv2
import asyncio
import json
import os
import shutil
import threading
import time
import numpy as np
import requests
import base64
import re
import datetime
import torch

device = "cuda" if torch.cuda.is_available() else "cpu"
from typing import AsyncGenerator
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.encoders import jsonable_encoder

from app.core.state import store
from app.modules.pipeline import process_frame
from app.core.config import settings
from app.core.logger import get_logger
from app.modules.vip_tracker import vip_tracker
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/alerts", tags=["System Alerts"])
router = APIRouter()
logger = get_logger(__name__)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

_latest_raw_frame = None
_latest_annotated = None
_last_thermal = None
_last_depth = None
_cap = None
_is_ai_running = False
_ai_thread = None

all_messages = {} # { msg_id: {data} }
active_popups = [] # Queue for frontend toast notifications

# ── DATA MODELS ──────────────────────────────────────────────
class UserMessage(BaseModel):
    username: str
    message: str
    location: str = "Unknown"

class AdminReply(BaseModel):
    message_id: str
    reply_text: str

# ── 1. RECEIVE DM (From User to System) ──────────────────────
@router.post("/send-dm")
async def receive_user_message(data: UserMessage):
    msg_id = str(uuid.uuid4())
    new_msg = {
        "id": msg_id,
        "time": datetime.now().strftime("%H:%M:%S"),
        "user": data.username,
        "content": data.message,
        "loc": data.location,
        "reply": None, # Starting mein reply khali rahega
        "read": False
    }
    all_messages[msg_id] = new_msg
    active_popups.append(new_msg)
    return {"status": "received", "id": msg_id}

# ── 2. SEND REPLY (From System to User) ──────────────────────
@router.post("/reply")
async def send_reply(data: AdminReply):
    if data.message_id not in all_messages:
        raise HTTPException(status_code=404, detail="Original message not found")
    
    # Update the message with your reply
    all_messages[data.message_id]["reply"] = data.reply_text
    return {"status": "reply_sent", "content": data.reply_text}

# ── 3. POPUP FETCH (Dashboard updates) ───────────────────────
@router.get("/popups")
async def get_popups():
    unread = [m for m in active_popups if not m["read"]]
    for m in active_popups: m["read"] = True
    return {"alerts": unread}

# ─────────────────────────────────────────
# WEBSOCKET MANAGER
# ─────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # 🚀 FORCE ACCEPT (This bypasses the 403 check)
    await websocket.accept(subprotocol=None) 
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ─────────────────────────────────────────
# BACKGROUND AI WORKER
# ─────────────────────────────────────────
def _frame_to_jpeg(frame: np.ndarray) -> bytes:
    _, encoded = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
    return encoded.tobytes()

def _ai_processing_loop(loop):
    global _latest_raw_frame, _is_ai_running
    global _latest_annotated, _last_thermal, _last_depth, _cap, _last_env

    _last_env = {}
    frame_idx = 0
    logger.info("Background AI Engine Started")

    while _is_ai_running:
        if _cap is not None and _cap.isOpened():
            ret, frame = _cap.read()
            if not ret:
                time.sleep(0.01)
                continue

            frame = cv2.resize(frame, (640, 480))
            _latest_raw_frame = frame

            try:
                result = process_frame(
                    frame=frame.copy(),
                    frame_index=frame_idx,
                    run_depth=True,
                    job_id="live_stream"
                )

                if result:
                    if getattr(result, 'annotated_frame', None) is not None:
                        _latest_annotated = result.annotated_frame
                    if getattr(result, 'thermal_frame', None) is not None:
                        _last_thermal = result.thermal_frame
                    if getattr(result, 'depth_frame', None) is not None:
                        _last_depth = result.depth_frame
                    if getattr(result, 'environment', {}):
                        _last_env = result.environment

                frame_idx += 1

                # 🚀 AUTONOMOUS TRIAGE ENGINE & GHOST BUSTER
                current_time = time.time()
                active_persons = []
                vip_is_visible = False
                
                for p in store.persons.values():
                    if (current_time - getattr(p, 'last_seen_epoch', 0)) < 2.0:
                        p_data = p.__dict__.copy()
                        
                        p_data["rel_x"] = (p.x - 320) / 320
                        p_data["rel_y"] = (240 - p.y) / 240
                        
                        # Calculate Triage Score
                        triage_score = 10 
                        if "INJURED" in p.status or "LYING DOWN" in p.status:
                            triage_score += 50
                        if "VIP" in p.status:
                            triage_score += 100
                            vip_is_visible = True
                            
                        if _last_env.get('safety_level') in ["CAUTION", "EMERGENCY"]:
                            triage_score += 20
                            
                        p_data["triage_score"] = triage_score
                        p_data["priority_score"] = triage_score
                        
                        vid = getattr(p, 'id', getattr(p, 'person_id', '0'))
                        p_data["id"] = vid
                        p_data["gps_string"] = f"30.3165° N, 78.{str(vid).split('-')[-1].zfill(4)}° E"
                        
                        active_persons.append(p_data)
                
                # Sort so the highest score is at the top!
                active_persons.sort(key=lambda x: x.get("triage_score", 0), reverse=True)

                # 🚀 THE DECISION INTELLIGENCE ENGINE
                system_recommendation = "STANDBY: AERIAL SCAN IN PROGRESS..."
                
                if active_persons:
                    # The list is already sorted, so [0] is the most critical person!
                    top_victim = active_persons[0] 
                    
                    if top_victim.get("priority_score", 0) >= 100: # VIP or Severely Injured
                        system_recommendation = f"🚨 URGENT: DEPLOY MEDEVAC TO {top_victim['id']} | STATUS: CRITICAL | LOC: {top_victim.get('gps_string', 'LZ-004')}"
                    elif top_victim.get("priority_score", 0) >= 50: # Injured / Slumped
                        system_recommendation = f"⚠️ CAUTION: INJURED PERSON {top_victim['id']} DETECTED. PREPARE GROUND TEAM."
                    else: # Just standing / safe
                        system_recommendation = f"✅ TARGET {top_victim['id']} STABLE. CONTINUE SECTOR SWEEP."

                payload = {
                    "persons": active_persons,
                    "environment": _last_env,
                    "timeline": getattr(store, 'mission_timeline', []),
                    "vip_active": vip_is_visible,
                    "system_recommendation": system_recommendation
                }

                try:
                    safe_payload = jsonable_encoder(payload)
                    ws_msg = json.dumps(safe_payload)
                    asyncio.run_coroutine_threadsafe(manager.broadcast(ws_msg), loop)
                except Exception:
                    pass

            except Exception as e:
                logger.error(f"AI Loop Error: {e}")

        time.sleep(0.01)

def _start_ai_thread():
    global _is_ai_running, _ai_thread
    if not _is_ai_running:
        _is_ai_running = True
        loop = asyncio.get_event_loop()
        _ai_thread = threading.Thread(target=_ai_processing_loop, args=(loop,), daemon=True)
        _ai_thread.start()

def _open_camera():
    global _cap
    source = settings.VIDEO_SOURCE
    src = int(source) if str(source).isdigit() else source
    _cap = cv2.VideoCapture(src)
    _start_ai_thread()
    return _cap

async def _webcam_generator():
    global _latest_annotated, _latest_raw_frame, _is_ai_running, _cap
    if _cap is None or not _cap.isOpened():
        _open_camera()
    while _is_ai_running:
        display_frame = _latest_annotated if _latest_annotated is not None else _latest_raw_frame
        if display_frame is None:
            display_frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(display_frame, "INITIALIZING AI OPTICS...", (140, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + _frame_to_jpeg(display_frame) + b"\r\n")
        await asyncio.sleep(0.03)

@router.get("/webcam")
async def webcam_stream():
    return StreamingResponse(_webcam_generator(), media_type="multipart/x-mixed-replace; boundary=frame")

@router.get("/thermal")
async def video_feed_thermal():
    async def generate():
        while _is_ai_running:
            if _last_thermal is not None:
                ret, buffer = cv2.imencode('.jpg', _last_thermal)
                if ret: yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            await asyncio.sleep(0.05)
    return StreamingResponse(generate(), media_type="multipart/x-mixed-replace; boundary=frame")

@router.get("/depth")
async def video_feed_depth():
    async def generate():
        while _is_ai_running:
            if _last_depth is not None:
                ret, buffer = cv2.imencode('.jpg', _last_depth)
                if ret: yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            await asyncio.sleep(0.05)
    return StreamingResponse(generate(), media_type="multipart/x-mixed-replace; boundary=frame")

@router.post("/upload_video")
async def upload_video(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
    global _cap, _latest_annotated
    if _cap is not None: _cap.release(); _cap = None
    _latest_annotated = None
    settings.VIDEO_SOURCE = file_path
    return {"status": "success", "message": f"Video '{file.filename}' loaded"}

@router.post("/source")
async def update_video_source(source: str = Form(...)):
    global _cap, _latest_annotated
    src = int(source) if str(source).isdigit() else source
    if _cap is not None: _cap.release(); _cap = None
    _latest_annotated = None
    settings.VIDEO_SOURCE = src
    return {"status": "success", "source": str(src)}

# ─────────────────────────────────────────
# 🧠 DUAL-AGENT AI ARCHITECTURE
# ─────────────────────────────────────────
OLLAMA_URL = "http://localhost:11434/api/generate"

@router.post("/vlm/hazard")
async def vlm_scan_hazard():
    global _latest_raw_frame
    if _latest_raw_frame is None: return {"response": "No camera feed available."}
    _, buffer = cv2.imencode('.jpg', _latest_raw_frame)
    img_b64 = base64.b64encode(buffer).decode('utf-8')
    prompt = "Describe the disaster environment in this image. Are there any immediate hazards like fire, smoke, rubble, or structural damage? Keep it tactical and brief."
    try:
        payload = {"model": "moondream", "prompt": prompt, "images": [img_b64], "stream": False}
        response = requests.post(OLLAMA_URL, json=payload, timeout=60)
        return {"response": response.json().get("response", "Error: No response")}
    except Exception as e: return {"response": f"VLM Offline Error: {str(e)}"}

@router.post("/vlm/triage")
async def vlm_triage(person_id: str = Form(...)):
    global _latest_raw_frame
    if _latest_raw_frame is None: return {"response": "No camera feed."}
    _, buffer = cv2.imencode('.jpg', _latest_raw_frame)
    img_b64 = base64.b64encode(buffer).decode('utf-8')
    prompt = "Look at the person in this image. Do they appear injured, trapped, or unconscious? Describe their physical condition for a medical triage report."
    try:
        payload = {"model": "moondream", "prompt": prompt, "images": [img_b64], "stream": False}
        response = requests.post(OLLAMA_URL, json=payload, timeout=60)
        return {"response": response.json().get("response", "Error: No response")}
    except Exception as e: return {"response": f"VLM Offline Error: {str(e)}"}

@router.post("/vlm/vip")
async def vlm_set_vip(top_color: str = Form(...), bottom_color: str = Form(...)):
    def get_hsv_bounds(color_text: str):
        color_text = color_text.lower().strip()
        if not color_text or color_text == "none": return None
        base_dict = {
            "red": {"lower": [0, 40, 40], "upper": [20, 255, 255]},
            "green": {"lower": [35, 40, 40], "upper": [85, 255, 255]},
            "blue": {"lower": [90, 40, 40], "upper": [130, 255, 255]},
            "black": {"lower": [0, 0, 0], "upper": [180, 255, 90]},
            "white": {"lower": [0, 0, 180], "upper": [180, 40, 255]},
            "yellow": {"lower": [15, 40, 40], "upper": [35, 255, 255]},
            "purple": {"lower": [125, 40, 40], "upper": [160, 255, 255]}
        }
        if color_text in base_dict: return base_dict[color_text]

        prompt = f"""You are a JSON routing API. Map '{color_text}' to the closest base color.
- red/crimson/maroon: {{"lower": [0, 40, 40], "upper": [20, 255, 255]}}
- green/olive: {{"lower": [35, 40, 40], "upper": [85, 255, 255]}}
- blue/navy/teal: {{"lower": [90, 40, 40], "upper": [130, 255, 255]}}
- black/dark/grey: {{"lower": [0, 0, 0], "upper": [180, 255, 90]}}
- white/light: {{"lower": [0, 0, 180], "upper": [180, 40, 255]}}
- yellow/gold: {{"lower": [15, 40, 40], "upper": [35, 255, 255]}}
- purple/violet: {{"lower": [125, 40, 40], "upper": [160, 255, 255]}}
- INVALID/RAINBOW: {{"lower": [0,0,0], "upper": [0,0,0]}}
Output exactly ONE raw JSON dictionary. No talking."""

        try:
            payload = {"model": "llama3.2:1b", "prompt": prompt, "stream": False}
            res = requests.post(OLLAMA_URL, json=payload, timeout=10)
            match = re.search(r'\{.*\}', res.json().get("response", ""), re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
                if parsed.get("upper") == [0,0,0]: return None 
                if "lower" in parsed and "upper" in parsed: return parsed
        except Exception: pass
        return None

    top_hsv = get_hsv_bounds(top_color)
    bottom_hsv = get_hsv_bounds(bottom_color)
    vip_tracker.set_dynamic_target(top_hsv, bottom_hsv)
    return {"status": f"Agentic Target Locked!\nTop Math: {top_hsv}\nBottom Math: {bottom_hsv}"}

# ─────────────────────────────────────────
# 🚀 SMART YOLO-GUIDED K-MEANS VIP LOCK
# ─────────────────────────────────────────
@router.post("/vlm/kmeans_lock")
async def kmeans_lock():
    global _latest_raw_frame
    if _latest_raw_frame is None: 
        return {"status": "Error: No camera feed available."}

    # 1. Ask the AI (YOLO) if there are any humans on screen right now
    if not store.persons:
        return {"status": "Error: No humans detected to lock onto!"}

    # 2. Find the person closest to the center of the screen
    h, w, _ = _latest_raw_frame.shape
    screen_center_x, screen_center_y = w / 2, h / 2

    best_person = None
    min_dist = float('inf')

    for person_id, p in store.persons.items():
        # Check if they have been seen in the last 2 seconds
        import time
        if time.time() - p.last_seen_epoch > 2.0:
            continue
            
        dist = (p.x - screen_center_x)**2 + (p.y - screen_center_y)**2
        if dist < min_dist:
            min_dist = dist
            best_person = p

    if best_person is None or not hasattr(best_person, 'bbox'):
        return {"status": "Error: Could not isolate a target."}

    # 3. Get their exact YOLO Bounding Box!
    x1, y1, x2, y2 = map(int, best_person.bbox)

    # 4. Crop the frame to JUST their torso
    box_h = y2 - y1
    box_w = x2 - x1
    
    # 🚀 Move the crop further down (40% down) to completely avoid the neck/face!
    crop_y1 = max(0, int(y1 + box_h * 0.4)) 
    crop_y2 = min(h, int(y2 - box_h * 0.2)) 
    # 🚀 Changed from 0.40 back to 0.25 so it sees your shoulders, not just the dot!
    crop_x1 = max(0, int(x1 + box_w * 0.25))
    crop_x2 = min(w, int(x2 - box_w * 0.25))

    torso_crop = _latest_raw_frame[crop_y1:crop_y2, crop_x1:crop_x2]

    # 5. Run the K-Means Math
    def get_dominant_hsv(image_crop, k=3):
        if image_crop is None or image_crop.size == 0: return None
        hsv = cv2.cvtColor(image_crop, cv2.COLOR_BGR2HSV)
        pixels = np.float32(hsv.reshape((-1, 3)))
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
        _, labels, centers = cv2.kmeans(pixels, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
        dominant = centers[np.argmax(np.bincount(labels.flatten()))]
        hue, sat, val = dominant
        
        # 🚀 Expanded Hue tolerance to +/- 20 for low-light webcams
        lower = [max(0, int(hue - 20)), 15, 15]
        upper = [min(179, int(hue + 20)), 255, 255]
        return {"lower": lower, "upper": upper}

    shirt_math = get_dominant_hsv(torso_crop)

    if shirt_math is None:
        return {"status": "Error: Math extraction failed on bounding box."}

    # Apply the lock
    vip_tracker.set_dynamic_target(top_hsv=shirt_math, bottom_hsv=shirt_math)

    return {"status": f"Target Acquired via YOLO!\nUnified Target Math: {shirt_math}"}

@router.get("/download_report")
async def download_report():
    global _last_env

    # ── 1. FETCH DB DATA ─────────────────────────────
    try:
        conn = sqlite3.connect('mission_data.db')
        cursor = conn.cursor()
        cursor.execute("""
            SELECT username, location, message, admin_reply, timestamp 
            FROM messages
            ORDER BY timestamp DESC
        """)
        messages_data = cursor.fetchall()
        conn.close()
    except Exception:
        messages_data = []

    # ── 2. BUILD CHAT TABLE ROWS ─────────────────────
    chat_rows = "".join([
        f"<tr><td>{m[4]}</td><td>{m[0]} ({m[1]})</td><td>{m[2]}</td><td>{m[3] if m[3] else 'PENDING'}</td></tr>"
        for m in messages_data
    ])

    # ── 3. EXISTING DATA ─────────────────────────────
    victims_rows = "".join([
        f"<tr><td>{p.person_id}</td><td>{p.status}</td><td>{p.gps_lat}, {p.gps_lon}</td><td>{p.confidence:.2f}</td></tr>" 
        for p in store.persons.values()
    ])

    timeline_rows = "".join([
        f"<tr><td>{log.get('time', 'N/A')}</td><td>{log.get('event', 'N/A')}</td></tr>" 
        for log in store.mission_timeline
    ])

    env_status = _last_env.get('safety_level', 'STABLE') if isinstance(_last_env, dict) else 'UNKNOWN'
    mission_id = f"GE-{int(time.time())}"
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # ── 4. FINAL HTML (WITH PAGE BREAK) ──────────────
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: sans-serif; padding: 20px; color: #333; }}
            h2 {{ border-bottom: 2px solid #333; padding-bottom: 10px; }}
            .meta {{ margin-bottom: 20px; font-size: 14px; line-height: 1.6; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 30px; }}
            th, td {{ border: 1px solid #999; padding: 8px; text-align: left; font-size: 13px; }}
            th {{ background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; }}
            .footer {{ margin-top: 40px; font-size: 12px; color: #666; text-align: center; }}
            
            /* PAGE BREAK */
            .page-break {{ page-break-before: always; }}
        </style>
    </head>
    <body>

        <!-- ───── PAGE 1 ───── -->
        <h2>GUARDIAN EYE: MISSION TACTICAL REPORT</h2>
        
        <div class="meta">
            <strong>MISSION ID:</strong> {mission_id}<br>
            <strong>DATE:</strong> {timestamp} HRS<br>
            <strong>LOCATION:</strong> NAGPUR SECTOR<br>
            <strong>ENVIRONMENT STATUS:</strong> {env_status}
        </div>

        <strong>[SECTION 01] TARGET DATA</strong>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>STATUS</th>
                    <th>COORDINATES</th>
                    <th>CONFIDENCE</th>
                </tr>
            </thead>
            <tbody>
                {victims_rows if victims_rows else "<tr><td colspan='4'>No data recorded</td></tr>"}
            </tbody>
        </table>

        <strong>[SECTION 02] EVENT LOGS</strong>
        <table>
            <thead>
                <tr>
                    <th>TIME</th>
                    <th>EVENT DESCRIPTION</th>
                </tr>
            </thead>
            <tbody>
                {timeline_rows if timeline_rows else "<tr><td colspan='2'>No logs available</td></tr>"}
            </tbody>
        </table>

        <div class="footer">
            GENERATED BY GUARDIAN EYE EDGE SYSTEM | OFFICIAL USE ONLY
        </div>

        <!-- ───── PAGE BREAK ───── -->
        <div class="page-break"></div>

        <!-- ───── PAGE 2 ───── -->
        <h2>FIELD COMMUNICATION LOGS</h2>

        <table>
            <thead>
                <tr>
                    <th style="width: 20%;">TIME</th>
                    <th>USER (LOCATION)</th>
                    <th>MESSAGE RECEIVED</th>
                    <th>ACTION TAKEN (REPLY)</th>
                </tr>
            </thead>
            <tbody>
                {chat_rows if chat_rows else "<tr><td colspan='4'>No field messages recorded</td></tr>"}
            </tbody>
        </table>

    </body>
    </html>
    """

    return HTMLResponse(content=html_content)

@router.post("/api/action/rescue/{person_id}")
async def mark_rescued(person_id: str):
    """
    Called by the Frontend when the Commander clicks 'Mark Rescued'.
    Removes the victim from the live radar.
    """
    from app.core.state import store
    
    if person_id in store.persons:
        # In the future, Kushalika's DB script will catch this and log it to SQLite!
        del store.persons[person_id]
        return {"status": "success", "message": f"{person_id} marked as rescued and cleared from radar."}
    
    return {"status": "error", "message": "Person ID not found."}
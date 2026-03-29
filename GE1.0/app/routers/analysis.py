"""
Guardian Eye — Analysis Router

POST /api/analyze/video  — Upload a video, run full pipeline, get results + annotated output
POST /api/analyze/frame  — Upload a single image frame, run full pipeline
GET  /api/analyze/jobs   — List processed job results

GET  /api/analyze/hazard — (NEW) VLM Hazard Scanner
GET  /api/analyze/triage — (NEW) VLM Medevac Triage
"""


import cv2
import uuid
import os
import json
import numpy as np
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException
import app.routers.stream as stream_router

from app.modules.pipeline import process_frame, FrameResult
from app.core.config import settings
from app.core.state import store
from app.core.logger import get_logger
from app.db.queries import get_mission_stats, fetch_recent_logs, clear_db
from fastapi import APIRouter
from app.db.queries import get_mission_stats, fetch_history, clear_db

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])

logger = get_logger(__name__)

_jobs: dict = {}

# ─────────────────────────────
# 📊 SUMMARY & LOGS
# ─────────────────────────────


@router.get("/summary")
async def mission_summary():
    return {"status": "success", "data": get_mission_stats()}

# Phir niche logs wale function mein bhi change kar dena:
@router.get("/logs")
async def mission_logs(limit: int = 20):
    logs = fetch_history(limit)  # Pehle yahan fetch_recent_logs tha
    return {"status": "success", "history": logs}

@router.post("/reset")
async def reset_mission():
    clear_db()
    return {"message": "Mission data reset successfully"}


# ─────────────────────────────
# 🎥 VIDEO ANALYSIS
# ─────────────────────────────
@router.post("/video")
async def analyze_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    run_depth: bool = Form(True),
    sample_every_n: int = Form(10),
):
    job_id = str(uuid.uuid4())[:8]

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.OUTPUT_DIR, exist_ok=True)

    ext = os.path.splitext(file.filename)[1] or ".mp4"
    upload_path = os.path.join(settings.UPLOAD_DIR, f"{job_id}{ext}")

    with open(upload_path, "wb") as f:
        f.write(await file.read())

    _jobs[job_id] = {"status": "queued", "progress": 0, "results": []}

    background_tasks.add_task(
        _process_video_job, job_id, upload_path, run_depth, sample_every_n
    )

    return {
        "job_id": job_id,
        "status": "queued",
        "message": f"Processing started. Poll /api/analysis/jobs/{job_id} for results.",
        "file": file.filename,
    }


def _process_video_job(job_id: str, video_path: str, run_depth: bool, sample_every: int):
    _jobs[job_id]["status"] = "processing"

    # isolate job data
    store.reset()

    results = []

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        _jobs[job_id]["status"] = "error"
        _jobs[job_id]["error"] = "Cannot open video file."
        return

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
    fps = cap.get(cv2.CAP_PROP_FPS) or 25

    frame_idx = 0
    processed = 0

    out_path = os.path.join(settings.OUTPUT_DIR, f"{job_id}_annotated.mp4")
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = None

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_every == 0:
                result = process_frame(
                    frame=frame,
                    frame_index=frame_idx,
                    total_frames=total,
                    job_id=job_id,
                    run_depth=run_depth,
                    save_frames=False,
                )

                if writer is None:
                    h, w = frame.shape[:2]
                    writer = cv2.VideoWriter(out_path, fourcc, fps / sample_every, (w, h))

                # ✅ Optimized (no duplicate processing)
                try:
                    if result.annotated_frame is not None:
                        writer.write(result.annotated_frame)
                    else:
                        writer.write(frame)
                except Exception as e:
                    logger.warning(f"Frame write failed: {e}")
                    writer.write(frame)

                results.append({
                    "frame_index": result.frame_index,
                    "timestamp": result.timestamp,
                    "person_count": result.person_count,
                    "persons": result.persons,
                    "landing_zones": result.landing_zones,
                    "environment": result.environment,
                    "alerts_fired": result.alerts_fired,
                    "gps_lat": result.gps_lat,
                    "gps_lon": result.gps_lon,
                })

                processed += 1

            frame_idx += 1
            _jobs[job_id]["progress"] = round(frame_idx / total * 100, 1)

    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}")
        _jobs[job_id]["status"] = "error"
        _jobs[job_id]["error"] = str(e)

    finally:
        cap.release()
        if writer:
            writer.release()

    _jobs[job_id]["status"] = "done"
    _jobs[job_id]["results"] = results
    _jobs[job_id]["frames_processed"] = processed
    _jobs[job_id]["output_video"] = f"/outputs/{job_id}_annotated.mp4"
    _jobs[job_id]["summary"] = _build_summary(results)


# ─────────────────────────────
# 📊 SUMMARY BUILDER
# ─────────────────────────────
def _build_summary(results: list) -> dict:
    all_persons = list(store.persons.values())
    safe_lzs = [lz for lz in store.landing_zones if lz.safe]

    return {
        "total_persons_detected": len(all_persons),
        "total_frames_analyzed": len(results),
        "safe_landing_zones": len(safe_lzs),
        "total_alerts": len(store.alerts),
        "persons": [
            {
                "person_id": p.person_id,
                "confidence": p.confidence,
                "frame_count": p.frame_count,
                "gps_lat": p.gps_lat,
                "gps_lon": p.gps_lon,
                "thermal_score": p.thermal_score,
                "status": p.status,
                "first_seen": p.first_seen,
                "last_seen": p.last_seen,
            }
            for p in all_persons
        ],
    }


# ─────────────────────────────
# 📦 JOB APIs
# ─────────────────────────────
@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/jobs")
def list_jobs():
    return [
        {"job_id": jid, "status": j["status"], "progress": j.get("progress", 0)}
        for jid, j in _jobs.items()
    ]


# ─────────────────────────────
# 🖼 FRAME ANALYSIS
# ─────────────────────────────
@router.post("/frame")
async def analyze_frame(
    file: UploadFile = File(...),
    run_depth: bool = Form(True),
):
    img_bytes = await file.read()
    nparr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        raise HTTPException(status_code=400, detail="Cannot decode image.")

    result = process_frame(frame, run_depth=run_depth, save_frames=True, job_id="frame_api")

    return {
        "frame_index": result.frame_index,
        "timestamp": result.timestamp,
        "person_count": result.person_count,
        "persons": result.persons,
        "landing_zones": result.landing_zones,
        "environment": result.environment,
        "alerts_fired": result.alerts_fired,
        "gps_lat": result.gps_lat,
        "gps_lon": result.gps_lon,
        "outputs": {
            "annotated_available": result.annotated_frame is not None,
            "thermal_available": result.thermal_frame is not None,
            "depth_available": result.depth_frame is not None,
        },
    }


# ─────────────────────────────
# 🤖 LOCAL AI (UNCHANGED)
# ─────────────────────────────
import base64
import urllib.request

def _call_local_ollama(prompt: str, image_bytes: bytes) -> str:
    b64_img = base64.b64encode(image_bytes).decode("utf-8")

    payload = {
        "model": "moondream",
        "prompt": prompt,
        "images": [b64_img],
        "stream": False
    }

    req = urllib.request.Request(
        "http://localhost:11434/api/generate",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    with urllib.request.urlopen(req) as response:
        res_json = json.loads(response.read())
        return res_json["response"]


@router.get("/hazard")
def get_hazard_analysis():
    if stream_router._last_annotated is None:
        raise HTTPException(status_code=400, detail="No active feed.")

    _, buffer = cv2.imencode(".jpg", stream_router._last_annotated)

    prompt = "Analyze disaster scene. List 3 hidden hazards."

    response_text = _call_local_ollama(prompt, buffer.tobytes())
    return {"status": "success", "analysis": response_text}


@router.get("/triage")
def get_triage_analysis():
    if stream_router._last_annotated is None:
        raise HTTPException(status_code=400, detail="No active feed.")

    _, buffer = cv2.imencode(".jpg", stream_router._last_annotated)

    prompt = "Analyze victim. Generate 20-word medical dispatch."

    response_text = _call_local_ollama(prompt, buffer.tobytes())
    return {"status": "success", "analysis": response_text}
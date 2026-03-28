import sqlite3
from pathlib import Path
from datetime import datetime

# Path Setup
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "app" / "db" / "mission.db"

def fetch_history(limit=50):
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM telemetry ORDER BY timestamp DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception as e:
        return []

def get_mission_stats():
    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(DISTINCT person_id) FROM telemetry")
        total = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM telemetry WHERE score >= 50")
        critical = cursor.fetchone()[0]
        conn.close()
        return {"total": total, "critical": critical}
    except Exception as e:
        return {"total": 0, "critical": 0}

def clear_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("DELETE FROM telemetry")
    conn.commit()
    conn.close()

# ✅ YE LINE ZAROORI HAI: Taki analysis.py crash na ho
fetch_recent_logs = fetch_history
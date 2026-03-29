import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "db" / "mission.db"

def save_detection(data_list):
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    for d in data_list:
        cursor.execute('''
            INSERT INTO telemetry (person_id, posture, triage_score, priority_level, lat, lng, safety_status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (d['person_id'], d['posture'], d['priority_score'], d['priority_level'], d['lat'], d['lng'], d['safety_status']))
    conn.commit()
    conn.close()

def fetch_history(limit=50):
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM telemetry ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
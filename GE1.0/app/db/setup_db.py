import sqlite3
import os
from app.core.config import settings

def init_db():
    db_path = settings.BASE_DIR / "app" / "db" / "mission.db"
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            person_id INTEGER,
            posture TEXT,
            priority_score REAL,
            priority_level TEXT,
            lat REAL,
            lng REAL,
            safety_status TEXT
        )
    ''')
    conn.commit()
    conn.close()
    print(f"✅ Mission Database initialized at {db_path}")

if __name__ == "__main__":
    init_db()
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks
from typing import Optional
import shutil
import uuid
import requests

router = APIRouter()

# --- TACTICAL QUEUE & RESOURCE MANAGEMENT ---
sos_queue = []
ndrf_teams = {
    "TEAM-ALPHA": {"status": "AVAILABLE", "mission_id": None},
    "TEAM-BRAVO": {"status": "AVAILABLE", "mission_id": None},
    "TEAM-CHARLIE": {"status": "AVAILABLE", "mission_id": None}
}

def auto_dispatch():
    global sos_queue, ndrf_teams
    # Sort the queue so highest severity is at the top
    sos_queue = sorted(sos_queue, key=lambda x: x['severity_score'], reverse=True)
    
    for ticket in sos_queue:
        # If the ticket needs a team...
        if ticket['status'] in ["PENDING", "CRITICAL - DISPATCH REQUIRED"]:
            # Look for an available team
            for team_name, team_data in ndrf_teams.items():
                if team_data['status'] == "AVAILABLE":
                    # Lock the team and assign the mission!
                    team_data['status'] = "DEPLOYED"
                    team_data['mission_id'] = ticket['id']
                    
                    ticket['assigned_team'] = team_name
                    ticket['status'] = "EN ROUTE"
                    break # Move to the next ticket

def process_sos_ticket(ticket: dict, video_path: str):
    print(f"[SYSTEM] Analyzing SOS Video for {ticket['id']}...")
    
    # --- 1. THE AI SCORING ---
    # In a real scenario, you pass video_path to your pipeline.py
    # For now, let's simulate the logic your pipeline would return:
    # results = run_triage_on_video(video_path) 
    
    # Simulated AI output:
    injured_count = 2 # e.g., results['lying_down']
    standing_count = 1 # e.g., results['standing']
    
    # The Math: Injured people are worth 50 points, standing are worth 10.
    severity = (injured_count * 50) + (standing_count * 10)
    
    # --- 2. THE OSRM ROUTING (No API Key needed!) ---
    # Let's assume your NDRF Base is at these coordinates:
    ndrf_lat, ndrf_lon = 21.1458, 79.0882 # (Nagpur coords, adjust as needed)
    civ_lat, civ_lon = ticket['lat'], ticket['lng']
    
    # Call the free OSRM API to get the safe path
    osrm_url = f"http://router.project-osrm.org/route/v1/driving/{ndrf_lon},{ndrf_lat};{civ_lon},{civ_lat}?overview=full&geometries=geojson"
    
    try:
        response = requests.get(osrm_url).json()
        route_data = response['routes'][0]['geometry'] # This is what React Leaflet needs!
    except Exception as e:
        print("[ERROR] Routing failed:", e)
        route_data = None

    # --- 3. UPDATE THE QUEUE ---
    ticket['severity_score'] = severity
    ticket['route_geojson'] = route_data
    ticket['status'] = "CRITICAL - DISPATCH REQUIRED" if severity > 40 else "PENDING"
    ticket['assigned_team'] = None
    
    # Trigger the dispatcher to see if anyone is free!
    auto_dispatch()
    
    print(f"[SYSTEM] Mission {ticket['id']} Ready. Score: {severity}")

@router.post("/upload")
async def receive_sos(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...)
):
    # 1. Generate a unique mission ID
    mission_id = f"SOS-{uuid.uuid4().hex[:6].upper()}"
    file_path = f"temp_{mission_id}.mp4"
    
    # 2. Save the uploaded video to your local disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
        
    # 3. Create the initial queue ticket
    ticket = {
        "id": mission_id,
        "desc": description,
        "lat": latitude,
        "lng": longitude,
        "status": "ANALYZING...",
        "severity_score": 0, # AI will update this
        "route_geojson": None
    }
    sos_queue.append(ticket)

    # 4. Trigger the AI and Routing in the background so the user's app doesn't freeze
    background_tasks.add_task(process_sos_ticket, ticket, file_path)

    return {"message": "SOS Received. AI analyzing situation.", "mission_id": mission_id}

@router.post("/complete/{mission_id}")
async def complete_mission(mission_id: str):
    global sos_queue, ndrf_teams
    
    for ticket in sos_queue:
        if ticket['id'] == mission_id:
            ticket['status'] = "COMPLETED"
            
            # Free up the team so they can take the next mission
            team_name = ticket.get('assigned_team')
            if team_name and team_name in ndrf_teams:
                ndrf_teams[team_name]['status'] = "AVAILABLE"
                ndrf_teams[team_name]['mission_id'] = None
                
            # Run dispatcher again to assign newly freed team to pending missions
            auto_dispatch()
            
            # Here is where you would trigger your mission report generation!
            return {"message": f"{mission_id} Completed. {team_name} returning to base.", "report_url": f"/api/reports/download/{mission_id}"}
            
    return {"error": "Mission not found"}

@router.get("/queue")
async def get_sos_queue():
    # Pawani will fetch this to populate the NDRF Dashboard and the Map!
    return {"queue": sos_queue, "teams": ndrf_teams}

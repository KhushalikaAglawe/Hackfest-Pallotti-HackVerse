import math
from app.core.state import store
from app.core.logger import get_logger

logger = get_logger(__name__)

def calculate_distance(lat1, lon1, lat2, lon2):
    # Simple Euclidean distance for simulation
    return math.sqrt((lat1 - lat2)**2 + (lon1 - lon2)**2)

def trigger_autonomous_dispatch(report_data):
    """
    SaaS Optimization: Find the closest drone and reroute it.
    This saves crucial response time.
    """
    citizen_loc = report_data["location"]
    best_drone = None
    min_dist = float('inf')

    # Iterate through our swarm (defined in state.py)
    for drone_id, drone_info in store.drones.items():
        if drone_info["status"] == "Patrolling":
            dist = calculate_distance(
                citizen_loc["lat"], citizen_loc["lon"],
                drone_info["lat"], drone_info["lon"]
            )
            if dist < min_dist:
                min_dist = dist
                best_drone = drone_id

    if best_drone:
        store.drones[best_drone]["status"] = "RESPONDING_TO_SOS"
        logger.warning(f"🚀 AUTO-DISPATCH: {best_drone} is moving to incident {report_data['report_id']}")
        return best_drone
    
    return None
import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Icons
const victimIcon = L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/9356/9356230.png', iconSize: [35, 35] });
const droneIcon = L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/1083/1083622.png', iconSize: [40, 40], iconAnchor: [20, 20] });

function MapAutoRefocus({ victimPos, dronePos, isActive }) {
  const map = useMap();
  useEffect(() => { if (isActive && dronePos) map.fitBounds([victimPos, dronePos], { padding: [50, 50] }); }, [dronePos, isActive, map, victimPos]);
  return null;
}

export default function UserPortal({ userData, onReportSubmit, onLogout }) {
  const [position, setPosition] = useState([20.5937, 78.9629]); 
  const [hasLocation, setHasLocation] = useState(false);
  const [status, setStatus] = useState("idle"); 
  const [description, setDescription] = useState("");
  const [dronePos, setDronePos] = useState(null);
  const [eta, setEta] = useState(120);
  const [missionId, setMissionId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const NDRF_BASE = [21.1458, 79.0882]; // Nagpur NDRF Base
  const startPos = useRef([21.1458, 79.0882]); 

  // --- 🔊 CIVILIAN SOS AUDIO ENGINE ---
  const [isMuted, setIsMuted] = useState(false);
  const sirenRef = useRef(null);

  useEffect(() => {
    // 1. Create the siren only ONCE
    if (!sirenRef.current) {
      sirenRef.current = new Audio('/sounds/siren.mp3');
      sirenRef.current.loop = true;
    }

    const siren = sirenRef.current;

    // 2. Logic: Should it be making noise?
    // Stop if: Muted OR SOS is inactive OR Rescue is already en route
    const sosActive = status !== "idle";
    const helpIsComing = status === "tracking";
    
    if (sosActive && !helpIsComing && !isMuted) {
      siren.play().catch(e => console.log("Audio play blocked"));
    } else {
      siren.pause();
      siren.currentTime = 0; // Reset to start for clean re-play
    }

    // Hard-wire the mute property for browser reliability
    siren.muted = isMuted;

    // 3. CLEANUP: This kills the ghost if you leave the page
    return () => {
      siren.pause();
    };
  }, [status, isMuted]); // 🚀 Now it reacts to both status and mute toggles
  const fetchLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setPosition(coords);
        setHasLocation(true);
        startPos.current = [coords[0] - 0.015, coords[1] - 0.015];
      });
    }
  };

  // ✅ QUICK SOS: Hits the Real Backend instantly with a default message
  const handleQuickSOS = async () => {
    if (!hasLocation) {
        alert("Acquiring GPS first...");
        fetchLocation();
        return;
    }

    const formData = new FormData();
    formData.append("video", new Blob(["no-video"], {type: "video/mp4"}), "panic.mp4");
    formData.append("description", "CRITICAL: ONE-TAP PANIC BUTTON ACTIVATED");
    formData.append("latitude", position[0]);
    formData.append("longitude", position[1]);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/sos/upload", { method: "POST", body: formData });
      const data = await response.json();
      setMissionId(data.mission_id);
      setStatus("waiting");
      onReportSubmit({ user: userData, location: { lat: position[0], lng: position[1] }, description: "ONE-TAP PANIC", type: "PANIC_SIGNAL", timestamp: new Date().toLocaleTimeString() });
    } catch (error) {
      alert("Transmission Failed. Is the backend running?");
    }
  };
  const handleSubmitSOS = async () => {
    if (!hasLocation) { alert("Acquire GPS lock first!"); return; }

    const formData = new FormData();
    formData.append("video", selectedFile || new Blob(["no-video"], {type: "video/mp4"}), selectedFile?.name || "no-video.mp4");
    formData.append("description", description || "No description provided");
    formData.append("latitude", position[0]);
    formData.append("longitude", position[1]);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/sos/upload", { method: "POST", body: formData });
      const data = await response.json();
      setMissionId(data.mission_id);
      setStatus("waiting");
      onReportSubmit({ user: userData, location: { lat: position[0], lng: position[1] }, description, type: "DETAILED_SOS", timestamp: new Date().toLocaleTimeString() });
    } catch (error) {
      console.error("SOS Transmission Failed:", error);
      alert("Transmission Failed. Is the backend running?");
    }
  };

  // ✅ POLLING: Wait for NDRF to assign a team to our mission
  useEffect(() => {
    let interval;
    if (missionId && status === "waiting") {
      interval = setInterval(async () => {
        try {
          const res = await fetch("http://127.0.0.1:8000/api/sos/queue");
          const data = await res.json();
          const myMission = data.queue.find(q => q.id === missionId);
          if (myMission && myMission.status === "EN ROUTE") {
            setStatus("tracking");
            setIsMuted(true); // 🚨 Automatically silence the alarm when help is coming
            clearInterval(interval);
          }
        } catch (error) { console.error("Polling error"); }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [missionId, status]);

  // ✅ REAL MATHEMATICAL ETA & HELICOPTER FLIGHT PATH (Haversine Formula)
  useEffect(() => {
    if (status === "tracking" && hasLocation) {
      const R = 6371;
      const dLat = (position[0] - NDRF_BASE[0]) * Math.PI / 180;
      const dLon = (position[1] - NDRF_BASE[1]) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(NDRF_BASE[0] * Math.PI / 180) * Math.cos(position[0] * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const distanceKm = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));

      let totalFlightSeconds = Math.floor((distanceKm / 250) * 3600) + 30;
      if (totalFlightSeconds < 15) totalFlightSeconds = 15;

      setEta(totalFlightSeconds);
      let currentTick = 0;

      const flightInterval = setInterval(() => {
        if (currentTick <= totalFlightSeconds) {
          const progress = currentTick / totalFlightSeconds;
          const currentLat = NDRF_BASE[0] + (position[0] - NDRF_BASE[0]) * progress;
          const currentLng = NDRF_BASE[1] + (position[1] - NDRF_BASE[1]) * progress;
          setDronePos([currentLat, currentLng]);
          setEta(totalFlightSeconds - currentTick);
          currentTick++;
        } else {
          clearInterval(flightInterval);
          setEta(0);
        }
      }, 1000);

      return () => clearInterval(flightInterval);
    }
  }, [status, position]);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <span style={{color: '#ff3333', fontWeight: 'bold'}}>🛡️ GUARDIAN EYE | SOS TERMINAL</span>
        <button onClick={onLogout} style={styles.exitBtn}>TERMINATE</button>
      </header>

      <div style={styles.mainGrid}>
        <div className="panel" style={{ ...styles.controlPanel, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ color: '#ff3333', margin: 0, fontSize: '14px' }}>SOS TERMINAL</h2>
            
            {/* 🔕 THE MUTE TOGGLE */}
            <button 
              onClick={() => setIsMuted(prev => !prev)} 
              className="btn"
              style={{
                background: isMuted ? '#444' : '#ff3333',
                color: isMuted ? '#888' : '#fff',
                padding: '5px 15px',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {isMuted ? "🔈 ALARM SILENCED" : "🔊 MUTE SIREN"}
            </button>
          </div>
          {status === "idle" ? (
            <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
              
              {/* 🚨 THE ONE-TAP PANIC BUTTON */}
              <div style={styles.panicSection}>
                <h3 style={{fontSize: '12px', color: '#ff3333'}}>ONE-TAP EMERGENCY</h3>
                <button onClick={handleQuickSOS} style={styles.panicBtn}>
                   SEND IMMEDIATE SOS
                </button>
                <p style={{fontSize:'9px', color:'#666', marginTop:'5px'}}>Sends GPS coordinates instantly to NDRF</p>
              </div>

              <hr style={{borderColor: '#222', width: '100%'}}/>

              {/* DETAILED REPORT SECTION */}
              <div style={styles.detailSection}>
                <h3 style={{fontSize: '12px', color: '#888'}}>DETAILED REPORT (OPTIONAL)</h3>
                <button onClick={fetchLocation} style={styles.locBtn}>
                    {hasLocation ? "📍 GPS LOCKED" : "📍 FETCH GPS"}
                </button>
                <textarea 
                  placeholder="Describe situation..." 
                  style={styles.textarea} 
                  onChange={(e) => setDescription(e.target.value)}
                />
                <input
                  type="file"
                  accept="video/mp4"
                  style={styles.fileInput}
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                />
                <button onClick={handleSubmitSOS} style={styles.submitBtn}>SUBMIT WITH DETAILS</button>
              </div>

            </div>

          // 🚨 WAITING FOR NDRF DISPATCH STATE:
          ) : status === "waiting" ? (
            <div style={{ background: '#110000', padding: '30px', border: '1px solid #ffaa00', textAlign: 'center', height: '100%' }}>
              <h2 style={{color: '#ffaa00', marginBottom: '20px'}}>🚨 SOS RECEIVED</h2>
              <div style={{fontSize: '18px', color: '#fff', marginBottom: '30px'}}>Evaluating Triage Priority...</div>
              <div className="pulse" style={{color: '#ffaa00', fontSize: '14px'}}>AWAITING NDRF SQUADRON DISPATCH</div>
            </div>

          // 🚁 THE ACTUAL TRACKING UI:
          ) : (
            <div style={styles.trackingInfo}>
              <h2 style={{color: '#00ff9c'}}>RESCUE UNIT EN ROUTE</h2>
              <div style={styles.etaBox}>
                <div style={{fontSize: '48px', color: '#ff3333'}}>
                  {Math.floor(eta / 60)}:{String(Math.floor(eta % 60)).padStart(2, '0')}
                </div>
                <div style={{fontSize: '10px'}}>REAL-TIME ESTIMATED ARRIVAL</div>
              </div>
              <div className="pulse">📡 LIVE SATELLITE TRACKING</div>
            </div>
          )}
        </div>

        <div className="panel" style={styles.mapPanel}>
          <MapContainer center={position} zoom={14} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {hasLocation && <Marker position={position} icon={victimIcon} />}
            {status === "tracking" && dronePos && (
              <>
                <MapAutoRefocus victimPos={position} dronePos={dronePos} isActive={true} />
                <Polyline positions={[NDRF_BASE, position]} color="#00ff9c" dashArray="5, 10" />
                <Marker position={dronePos} icon={droneIcon} />
              </>
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { height: '100vh', background: '#050505', color: 'white', padding: '15px' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #222' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', height: '85vh' },
  controlPanel: { background: '#0a0a0a', padding: '20px', border: '1px solid #222' },
  panicBtn: { width: '100%', padding: '30px', background: '#ff3333', border: 'none', color: 'white', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', boxShadow: '0 0 20px rgba(255, 51, 51, 0.4)' },
  locBtn: { width: '100%', padding: '10px', background: '#1a1a1a', border: '1px solid #333', color: 'white', marginBottom: '10px', cursor: 'pointer' },
  textarea: { width: '100%', background: '#111', border: '1px solid #333', color: 'white', padding: '10px', height: '60px', marginBottom: '10px' },
  submitBtn: { width: '100%', padding: '10px', background: '#444', border: 'none', color: 'white', cursor: 'pointer' },
  mapPanel: { border: '1px solid #333', overflow: 'hidden' },
  etaBox: { background: '#000', padding: '30px', border: '1px solid #333', margin: '20px 0' },
  exitBtn: { background: 'none', border: '1px solid #444', color: '#666', padding: '5px 10px', cursor: 'pointer', fontSize: '10px' }
};
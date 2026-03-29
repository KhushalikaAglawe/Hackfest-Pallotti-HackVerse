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
  const startPos = useRef([20.58, 78.95]); 

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

  // ✅ QUICK SOS: No text, No video, Just GPS
  const handleQuickSOS = () => {
    if (!hasLocation) {
        alert("Acquiring GPS first...");
        fetchLocation();
        return;
    }
    triggerSOS("CRITICAL: UNKNOWN EMERGENCY");
  };

  const triggerSOS = (desc) => {
    setStatus("reported");
    onReportSubmit({
      user: userData,
      location: { lat: position[0], lng: position[1] },
      description: desc || description,
      type: "PANIC_SIGNAL",
      timestamp: new Date().toLocaleTimeString()
    });
    setTimeout(() => setStatus("tracking"), 2000);
  };

  useEffect(() => {
    if (status === "tracking") {
      let step = 0;
      const interval = setInterval(() => {
        if (step <= 100) {
          const lat = startPos.current[0] + (position[0] - startPos.current[0]) * (step / 100);
          const lng = startPos.current[1] + (position[1] - startPos.current[1]) * (step / 100);
          setDronePos([lat, lng]);
          setEta(prev => (prev > 0 ? prev - 1.2 : 0));
          step++;
        } else clearInterval(interval);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, position]);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <span style={{color: '#ff3333', fontWeight: 'bold'}}>🛡️ GUARDIAN EYE | SOS TERMINAL</span>
        <button onClick={onLogout} style={styles.exitBtn}>TERMINATE</button>
      </header>

      <div style={styles.mainGrid}>
        <div className="panel" style={styles.controlPanel}>
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
                <input type="file" style={styles.fileInput} />
                <button onClick={() => triggerSOS()} style={styles.submitBtn}>SUBMIT WITH DETAILS</button>
              </div>

            </div>
          ) : (
            <div style={styles.trackingInfo}>
              <h2 style={{color: '#00ff9c'}}>RESCUE UNIT EN ROUTE</h2>
              <div style={styles.etaBox}>
                <div style={{fontSize: '48px', color: '#ff3333'}}>
                  {Math.floor(eta / 60)}:{String(Math.floor(eta % 60)).padStart(2, '0')}
                </div>
                <div style={{fontSize: '10px'}}>ESTIMATED ARRIVAL TIME</div>
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
                <Polyline positions={[startPos.current, position]} color="#00ff9c" dashArray="5, 10" />
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
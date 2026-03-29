import { useEffect, useState, useRef } from "react";
import React from "react";
import "./styles/global.css";
import { Canvas } from '@react-three/fiber';
import { OrbitControls, MeshDistortMaterial, Stars } from '@react-three/drei';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Components
import VideoPlayer from "./components/VideoPlayer";
import VLMControls from "./components/VLMControls";
import RadarPanel from "./components/RadarPanel";
import AITerminal from "./components/AITerminal"; 
import UserPortal from "./components/UserPortal"; 

// Leaflet Icon Fix
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// --- 🚀 TACTICAL DATA TABLES ---
const TacticalTables = () => {
  const [persons, setPersons] = useState([]);
  const [apiLogs, setApiLogs] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/history/logs");
        const data = await response.json();
        setApiLogs(Array.isArray(data) ? data : []); 
      } catch (e) { console.error("API Fetch Error", e); }
    };
    fetchHistory();

    const ws = new WebSocket("ws://localhost:8000/ws");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.persons) setPersons(data.persons);
      } catch (e) { console.error("WS Parse Error", e); }
    };
    return () => ws.close();
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
      <div className="panel" style={{ borderColor: '#333', height: '220px', overflowY: 'auto' }}>
        <div className="panel-title" style={{ color: '#ffaa00', fontSize: '10px' }}>🎯 LIVE TARGET ACQUISITION</div>
        <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse', marginTop: '5px' }}>
          <thead>
            <tr style={{ color: '#666', textAlign: 'left', borderBottom: '1px solid #222' }}>
              <th>ID</th><th>STATUS</th><th>TRIAGE</th><th>GPS</th>
            </tr>
          </thead>
          <tbody>
            {persons.length > 0 ? persons.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #111', background: p.triage_score > 100 ? 'rgba(255,0,0,0.1)' : 'none' }}>
                <td style={{ padding: '5px' }}>{p.person_id}</td>
                <td style={{ color: p.status.includes('INJURED') ? '#ff3333' : '#00ff9c' }}>{p.status}</td>
                <td>{p.triage_score}</td>
                <td style={{ color: '#888' }}>{p.gps_lat?.toFixed(3)}, {p.gps_lon?.toFixed(3)}</td>
              </tr>
            )) : <tr><td colSpan="4" style={{textAlign:'center', padding:'20px', color:'#333'}}>NO LIVE TARGETS DETECTED</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ borderColor: '#00ccff', height: '220px', overflowY: 'auto' }}>
        <div className="panel-title" style={{ color: '#00ccff', fontSize: '10px' }}>📂 SYSTEM HISTORY (DB)</div>
        <div style={{ padding: '5px' }}>
            {apiLogs.length > 0 ? apiLogs.slice().reverse().map((log, i) => (
                <div key={i} style={{ fontSize: '9px', borderBottom: '1px solid #111', padding: '6px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#00ff9c', minWidth: '60px' }}>[{log.timestamp?.split(' ')[1] || 'LOG'}]</span>
                    <span style={{ color: '#eee', textAlign: 'right', flex: 1, marginLeft: '10px' }}>{log.message || log.event || "Data Synced"}</span>
                </div>
            )) : <div style={{fontSize:'9px', color:'#444', textAlign:'center', marginTop:'40px'}}>NO HISTORY LOGS FOUND</div>}
        </div>
      </div>
    </div>
  );
};

const DepthPanel = ({ alertStatus }) => {
  const isEmergency = alertStatus === "EMERGENCY";
  const themeColor = isEmergency ? "#ff3333" : "#00ff9c";
  return (
    <div className="panel" style={{ height: "220px", position: "relative", background: "#000", overflow: "hidden" }}>
      <div className="panel-title" style={{ color: themeColor, fontSize: '10px' }}>📡 MiDaS V3.1 | TACTICAL 3D DEPTH MAP</div>
      <Canvas camera={{ position: [0, 12, 12], fov: 45 }}>
        <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade />
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} color={themeColor} intensity={2} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
          <planeGeometry args={[22, 16, 100, 100]} />
          <MeshDistortMaterial color={themeColor} speed={isEmergency ? 4 : 1} distort={0.5} wireframe opacity={0.3} transparent />
        </mesh>
        <OrbitControls enableZoom={false} autoRotate />
      </Canvas>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState("landing"); 
  const [userData, setUserData] = useState(null);
  const [alert, setAlert] = useState("NORMAL");
  const [logs, setLogs] = useState(["[SYSTEM] Tactical Deck Online", "[AUTH] Waiting..."]);

  // --- NEW BACKEND STATES (Lobby & Queue) ---
  const [backendQueue, setBackendQueue] = useState([]);
  const [backendTeams, setBackendTeams] = useState({});
  const [activeMissionId, setActiveMissionId] = useState(null);

  // --- REAL-TIME QUEUE POLLING (Lobby) ---
  useEffect(() => {
    let interval;
    if (view === "admin-lobby") {
      const fetchQueue = async () => {
        try {
          const res = await fetch("http://127.0.0.1:8000/api/sos/queue");
          const data = await res.json();
          setBackendQueue(data.queue || []);
          setBackendTeams(data.teams || {});
        } catch (e) { console.error("Backend offline or CORS issue"); }
      };
      fetchQueue(); 
      interval = setInterval(fetchQueue, 3000);
    }
    return () => clearInterval(interval);
  }, [view]);

  // --- DB TEAMMATE'S POLLING LOGIC ---
  useEffect(() => {
    if (view === "admin-tactical") {
      const interval = setInterval(() => { fetchNewMessages(); }, 3000);
      return () => clearInterval(interval);
    }
  }, [view]);

  async function fetchNewMessages() {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/alerts/popups');
      const data = await response.json();
      if (data.alerts) {
        data.alerts.forEach(msg => {
          setLogs(prev => [...prev, `[USER-${msg.user}]: ${msg.content}`]);
        });
      }
    } catch (e) { console.error("Polling Error", e); }
  }

  async function sendQuickReply(text, msgId = "CMD-01") {
    try {
      await fetch('http://127.0.0.1:8000/api/alerts/reply', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ message_id: msgId, reply_text: text })
      });
      setLogs(prev => [...prev, `[COMMAND]: ${text}`]);
    } catch (e) { console.error("Reply Error", e); }
  }

  const handleLogin = (role, data) => { 
    setUserData(data); 
    setView(role); 
    setLogs(p => [...p, `[AUTH] ${role.toUpperCase()} session started for ${data.name}`]);
  };

  const handleLogout = () => { 
    setView("landing"); 
    setUserData(null);
    setLogs(["[SYSTEM] Security logout successful"]);
  };

  // --- VIEWS ---
  if (view === "landing") {
    return (
      <div className="landing-page" style={s.landing}>
        <div style={s.gridOverlay}></div>
        <h1 style={s.mainTitle}>GUARDIAN EYE v2.0</h1>
        <p style={s.subTitle}>INTEGRATED DISASTER MANAGEMENT SYSTEM</p>
        <div style={{display: 'flex', gap: '30px', marginTop: '50px', zIndex: 2}}>
          <button style={s.sosBtn} onClick={() => setView("login-civilian")}>CIVILIAN SOS</button>
          <button style={s.cmdBtn} onClick={() => setView("login-admin")}>NDRF COMMAND</button>
        </div>
      </div>
    );
  }

  if (view === "login-civilian" || view === "login-admin") {
    return (
      <div style={s.landing}>
        <div className="panel" style={s.loginBox}>
          <h2 style={{color: view === "login-civilian" ? '#ff3333' : '#00ff9c', marginBottom: '20px'}}>
            {view === "login-civilian" ? "CIVILIAN ENTRANCE" : "COMMAND ENTRANCE"}
          </h2>
          <input type="text" placeholder="SERVICE ID / USERNAME" style={s.input} id="uIn" />
          <input type="password" placeholder="SECURE PASSCODE" style={s.input} />
          <button 
            style={view === "login-civilian" ? s.sosBtn : s.cmdBtn} 
            onClick={() => handleLogin(view === "login-civilian" ? "user" : "admin-lobby", { name: document.getElementById("uIn").value || "User" })}
          > AUTHORIZE ACCESS </button>
          <p onClick={() => setView("landing")} style={{cursor:'pointer', fontSize:'10px', marginTop:'20px', color:'#555'}}>RETURN TO SELECTION</p>
        </div>
      </div>
    );
  }

  if (view === "user") {
    return <UserPortal userData={userData} onLogout={handleLogout} />;
  }

  if (view === "admin-lobby") {
    return (
      <div style={{ padding: '20px', background: '#050505', minHeight: '100vh', color: 'white' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f0', paddingBottom: '10px', marginBottom: '20px' }}>
          <h2 style={{ color: '#0f0', margin: 0 }}>🛡️ GUARDIAN EYE - GLOBAL COMMAND LOBBY</h2>
          <button onClick={handleLogout} className="btn blue">TERMINATE SESSION</button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          {/* THE TACTICAL MAP */}
          <div className="panel" style={{ border: '1px solid #00ccff', height: '400px' }}>
            <MapContainer center={[21.1458, 79.0882]} zoom={10} style={{ height: "100%", width: "100%", background: '#0a0a0a' }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              <Marker position={[21.1458, 79.0882]}><Popup>NDRF BASE</Popup></Marker>
              {backendQueue.filter(q => q.status !== "COMPLETED").map(q => (
                <React.Fragment key={q.id}>
                  <Marker position={[q.lat, q.lng]} icon={DefaultIcon} />
                  <Polyline positions={[[21.1458, 79.0882], [q.lat, q.lng]]} color={q.severity_score > 40 ? "#ff3333" : "#00ff9c"} dashArray="5, 10" />
                </React.Fragment>
              ))}
            </MapContainer>
          </div>

          {/* ACTIVE TEAMS PANEL */}
          <div className="panel" style={{ border: '1px solid #00ff9c', overflowY: 'auto', height: '400px', padding: '15px' }}>
            <h3 style={{ color: '#00ff9c', marginTop: 0 }}>🚁 NDRF SQUADRONS</h3>
            {Object.entries(backendTeams).map(([team, info]) => (
              <div key={team} style={{ background: '#111', border: `1px solid ${info.status === "AVAILABLE" ? '#00ff9c' : '#ffaa00'}`, padding: '10px', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, color: info.status === "AVAILABLE" ? '#00ff9c' : '#00ccff' }}>{team}</h4>
                <p style={{ margin: '5px 0', fontSize: '12px' }}>Status: {info.status}</p>
                {info.mission_id && (
                  <button 
                    onClick={() => { setActiveMissionId(info.mission_id); setView("admin-tactical"); }} 
                    style={{ width: '100%', padding: '8px', background: '#00ccff', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#000' }}>
                    🎯 ENTER MISSION DECK
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* DISPATCH QUEUE */}
        <div className="panel" style={{ marginTop: '20px', border: '1px solid #ff3333' }}>
          <h3 style={{ color: '#ff3333' }}>🚨 DISPATCH QUEUE</h3>
          {backendQueue.filter(q => q.status !== "COMPLETED").map(q => (
            <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', padding: '10px 0' }}>
              <div>
                <strong style={{ color: q.severity_score > 40 ? '#ff3333' : '#ffaa00' }}>{q.id}</strong> | Score: {q.severity_score}
                <div style={{ fontSize: '12px', color: '#aaa' }}>{q.desc}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#fff' }}>{q.status}</div>
                <div style={{ color: '#00ccff', fontSize: '12px' }}>{q.assigned_team || "AWAITING TEAM"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- ADMIN TACTICAL DECK ---
  if (view === "admin-tactical") {
    return (
      <div className={`app ${alert === "EMERGENCY" ? "emergency-screen" : ""}`}>
        <div className="header">
          <span>GUARDIAN EYE — TACTICAL DECK | OP: {activeMissionId}</span>
          <div>
            <button onClick={async () => {
              if(window.confirm("Mark mission secure and generate report?")) {
                await fetch(`http://127.0.0.1:8000/api/sos/complete/${activeMissionId}`, { method: "POST" });
                window.open("http://127.0.0.1:8000/api/stream/download_report", "_blank");
                setView("admin-lobby");
              }
            }} className="btn" style={{ background: '#0f0', color: '#000', marginRight: '10px', fontWeight: 'bold' }}>
              ✅ MARK COMPLETE
            </button>
            <button onClick={() => setView("admin-lobby")} className="btn blue" style={{ marginRight: '10px' }}>⬅️ LOBBY</button>
            <button onClick={handleLogout} className="btn red">TERMINATE</button>
          </div>
        </div>

        <div className="main-grid">
          <div className="left-panel"><VLMControls /></div>
          <div className="center-panel"><VideoPlayer /></div> 
          <div className="right-panel"><RadarPanel persons={[]} /></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px", marginTop: "10px" }}>
          <DepthPanel alertStatus={alert} />
        </div>

        <div style={{ marginTop: "10px" }}>
          <TacticalTables />
        </div>

        <div style={{marginTop: '10px'}}>
          <AITerminal logs={logs} onReply={sendQuickReply} />
        </div>
      </div>
    );
  }

  return null;
}

const s = {
  landing: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', position: 'relative', overflow: 'hidden' },
  gridOverlay: { position: 'absolute', width: '200%', height: '200%', backgroundImage: 'radial-gradient(#111 1px, transparent 0)', backgroundSize: '40px 40px', opacity: 0.3 },
  mainTitle: { color: '#00ff9c', fontSize: '64px', fontWeight: 'bold', letterSpacing: '8px', zIndex: 2, textShadow: '0 0 20px rgba(0,255,156,0.3)' },
  subTitle: { color: '#666', letterSpacing: '4px', zIndex: 2, marginTop: '-10px' },
  sosBtn: { padding: '15px 40px', background: '#ff3333', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', boxShadow: '0 0 15px rgba(255,51,51,0.3)' },
  cmdBtn: { padding: '15px 40px', background: 'none', border: '2px solid #00ff9c', color: '#00ff9c', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
  loginBox: { width: '350px', background: '#0a0a0a', padding: '30px', border: '1px solid #222', textAlign: 'center', zIndex: 5 },
  input: { width: '100%', padding: '12px', background: '#151515', border: '1px solid #333', color: 'white', marginBottom: '15px', outline: 'none', fontFamily: 'monospace' }
};
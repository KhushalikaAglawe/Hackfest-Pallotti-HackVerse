import { useEffect, useState, useRef } from "react";
import "./styles/global.css";
import { Canvas } from '@react-three/fiber';
import { OrbitControls, MeshDistortMaterial, Stars } from '@react-three/drei';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

// --- 3D TACTICAL DEPTH PANEL ---
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
  const [adminSubView, setAdminSubView] = useState("dashboard");
  const [userData, setUserData] = useState(null);
  const [civilianReports, setCivilianReports] = useState([]);
  const [dispatchQueue, setDispatchQueue] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [alert, setAlert] = useState("NORMAL");
  const [logs, setLogs] = useState(["[SYSTEM] Tactical Deck Online", "[AUTH] Waiting..."]);

  const handleLogin = (role, data) => { 
    setUserData(data); 
    setView(role); 
    setLogs(p => [...p, `[AUTH] ${role.toUpperCase()} session started for ${data.name}`]);
  };

  const handleLogout = () => { 
    setView("landing"); 
    setAdminSubView("dashboard");
    setUserData(null);
    setLogs(p => [...p, "[SYSTEM] Security logout successful"]);
  };

  const handleCivilianReport = (report) => {
    setCivilianReports(p => [report, ...p]);
    setAlert(report.type === "PANIC_SIGNAL" ? "EMERGENCY" : "NORMAL");
    setLogs(p => [...p, `[ALERT] ${report.type || 'SOS'} from ${report.user.name}`]);
  };

  const handleDispatch = (report) => {
    const mission = { ...report, unit: "NDRF-ALPHA-1", status: "EN ROUTE" };
    setDispatchQueue(p => [...p, mission]);
    setLogs(p => [...p, `[DISPATCH] Unit Alpha-1 deployed to ${report.user.name}`]);
    setAdminSubView("dashboard");
  };

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
            onClick={() => handleLogin(view === "login-civilian" ? "user" : "admin", { name: document.getElementById("uIn").value || "User" })}
          > AUTHORIZE ACCESS </button>
          <p onClick={() => setView("landing")} style={{cursor:'pointer', fontSize:'10px', marginTop:'20px', color:'#555'}}>RETURN TO SELECTION</p>
        </div>
      </div>
    );
  }

  if (view === "user") {
    return <UserPortal userData={userData} onReportSubmit={handleCivilianReport} onLogout={handleLogout} />;
  }

  if (adminSubView === "map" && selectedReport) {
    return (
      <div style={{ height: "100vh", background: "#050505", color: "white", padding: "20px" }}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
            <h3>🛰️ TARGET ACQUISITION: {selectedReport.user.name}</h3>
            <button className="btn blue" onClick={() => setAdminSubView("dashboard")}>EXIT MAP</button>
        </div>
        <MapContainer center={[selectedReport.location.lat, selectedReport.location.lng]} zoom={15} style={{ height: "75vh", border:'1px solid #333' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[selectedReport.location.lat, selectedReport.location.lng]}><Popup>{selectedReport.user.name}</Popup></Marker>
        </MapContainer>
        <button onClick={() => handleDispatch(selectedReport)} className="btn red" style={{width:'100%', marginTop:'10px', padding:'15px', fontWeight:'bold'}}>CONFIRM DISPATCH UNIT</button>
      </div>
    );
  }

  return (
    <div className={`app ${alert === "EMERGENCY" ? "emergency-screen" : ""}`}>
      <div className="header">
        <span>GUARDIAN EYE — COMMAND DASHBOARD</span>
        <button onClick={handleLogout} className="btn blue">TERMINATE SESSION</button>
      </div>

      <div className="main-grid">
        <div className="left-panel"><VLMControls /></div>
        <div className="center-panel"><VideoPlayer /></div> 
        <div className="right-panel"><RadarPanel persons={[]} /></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "10px", marginTop: "10px" }}>
        <DepthPanel alertStatus={alert} />
        
        {/* SOS REPORTS PANEL with Instant Dispatch Button */}
        <div className="panel" style={{borderColor: '#ffaa00', maxHeight: '220px', overflowY: 'auto'}}>
            <div className="panel-title" style={{color: '#ffaa00'}}>🚨 INCOMING SOS</div>
            {civilianReports.length === 0 ? <div style={{fontSize:'10px', color:'#444', textAlign:'center', marginTop:'30px'}}>NO ACTIVE SOS</div> : 
              civilianReports.map((r, i) => (
                <div key={i} style={{padding: '8px', borderBottom: '1px solid #222'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span style={{fontSize:'10px', color: r.type === "PANIC_SIGNAL" ? "#ff3333" : "white"}}>
                            {r.type === "PANIC_SIGNAL" ? "⚠ PANIC: " : ""}{r.user.name}
                        </span>
                        <button onClick={() => handleDispatch(r)} style={{fontSize:'8px', background:'#00ff9c', border:'none', color:'black', padding:'2px 5px', cursor:'pointer'}}>INSTANT DISPATCH</button>
                    </div>
                    <button onClick={() => { setSelectedReport(r); setAdminSubView("map"); }} style={{width:'100%', fontSize:'8px', marginTop:'5px', background:'#333', border:'none', color:'white', cursor:'pointer'}}>VIEW ON MAP</button>
                </div>
            ))}
        </div>

        <div className="panel" style={{borderColor: '#00ff9c', maxHeight: '220px', overflowY: 'auto'}}>
            <div className="panel-title" style={{color: '#00ff9c'}}>🚜 RESCUE QUEUE</div>
            {dispatchQueue.length === 0 ? <div style={{fontSize:'10px', color:'#444', textAlign:'center', marginTop:'30px'}}>NO UNITS DEPLOYED</div> : 
              dispatchQueue.map((d, i) => (
                <div key={i} style={{fontSize:'9px', color:'#00ff9c', borderBottom:'1px solid #111', padding:'5px 0'}}>
                  {d.unit} {"->"} {d.user.name} <br/>
                  <span style={{fontSize:'8px', color:'#888'}}>[MISSION: EN ROUTE]</span>
                </div>
              ))}
        </div>
      </div>

      <div style={{marginTop: '10px'}}>
        <AITerminal logs={logs} />
      </div>
    </div>
  );
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
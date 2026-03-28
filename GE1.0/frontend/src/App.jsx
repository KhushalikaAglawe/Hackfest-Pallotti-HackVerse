import { useEffect, useState, useRef } from "react";
import "./styles/global.css";

// --- 3D & COMPONENT IMPORTS ---
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, MeshDistortMaterial, Stars } from '@react-three/drei';
import VideoPlayer from "./components/VideoPlayer";
import VLMControls from "./components/VLMControls";
import RadarPanel from "./components/RadarPanel";
import AITerminal from "./components/AITerminal";

// --- 3D DEPTH PANEL COMPONENT ---
const DepthPanel = ({ alertStatus }) => {
  const isEmergency = alertStatus === "EMERGENCY";
  const themeColor = isEmergency ? "#ff3333" : "#00ff9c";

  return (
    <div className="panel" style={{ height: "300px", position: "relative", background: "#000", overflow: "hidden" }}>
      <div className="panel-title" style={{ color: themeColor }}>Tactical Depth Scan</div>
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 5, 10]} />
        <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={isEmergency ? 4 : 1} />
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} color={themeColor} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
          <planeGeometry args={[20, 20, 30, 30]} />
          <MeshDistortMaterial color={themeColor} speed={isEmergency ? 3 : 1} distort={0.2} wireframe />
        </mesh>
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  );
};

export default function App() {
  const [persons, setPersons] = useState([]);
  const [alert, setAlert] = useState("NORMAL");
  const [recommendation, setRecommendation] = useState("WAITING FOR DATA...");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [survivors, setSurvivors] = useState(0);
  const [logs, setLogs] = useState(["[SYSTEM] Initializing Guardian Eye..."]);

  const sounds = useRef({
    emergency: new Audio("/sounds/siren.mp3"),
    warning: new Audio("/sounds/warning.mp3"),
    target: new Audio("/sounds/targetlock.mp3"),
  });

  // --- 📡 WEBSOCKET CONNECTION ---
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/ws");

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.system_recommendation) setRecommendation(data.system_recommendation.toUpperCase());
      if (data.alert_level) setAlert(data.alert_level);
      if (data.detected_persons) {
        setPersons(data.detected_persons);
        setSurvivors(data.total_survivors || data.detected_persons.length);
      }

      // --- 🔊 SIREN LOGIC ---
      if (audioEnabled) {
        if (data.alert_level === "EMERGENCY") {
          sounds.current.emergency.loop = true;
          sounds.current.emergency.play().catch(() => {});
        } else {
          sounds.current.emergency.pause();
          sounds.current.emergency.currentTime = 0;
        }

        if (data.alert_level === "WARNING") sounds.current.warning.play().catch(() => {});
        if (data.target_locked) sounds.current.target.play().catch(() => {});
      }
    };

    socket.onopen = () => setLogs(p => [...p, "[WS] CONNECTION ESTABLISHED"]);
    socket.onerror = () => setLogs(p => [...p, "[WS] CONNECTION ERROR - CHECK BACKEND"]);

    return () => socket.close();
  }, [audioEnabled]);

  // --- 🛠️ ACTIONS ---
  const toggleAudio = () => {
    if (audioEnabled) {
      Object.values(sounds.current).forEach(s => { s.pause(); s.currentTime = 0; });
      setAudioEnabled(false);
    } else {
      setAudioEnabled(true);
    }
  };

  const handleRescue = async (id) => {
    try {
      await fetch(`http://localhost:8000/api/action/rescue/${id}`, { method: 'POST' });
      setLogs(p => [...p, `[ACTION] RESCUE INITIATED FOR ID: ${id}`]);
    } catch (err) {
      setLogs(p => [...p, `[ERROR] ACTION FAILED`]);
    }
  };

  return (
    <div className={`app ${alert === "EMERGENCY" ? "emergency-screen" : ""}`}>
      
      <div className="header" style={{ background: alert === 'EMERGENCY' ? '#ff3333' : '#111' }}>
        <div className={alert !== "NORMAL" ? "flashing-text" : ""}>
          {alert === "NORMAL" ? "🛡️ GUARDIAN EYE" : `⚠️ RECOMMENDATION: ${recommendation}`}
        </div>
        <button onClick={toggleAudio} className={`btn ${audioEnabled ? 'red' : 'green'}`} style={{ width: '150px' }}>
          {audioEnabled ? "🔇 MUTE SIRENS" : "🔊 ENABLE SIRENS"}
        </button>
      </div>

      <div className="main-grid">
        <div className="left-panel"><VLMControls /></div>
        <div className="center-panel"><VideoPlayer /></div>
        <div className="right-panel">
          <RadarPanel persons={persons} />
          {persons.map((p, i) => (
            <button key={i} onClick={() => handleRescue(p.id || i)} className="btn green" style={{ marginTop: '5px', fontSize: '10px' }}>
              RESCUE UNIT {p.id || i} ✔️
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr", gap: "10px", marginTop: "10px" }}>
        <DepthPanel alertStatus={alert} />
        <div className="panel triage">
          <div className="panel-title">Survivors</div>
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span style={{ fontSize: '64px', color: '#00ff9c', fontWeight: 'bold' }}>{survivors}</span>
            <div style={{ fontSize: '10px', opacity: 0.6 }}>BACKEND VERIFIED</div>
          </div>
        </div>
      </div>

      <div className="bottom-grid" style={{ marginTop: "10px" }}>
        <div className="panel vip">
          <div className="panel-title">AI ADVISORY</div>
          <div style={{ color: '#00ff9c', fontSize: '12px' }}>{recommendation}</div>
        </div>
        <div className="panel" style={{ borderColor: '#ffaa00' }}>
          <div className="panel-title" style={{ color: '#ffaa00' }}>Mission Control</div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button className="btn blue" style={{ flex: 1 }}>EXPORT REPORT</button>
            <button onClick={() => window.location.reload()} className="btn red" style={{ flex: 1 }}>END MISSION</button>
          </div>
        </div>
        <div className="panel hazard">
          <div className="panel-title">System Status</div>
          <div style={{ fontSize: '24px', color: alert === 'EMERGENCY' ? 'red' : '#00ff9c' }}>{alert}</div>
        </div>
      </div>

      <AITerminal logs={logs} />
    </div>
  );
}
import { useEffect, useState, useRef } from "react";
import "./styles/global.css";
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, MeshDistortMaterial, Stars } from '@react-three/drei';

// Components
import VideoPlayer from "./components/VideoPlayer";
import VLMControls from "./components/VLMControls";
import RadarPanel from "./components/RadarPanel";
import AITerminal from "./components/AITerminal";

// --- 3D DEPTH PANEL (Wapas Integrated) ---
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
  const [recommendation, setRecommendation] = useState("AWAITING DATA...");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [survivors, setSurvivors] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [logs, setLogs] = useState(["[SYSTEM] React Tactical Deck Online"]);

  const sounds = useRef({
    emergency: new Audio("/sounds/siren.mp3"),
    warning: new Audio("/sounds/warning.mp3"),
    target: new Audio("/sounds/targetlock.mp3"),
  });

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/ws");
    socket.onopen = () => { setWsConnected(true); setLogs(p => [...p, "[WS] CONNECTED"]); };
    socket.onclose = () => { setWsConnected(false); setLogs(p => [...p, "[WS] DISCONNECTED"]); };
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.system_recommendation) setRecommendation(data.system_recommendation.toUpperCase());
      if (data.alert_level) setAlert(data.alert_level);
      if (data.detected_persons) {
        setPersons(data.detected_persons);
        setSurvivors(data.total_survivors || data.detected_persons.length);
      }
      if (audioEnabled) {
        if (data.alert_level === "EMERGENCY") { sounds.current.emergency.loop = true; sounds.current.emergency.play().catch(()=>{}); }
        else { sounds.current.emergency.pause(); sounds.current.emergency.currentTime = 0; }
        if (data.alert_level === "WARNING") sounds.current.warning.play().catch(()=>{});
        if (data.target_locked) sounds.current.target.play().catch(()=>{});
      }
    };
    return () => socket.close();
  }, [audioEnabled]);

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    if (audioEnabled) Object.values(sounds.current).forEach(s => { s.pause(); s.currentTime = 0; });
  };

  return (
    <div className={`app ${alert === "EMERGENCY" ? "emergency-screen" : ""}`}>
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: wsConnected ? '#00ff9c' : '#ff3333' }}></div>
          <span className={alert !== "NORMAL" ? "flashing-text" : ""}>GUARDIAN EYE — {recommendation}</span>
        </div>
        <button onClick={toggleAudio} className={`btn ${audioEnabled ? 'red' : 'green'}`}>
          {audioEnabled ? "🔇 MUTE SIRENS" : "🔊 ENABLE SIRENS"}
        </button>
      </div>

      <div className="main-grid">
        <div className="left-panel"><VLMControls /></div>
        <div className="center-panel"><VideoPlayer /></div>
        <div className="right-panel"><RadarPanel persons={persons} /></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr", gap: "10px", marginTop: "10px" }}>
        {/* ✅ 3D DEPTH SCAN COMPONENT HERE */}
        <DepthPanel alertStatus={alert} />
        
        <div className="panel triage">
          <div className="panel-title">MISSION SURVIVORS</div>
          <span style={{ fontSize: '72px', color: '#00ff9c' }}>{survivors}</span>
        </div>
      </div>

      <div className="bottom-grid" style={{ marginTop: "10px" }}>
        <div className="panel vip">
          <div className="panel-title">ENVIRONMENT ADVISORY</div>
          <div style={{ color: '#00ff9c', fontSize: '13px', marginTop: '10px' }}>{recommendation}</div>
        </div>
        <div className="panel" style={{ borderColor: '#ffaa00' }}>
          <div className="panel-title" style={{ color: '#ffaa00' }}>MISSION CONTROL</div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button className="btn blue" style={{ flex: 1 }}>EXPORT</button>
            <button onClick={() => window.location.reload()} className="btn red" style={{ flex: 1 }}>END</button>
          </div>
        </div>
        <div className="panel hazard">
          <div className="panel-title">SYSTEM STATUS</div>
          <div style={{ fontSize: '24px', color: alert === 'EMERGENCY' ? 'red' : '#00ff9c', textAlign: 'center' }}>{alert}</div>
        </div>
      </div>
      <AITerminal logs={logs} />
    </div>
  );
}
import { useEffect, useState, useRef } from "react";
import "./styles/global.css";
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, MeshDistortMaterial, Stars } from '@react-three/drei';

// Components
import VideoPlayer from "./components/VideoPlayer";
import VLMControls from "./components/VLMControls";
import RadarPanel from "./components/RadarPanel";
import AITerminal from "./components/AITerminal";

const DepthPanel = ({ alertStatus }) => {
  const isEmergency = alertStatus === "EMERGENCY";
  const themeColor = isEmergency ? "#ff3333" : "#00ff9c";

  return (
    <div className="panel" style={{ height: "300px", position: "relative", background: "#000", overflow: "hidden" }}>
      <div className="panel-title" style={{ color: themeColor, fontSize: '10px' }}>
        📡 MiDaS V3.1 | TACTICAL 3D DEPTH MAP | SECTOR: NORTH-EAST
      </div>

      <Canvas camera={{ position: [0, 12, 12], fov: 45 }}>
        <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade />
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} color={themeColor} intensity={2} />

        {/* 🏔️ THE MiDaS TERRAIN MESH */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
          <planeGeometry args={[22, 16, 100, 100]} />
          <MeshDistortMaterial 
            color={themeColor} 
            speed={isEmergency ? 4 : 1} 
            distort={0.5} 
            wireframe 
            opacity={0.3}
            transparent
          />
        </mesh>

        {/* 🟩 TACTICAL OVERLAY GRID (The boxes from your image) */}
        <group position={[0, -1.9, 0]}>
          {[...Array(6)].map((_, x) => 
            [...Array(4)].map((_, z) => (
              <group key={`${x}-${z}`} position={[(x - 2.5) * 4, 0, (z - 1.5) * 4]}>
                {/* Square Box Outline */}
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[1.8, 1.85, 4]} rotation={[0, 0, Math.PI / 4]} />
                  <meshBasicMaterial color={themeColor} transparent opacity={0.4} />
                </mesh>
                
                {/* Center Crosshair (+) */}
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[0.1, 32]} />
                  <meshBasicMaterial color={themeColor} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[15, 1, 1]}>
                  <planeGeometry args={[0.05, 0.4]} />
                  <meshBasicMaterial color={themeColor} opacity={0.6} transparent />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1, 15, 1]}>
                  <planeGeometry args={[0.4, 0.05]} />
                  <meshBasicMaterial color={themeColor} opacity={0.6} transparent />
                </mesh>
              </group>
            ))
          )}
        </group>

        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI / 2.5} />
      </Canvas>

      {/* Landing Zone Labels (Simulating image text) */}
      <div style={{ position: 'absolute', top: '40px', left: '20px', color: themeColor, fontSize: '9px', fontFamily: 'monospace', textShadow: '0 0 5px #000' }}>
        DEPTH / LZ ANALYSIS <br/>
        <span style={{color: '#ffaa00'}}>LZ SAFE 88%</span> | <span style={{color: '#ff3333'}}>LZ UNSAFE 22%</span>
      </div>

      {/* Floating Scan Bar */}
      <div style={{
        position: 'absolute', width: '100%', height: '1px', background: themeColor,
        boxShadow: `0 0 10px ${themeColor}`, top: '50%', opacity: 0.3,
        animation: 'scan-line 3s ease-in-out infinite'
      }}></div>

      <style>{`
        @keyframes scan-line {
          0%, 100% { top: 20%; }
          50% { top: 80%; }
        }
      `}</style>
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
    socket.onopen = () => { setWsConnected(true); setLogs(p => [...p, "[WS] CONNECTED TO NE-SECTOR"]); };
    socket.onclose = () => { setWsConnected(false); setLogs(p => [...p, "[WS] DISCONNECTED"]); };
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.system_recommendation) setRecommendation(data.system_recommendation.toUpperCase());
      if (data.alert_level) setAlert(data.alert_level);
      
      // ✅ Radar Dots/Persons Binding
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
        {/* ✅ Radar dots are passed here */}
        <div className="right-panel"><RadarPanel persons={persons} /></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr", gap: "10px", marginTop: "10px" }}>
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
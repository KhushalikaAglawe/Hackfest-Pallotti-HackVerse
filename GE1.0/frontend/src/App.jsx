import { useEffect, useState } from "react";
import "./styles/global.css";

// Components
import VideoPlayer from "./components/VideoPlayer";
import VLMControls from "./components/VLMControls";
import RadarPanel from "./components/RadarPanel";
import AITerminal from "./components/AITerminal";
import TelemetryPanel from "./components/TelemetryPanel";
import AlertsBanner from "./components/AlertsBanner";
import MissionControl from "./components/MissionControl";
import BottomPanels from "./components/BottomPanels";

export default function App() {

  const sounds = {
    emergency: new Audio("/sounds/siren.mp3"),
    target: new Audio("/sounds/targetlock.mp3"),
    warning: new Audio("/sounds/warning.mp3"),
  };

  const [persons, setPersons] = useState([]);
  const [alert, setAlert] = useState("NORMAL");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [vipLocked, setVipLocked] = useState(false);
  const [logs, setLogs] = useState([
    "[SYSTEM] Boot sequence initiated...",
    "[AI] Awaiting commands..."
  ]);

  const enableAudio = () => {
    Object.values(sounds).forEach((s) => {
      s.volume = 0.3;
      s.play().then(() => s.pause()).catch(() => {});
    });
    setAudioEnabled(true);
  };

  useEffect(() => {
    const interval = setInterval(() => {

      const dummy = {
        id: "P-001",
        status: Math.random() > 0.5 ? "Standing" : "Injured",
        score: Math.floor(Math.random() * 150),
      };

      setPersons([dummy]);

      setLogs((prev) => [
        ...prev.slice(-5),
        `[AI] ${dummy.status} detected (${dummy.score})`
      ]);
      if (persons.length > 0 && persons[0].score > 100) {
  setVipLocked(true);

  if (audioEnabled) {
    sounds.target.play();
  }
} else {
  setVipLocked(false);
}

      const states = ["NORMAL", "WARNING", "EMERGENCY"];
      const random = states[Math.floor(Math.random() * 3)];
      setAlert(random);

      if (audioEnabled) {
        if (random === "EMERGENCY") {
          sounds.emergency.loop = true;
          sounds.emergency.play();
        }
        if (random === "WARNING") {
          sounds.warning.play();
        }
      }

    }, 5000);

    return () => clearInterval(interval);
  }, [audioEnabled]);

 return (
  <div className={`app ${alert === "EMERGENCY" ? "emergency-screen" : ""}`}>
    

    <div className="header">
        GUARDIAN EYE — EDGE COMMAND DECK
        
    </div>

    {/* TOP GRID */}
    <div className="main-grid">

      <div className="left-panel">
        <VLMControls />
      </div>

      <div className="center-panel">
        <VideoPlayer />
      </div>

      <div className="right-panel">
        <RadarPanel persons={persons} />
        {persons.map((p, i) => (
  <div
    key={i}
    className="radar-dot"
    style={{
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`
    }}
  />
))}
      </div>

    </div>

    {/* ✅ SIMPLE BOTTOM TEST */}
    <div className="bottom-grid">

  <div className="panel vip">
    <h3>VIP TRACKER</h3>
    <div className={`panel vip ${persons.length > 0 ? "vip-lock" : ""}`}></div>
    <div className={`panel vip ${vipLocked ? "vip-lock" : ""}`}></div>
    
  </div>

  <div className="panel hazard">
    <h3>HAZARD</h3>
  </div>

  <div className="panel triage">
    <h3>TRIAGE</h3>
  </div>
  

</div>
 <AITerminal logs={logs || []} />

  </div>
);
}
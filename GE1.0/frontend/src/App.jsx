import { useEffect, useState } from "react";
import "./styles/global.css";

<<<<<<< HEAD
// Components
=======
// ✅ Correct Imports (CASE FIXED)
>>>>>>> e06eb8d349f42445b552363386a7dc1eeb96157c
import VideoPlayer from "./components/VideoPlayer";
import VLMControls from "./components/VLMControls";
import RadarPanel from "./components/RadarPanel";
import AITerminal from "./components/AITerminal";
import TelemetryPanel from "./components/TelemetryPanel";
import AlertsBanner from "./components/AlertsBanner";
import MissionControl from "./components/MissionControl";
import BottomPanels from "./components/BottomPanels";

<<<<<<< HEAD
=======

>>>>>>> e06eb8d349f42445b552363386a7dc1eeb96157c
export default function App() {

  const sounds = {
    emergency: new Audio("/sounds/siren.mp3"),
    target: new Audio("/sounds/targetlock.mp3"),
    warning: new Audio("/sounds/warning.mp3"),
  };

  const [persons, setPersons] = useState([]);
  const [alert, setAlert] = useState("NORMAL");
  const [audioEnabled, setAudioEnabled] = useState(false);
<<<<<<< HEAD
  const [logs, setLogs] = useState([
    "[SYSTEM] Boot sequence initiated...",
    "[AI] Awaiting commands..."
  ]);
=======
>>>>>>> e06eb8d349f42445b552363386a7dc1eeb96157c

  const enableAudio = () => {
    Object.values(sounds).forEach((s) => {
      s.volume = 0.3;
      s.play().then(() => s.pause()).catch(() => {});
    });
    setAudioEnabled(true);
  };

  useEffect(() => {
    const interval = setInterval(() => {
<<<<<<< HEAD

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

=======
      setPersons([
        {
          id: "P-001",
          status: Math.random() > 0.5 ? "Standing" : "Injured",
          score: Math.floor(Math.random() * 150),
        },
      ]);

        const [logs, setLogs] = useState([
       "[SYSTEM] Boot sequence initiated...",
        "[AI] Awaiting commands..."
      ]);
      setLogs((prev) => [
  ...prev,
  "[AI] Hazard scan complete...",
]);
setLogs((prev) => [
  ...prev.slice(-5), // keep last 5 logs only
  "[AI] New update received..."
]);

>>>>>>> e06eb8d349f42445b552363386a7dc1eeb96157c
      const states = ["NORMAL", "WARNING", "EMERGENCY"];
      const random = states[Math.floor(Math.random() * 3)];
      setAlert(random);

      if (audioEnabled) {
<<<<<<< HEAD
        if (random === "EMERGENCY") {
          sounds.emergency.loop = true;
          sounds.emergency.play();
        }
        if (random === "WARNING") {
          sounds.warning.play();
        }
      }

=======
        if (random === "EMERGENCY") sounds.emergency.play();
        if (random === "WARNING") sounds.warning.play();
      }
>>>>>>> e06eb8d349f42445b552363386a7dc1eeb96157c
    }, 5000);

    return () => clearInterval(interval);
  }, [audioEnabled]);

<<<<<<< HEAD
 return (
  <div className="app">

    <div className="header">
      🚁 GUARDIAN EYE — EDGE COMMAND DECK
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
      </div>

    </div>

    {/* ✅ SIMPLE BOTTOM TEST */}
    <div className="bottom-grid">

  <div className="panel vip">
    <h3>VIP TRACKER</h3>
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
=======
  return (
    <div className="app">

      {!audioEnabled && (
        <button onClick={enableAudio}>🔊 Enable Audio</button>
      )}

      <div className="header">
        🚁 GUARDIAN EYE - EDGE COMMAND DECK
      </div>

      <AlertsBanner alert={alert} />

      <div className="top-section">
        <VLMControls />
        <VideoPlayer />
        <RadarPanel />
      </div>

      <TelemetryPanel persons={persons} />

      <AITerminal />
      <MissionControl />
      <BottomPanels />
      <AITerminal logs={logs} />

    </div>
  );
>>>>>>> e06eb8d349f42445b552363386a7dc1eeb96157c
}
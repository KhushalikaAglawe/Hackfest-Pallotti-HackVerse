import { useState, useRef } from "react";

export default function VideoPlayer() {
  const [videoURL, setVideoURL] = useState(null);
  const [streamURL, setStreamURL] = useState(null);
  const [mode, setMode] = useState("RGB"); // RGB | THERMAL
  const videoRef = useRef(null);

  const handleConnect = (e) => {
    e.preventDefault();
    setVideoURL(null);
    setStreamURL("http://127.0.0.1:8000/api/stream/webcam"); 
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setStreamURL(null);
      setVideoURL(URL.createObjectURL(file));
    }
  };

  const thermalStyle = mode === "THERMAL" 
    ? { filter: "contrast(200%) saturate(300%) hue-rotate(180deg) brightness(0.9)" } 
    : {};

  return (
    <div className="panel">
      <div className="panel-title">TACTICAL VIDEO</div>
      
      {/* 🔘 TOGGLE GROUP */}
      <div style={{ display: "flex", gap: "5px", marginBottom: "10px" }}>
        <button className="btn green" onClick={handleConnect}>📡 CONNECT</button>
        
        <button className={`btn ${mode === "RGB" ? "green" : "blue"}`} onClick={() => setMode("RGB")}>
          RGB
        </button>
        
        <button className={`btn ${mode === "THERMAL" ? "orange" : "blue"}`} onClick={() => setMode("THERMAL")}>
          THERMAL
        </button>

        <label className="btn blue" style={{ cursor: 'pointer', flex: 1, textAlign: 'center' }}>
          📁 UPLOAD
          <input type="file" accept="video/*" onChange={handleUpload} style={{ display: 'none' }} />
        </label>
      </div>

      <div style={{ height: "320px", background: "#000", border: "1px solid #00ff00", position: "relative", display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {streamURL ? (
          <img src={streamURL} alt="Live" style={{ width: '100%', height: '100%', objectFit: 'cover', ...thermalStyle }} />
        ) : videoURL ? (
          <video src={videoURL} controls autoPlay width="100%" style={thermalStyle} />
        ) : (
          <div style={{ color: "#00ff00" }}>[ NO SIGNAL ]</div>
        )}
      </div>
    </div>
  );
}
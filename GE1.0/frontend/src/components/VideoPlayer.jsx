import { useState, useRef, useEffect } from "react";

export default function VideoPlayer() {
  const [videoURL, setVideoURL] = useState(null);
  const [isWebcam, setIsWebcam] = useState(false);
  const [mode, setMode] = useState("RGB"); 
  const [streamURL, setStreamURL] = useState(null); 

  const videoRef = useRef(null);

  const startWebcam = async () => {
    setIsWebcam(true);
    setVideoURL(null);
    setStreamURL(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { console.log("Webcam error:", err); }
  };

  const handleConnect = () => {
    setIsWebcam(false);
    setVideoURL(null);
    // ✅ CONNECTING TO BACKEND WEBCAM
    setStreamURL("http://localhost:8000/webcam"); 
  };

  const thermalStyle = mode === "THERMAL" 
    ? { filter: "contrast(200%) saturate(300%) hue-rotate(180deg) brightness(0.8)" } 
    : {};

  return (
    <div className="panel">
      <div className="panel-title">TACTICAL VIDEO FEED</div>

      <div style={{ display: "flex", gap: "5px", marginBottom: "10px" }}>
        <button className="btn green" onClick={handleConnect}>📡 CONNECT STREAM</button>
        <button className={`btn ${mode === "RGB" ? "green" : ""}`} onClick={() => setMode("RGB")}>RGB</button>
        <button className={`btn ${mode === "THERMAL" ? "orange" : ""}`} onClick={() => setMode("THERMAL")}>THERMAL</button>
        <button className="btn blue" onClick={startWebcam}>LOCAL WEBCAM</button>
      </div>

      <div style={{ height: "320px", background: "#000", border: "1px solid #00ff00", position: "relative", overflow: "hidden" }}>
        {isWebcam ? (
          <video ref={videoRef} autoPlay playsInline width="100%" style={thermalStyle} />
        ) : videoURL ? (
          <video src={videoURL} controls autoPlay width="100%" style={thermalStyle} />
        ) : streamURL ? (
          <img src={streamURL} alt="live" width="100%" style={thermalStyle} onError={() => setStreamURL(null)} />
        ) : (
          <div style={{ color: "#00ff00", textAlign: "center", marginTop: "140px" }}>[ NO SIGNAL ]</div>
        )}
        
        { (isWebcam || streamURL) && <div className="live-tag">● LIVE</div> }
      </div>
    </div>
  );
}
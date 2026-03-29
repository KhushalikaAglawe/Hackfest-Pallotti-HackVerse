import { useState, useRef } from "react";

export default function VideoPlayer() {
  const [streamURL, setStreamURL] = useState(null);
  const [videoURL, setVideoURL] = useState(null);
  const [ipAddress, setIpAddress] = useState("http://192.168.1.100:8080/video"); // Default example

  const handleConnectWebcam = async () => {
    // Switch backend to local webcam
    const formData = new FormData();
    formData.append("source", "0");

    await fetch("http://127.0.0.1:8000/api/stream/source", { 
      method: "POST", 
      body: formData 
    });
    setVideoURL(null);
    setStreamURL(`http://127.0.0.1:8000/api/stream/webcam?t=${Date.now()}`);
  };

  const handleConnectDrone = async () => {
    if (!ipAddress) return alert("Enter Drone IP first!");
    
    // Ensure the URL is complete
    let fullUrl = ipAddress;
    if (!fullUrl.startsWith('http')) fullUrl = 'http://' + fullUrl;
    if (!fullUrl.endsWith('/video')) fullUrl = fullUrl + '/video';

    const formData = new FormData();
    formData.append("source", fullUrl);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/stream/source", {
        method: "POST",
        body: formData, // Sending as Form Data like your stream.py wants
      });
      
      if (response.ok) {
        setVideoURL(null);
        // Force refresh the <img> tag by adding a timestamp
        setStreamURL(`http://127.0.0.1:8000/api/stream/webcam?t=${Date.now()}`);
      }
    } catch (e) {
      console.error("Connection failed", e);
    }
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setStreamURL(null);
      setVideoURL(URL.createObjectURL(file));
    }
  };

  return (
    <div className="panel">
      <div className="panel-title">TACTICAL OPTICS</div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "15px" }}>
        {/* WEBCAM BUTTON */}
        <button className="btn green" onClick={handleConnectWebcam} style={{ width: '100%' }}>
          📷 ACTIVATE PRIMARY PC WEBCAM
        </button>

        {/* DRONE IP INPUT ROW */}
        <div style={{ display: "flex", gap: "5px", height: "35px" }}>
          <input 
            type="text" 
            placeholder="IP ADDRESS (e.g. 100.76.202.117:8080/video)" 
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            style={{ 
              flex: 3, 
              background: "#000", 
              color: "#0f0", 
              border: "1px solid #0f0", 
              padding: "0 10px",
              fontFamily: "monospace",
              fontSize: "12px",
              outline: "none"
            }}
          />
          <button className="btn blue" onClick={handleConnectDrone} style={{ flex: 1 }}>
            🛸 CONNECT
          </button>
        </div>

        {/* UPLOAD BUTTON */}
        <label className="btn" style={{ cursor: 'pointer', textAlign: 'center', background: '#222', border: '1px solid #444', color: '#888' }}>
          📁 UPLOAD OFFLINE FOOTAGE
          <input type="file" accept="video/*" onChange={handleUpload} style={{ display: 'none' }} />
        </label>
      </div>

      <div className="video-viewport" style={{ height: "320px", background: "#000", border: "1px solid #00ff00", position: "relative", display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {streamURL ? (
          <img src={streamURL} alt="Live" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : videoURL ? (
          <video src={videoURL} controls autoPlay loop width="100%" height="100%" style={{ objectFit: 'contain' }} />
        ) : (
          <div style={{ color: "#0f0" }}>[ NO SIGNAL ]</div>
        )}
      </div>
    </div>
  );
}
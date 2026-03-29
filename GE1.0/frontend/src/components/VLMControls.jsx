import React, { useState } from 'react';

// Notice we added setTelemetry here as a prop!
export default function VLMControls({ setTelemetry }) {
  const [topColor, setTopColor] = useState("");
  const [bottomColor, setBottomColor] = useState("");

  const handleScanHazards = async () => {
    setTelemetry(prev => ({ ...prev, hazard: "Scanning area with Moondream..." }));
    try {
      const res = await fetch("http://127.0.0.1:8000/api/stream/vlm/hazard", { method: "POST" });
      const data = await res.json();
      setTelemetry(prev => ({ ...prev, hazard: data.response || "Scan complete." }));
    } catch (e) { setTelemetry(prev => ({ ...prev, hazard: "Scan failed." })); }
  };

  const handleTriage = async () => {
    setTelemetry(prev => ({ ...prev, triage: "Analyzing vitals via VLM..." }));
    try {
      const formData = new FormData(); 
      formData.append("person_id", "P-0001"); // You can make this dynamic later
      const res = await fetch("http://127.0.0.1:8000/api/stream/vlm/triage", { method: "POST", body: formData });
      const data = await res.json();
      setTelemetry(prev => ({ ...prev, triage: data.response || "Triage complete." }));
    } catch (e) { setTelemetry(prev => ({ ...prev, triage: "Triage failed." })); }
  };

  const handleHuntVIP = async () => {
    setTelemetry(prev => ({ ...prev, vip: "Locking LLAMA text search..." }));
    try {
      const formData = new FormData();
      formData.append("top_color", topColor);
      formData.append("bottom_color", bottomColor);
      const res = await fetch("http://127.0.0.1:8000/api/stream/vlm/vip", { method: "POST", body: formData });
      const data = await res.json();
      setTelemetry(prev => ({ ...prev, vip: data.status || "VIP Search Active." }));
    } catch (e) { setTelemetry(prev => ({ ...prev, vip: "VIP Search failed." })); }
  };

  const handleAutoExtract = async () => {
    setTelemetry(prev => ({ ...prev, vip: "Engaging K-Means Auto-Extract..." }));
    try {
      const res = await fetch("http://127.0.0.1:8000/api/stream/vlm/kmeans_lock", { method: "POST" });
      const data = await res.json();
      setTelemetry(prev => ({ ...prev, vip: data.status || "K-Means Locked." }));
    } catch (e) { setTelemetry(prev => ({ ...prev, vip: "K-Means failed." })); }
  };

  return (
    <div className="panel" style={{ height: '100%', borderColor: '#0f0' }}>
      <div className="panel-title" style={{ color: '#0f0' }}>AI CONTROLS</div>
      
      <button className="btn blue" style={{ width: '100%', marginBottom: '10px' }} onClick={handleScanHazards}>SCAN HAZARDS</button>
      <button className="btn orange" style={{ width: '100%', marginBottom: '20px' }} onClick={handleTriage}>TRIAGE VICTIM</button>

      <div style={{ borderTop: '1px solid #333', paddingTop: '10px' }}>
        <input type="text" placeholder="Shirt Color" style={{ width: '100%', marginBottom: '5px', background: '#111', color: 'white', border: '1px solid #333', padding: '5px' }} onChange={e => setTopColor(e.target.value)} />
        <input type="text" placeholder="Pants Color" style={{ width: '100%', marginBottom: '10px', background: '#111', color: 'white', border: '1px solid #333', padding: '5px' }} onChange={e => setBottomColor(e.target.value)} />
        
        <button className="btn" style={{ width: '100%', background: '#cc00ff', color: 'white', marginBottom: '10px' }} onClick={handleHuntVIP}>HUNT VIP</button>
        <button className="btn" style={{ width: '100%', background: '#ff00ff', color: 'white', marginBottom: '10px' }} onClick={handleAutoExtract}>🎯 AUTO-EXTRACT (K-MEANS)</button>
        <button className="btn red" style={{ width: '100%' }}>CLEAR TARGET</button>
      </div>
    </div>
  );
}
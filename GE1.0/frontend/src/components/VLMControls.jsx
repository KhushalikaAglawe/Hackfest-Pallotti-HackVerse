import React, { useState } from 'react';

export default function VLMControls() {
  const [hazardData, setHazardData] = useState(null);
  const [triageData, setTriageData] = useState(null);

  // Simulation: Real app mein ye backend API (/api/analyze) se aayega
  const handleScan = () => {
    setHazardData({ type: "FIRE / SMOKE", risk: "HIGH", location: "Sector 4" });
  };

  const handleTriage = () => {
    setTriageData({ status: "CRITICAL", pulse: "110 bpm", oxygen: "92%" });
  };

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div className="panel-title">AI CONTROLS</div>
      
      {/* BUTTONS SECTION */}
      <button className="btn blue" onClick={handleScan}>SCAN HAZARDS</button>
      <button className="btn orange" onClick={handleTriage}>TRIAGE VICTIM</button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '5px' }}>
        <input type="text" placeholder="Shirt Color" className="terminal-input" />
        <input type="text" placeholder="Pants Color" className="terminal-input" />
      </div>

      <button className="btn purple">HUNT VIP</button>
      <button className="btn red">CLEAR TARGET</button>

      {/* --- NEW DATA SECTIONS --- */}
      <hr style={{ border: '0.5px solid #333', margin: '10px 0' }} />
      
      {/* Hazard Result Area */}
      <div className="data-box" style={{ border: '1px solid #00ffff33', padding: '8px', fontSize: '11px' }}>
        <div style={{ color: '#00ffff', marginBottom: '5px', fontSize: '10px' }}>⚠️ HAZARD TELEMETRY</div>
        {hazardData ? (
          <div>
            <div>TYPE: <span style={{ color: 'red' }}>{hazardData.type}</span></div>
            <div>RISK: {hazardData.risk}</div>
          </div>
        ) : <div style={{ opacity: 0.5 }}>NO HAZARDS DETECTED</div>}
      </div>

      {/* Triage Result Area */}
      <div className="data-box" style={{ border: '1px solid #ffa50033', padding: '8px', fontSize: '11px', marginTop: '5px' }}>
        <div style={{ color: '#ffa500', marginBottom: '5px', fontSize: '10px' }}>⚕️ TRIAGE DATA</div>
        {triageData ? (
          <div>
            <div>STATUS: <span style={{ color: triageData.status === 'CRITICAL' ? 'red' : 'green' }}>{triageData.status}</span></div>
            <div>VITALS: {triageData.pulse} | O2: {triageData.oxygen}</div>
          </div>
        ) : <div style={{ opacity: 0.5 }}>AWAITING VICTIM SCAN...</div>}
      </div>
    </div>
  );
}
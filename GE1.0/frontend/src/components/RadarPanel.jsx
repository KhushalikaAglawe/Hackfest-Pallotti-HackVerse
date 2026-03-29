import React from 'react';

export default function RadarPanel({ persons = [] }) {
  // North East Sector Coordinates (Reference for UI)
  const sectorInfo = {
    lat: "27.58°N",
    lon: "91.86°E",
    name: "ARUNACHAL-WEST"
  };

  return (
    <div className="panel" style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <div className="panel-title">📡 TACTICAL RADAR: {sectorInfo.name}</div>
      
      <div className="radar-container" style={{ 
        width: '210px', height: '210px', borderRadius: '50%', 
        border: '1px solid #00ff9c44', margin: '20px auto',
        position: 'relative', background: 'radial-gradient(circle, #002211 0%, #000 80%)',
        boxShadow: 'inset 0 0 15px #00ff9c22'
      }}>
        
        {/* Radar Sweep Animation Line */}
        <div className="radar-sweep" style={{
          position: 'absolute', width: '50%', height: '2px',
          background: 'linear-gradient(to right, transparent, #00ff9c)',
          top: '50%', left: '50%', transformOrigin: 'left center',
          animation: 'radar-spin 4s linear infinite',
          zIndex: 2
        }}></div>

        {/* 🔴 DYNAMIC RADAR DOTS (Mapped to your rel_x / rel_y) */}
        {persons.map((person, index) => {
          let dotColor = '#00ff9c'; // Default Green (Safe)
          if (person.triage_score > 40 || person.status?.includes('INJURED')) dotColor = '#ff3333'; // Red
          if (person.is_vip || person.color_match) dotColor = '#cc00ff'; // Violet VIP

          // Your backend sends rel_x and rel_y ranging from roughly -1 to +1.
          // We multiply by 45 to keep the dots inside the 50% radius radar circle.
          let posX = (person.rel_x || 0) * 45; 
          let posY = (person.rel_y || 0) * -45; // Invert Y so top is up

          return (
          <div key={index} style={{
            position: 'absolute',
            width: '8px', height: '8px',
            backgroundColor: dotColor,
            borderRadius: '50%',
            boxShadow: `0 0 12px ${dotColor}`,
            left: `calc(50% + ${posX}%)`, 
            top: `calc(50% + ${posY}%)`,
            zIndex: 3,
            transition: 'all 0.4s ease-out'
          }}>
            <span style={{ position: 'absolute', top: '-12px', left: '8px', fontSize: '8px', color: dotColor, fontWeight: 'bold' }}>
              T-{person.id || person.person_id || index + 1}
            </span>
          </div>
          )
        })}

        {/* Static Background Rings */}
        {[25, 50, 75].map(ring => (
          <div key={ring} style={{
            position: 'absolute', inset: `${(100 - ring) / 2}%`,
            border: '1px solid #00ff9c11', borderRadius: '50%'
          }}></div>
        ))}
        
        {/* Radar Axis Crosshair */}
        <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: '1px', background: '#00ff9c11' }}></div>
        <div style={{ position: 'absolute', left: '50%', top: 0, width: '1px', height: '100%', background: '#00ff9c11' }}></div>
      </div>

      {/* Sector Stats & Coordinates Overlay */}
      <div style={{ padding: '0 15px', fontSize: '10px', fontFamily: 'monospace', color: '#00ff9c', opacity: 0.7 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>LAT: {sectorInfo.lat}</span>
          <span>LON: {sectorInfo.lon}</span>
        </div>
        <div style={{ borderTop: '1px solid #00ff9c22', paddingTop: '4px', textAlign: 'center' }}>
          ACTIVE TARGETS: <span style={{ color: persons.length > 0 ? '#ff3333' : '#00ff9c' }}>{persons.length}</span>
        </div>
      </div>

      {/* Internal CSS for the spinning effect */}
      <style>{`
        @keyframes radar-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
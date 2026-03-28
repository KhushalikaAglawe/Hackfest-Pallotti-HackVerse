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

        {/* 🔴 DYNAMIC RADAR DOTS (Mapped from Backend Data) */}
        {persons.map((person, index) => (
          <div key={index} style={{
            position: 'absolute',
            width: '8px', height: '8px',
            backgroundColor: '#ff3333',
            borderRadius: '50%',
            boxShadow: '0 0 12px #ff3333',
            // Coordinate mapping: backend x/y (-50 to 50) mapped to circle percentage
            left: `${50 + (person.x || 0)}%`, 
            top: `${50 + (person.y || 0)}%`,
            zIndex: 3,
            transition: 'all 0.4s ease-in-out'
          }}>
            <span style={{ 
              position: 'absolute', top: '-12px', left: '8px', 
              fontSize: '8px', color: '#ff3333', whiteSpace: 'nowrap',
              fontFamily: 'monospace', fontWeight: 'bold'
            }}>
              TRGT-{index + 1}
            </span>
          </div>
        ))}

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
import React, { useEffect, useRef } from 'react';

export default function AITerminal({ logs }) {
  const scrollRef = useRef(null);

  // Auto-scroll logic: Jab bhi database se naya log aaye, niche scroll ho jaye
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!logs || !Array.isArray(logs)) {
    return (
      <div className="panel" style={{ borderColor: '#00ff9c', height: '180px' }}>
        <div className="panel-title" style={{ color: '#00ff9c', fontSize: '10px' }}>📟 MISSION TIMELINE</div>
        <p style={{ color: '#444', fontSize: '10px', padding: '10px' }}>No logs available...</p>
      </div>
    );
  }

  return (
    <div className="panel" style={{ 
      borderColor: '#00ff9c', 
      height: '180px', // Dashboard space ke hisaab se fixed height
      display: 'flex', 
      flexDirection: 'column',
      padding: '0',
      background: '#000'
    }}>
      <div className="panel-title" style={{ 
        color: '#00ff9c', 
        fontSize: '10px', 
        padding: '5px 10px',
        borderBottom: '1px solid #111' 
      }}>
        📟 MISSION TIMELINE (LIVE FEED)
      </div>

      {/* 📜 Scrollable Log Area */}
      <div 
        ref={scrollRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '10px', 
          fontFamily: 'monospace', 
          fontSize: '11px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#00ff9c #000'
        }}
      >
        {logs.map((log, i) => (
          <div key={i} style={{ 
            marginBottom: '4px',
            color: log.includes('[ALERT]') ? '#ff3333' : (log.includes('[USER') ? '#ffaa00' : '#00ff9c'),
            lineHeight: '1.4',
            borderLeft: '2px solid #111',
            paddingLeft: '8px'
          }}>
            <span style={{ opacity: 0.3 }}>[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}]</span> {log}
          </div>
        ))}
      </div>
    </div>
  );
}
<<<<<<< HEAD
export default function AITerminal({ logs }) {

  // 🛑 Safety check (prevents crash)
  if (!logs || !Array.isArray(logs)) {
    return (
      <div className="terminal">
        <h3>MISSION TIMELINE</h3>
        <p>No logs available...</p>
      </div>
    );
  }

  return (
    <div className="terminal">
      <h3>MISSION TIMELINE</h3>

      <div className="terminal-box">
        {logs.map((log, i) => (
          <p key={i}>{log}</p>
        ))}
      </div>

=======
import { useEffect, useRef } from "react";
import TypeWriter from "react-typewriter-effect";

export default function AITerminal({ logs = [] }) {
  const terminalRef = useRef();

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="panel">
      <div className="panel-title">AI TERMINAL</div>

      <div className="terminal" ref={terminalRef}>
        {logs.map((log, i) => (
          <div key={i}>
            <TypeWriter text={log} typeSpeed={30} />
          </div>
        ))}
      </div>
>>>>>>> e06eb8d349f42445b552363386a7dc1eeb96157c
    </div>
  );
}
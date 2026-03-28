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

    </div>
  );
}
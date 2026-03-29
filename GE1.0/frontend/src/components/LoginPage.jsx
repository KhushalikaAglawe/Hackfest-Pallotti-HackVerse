import React, { useState } from "react";

export default function LoginPage({ onLogin }) {
  const [role, setRole] = useState("user");
  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(role, { name: "Test User" });
  };

  return (
    <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#050505", color: "white", fontFamily: "monospace" }}>
      <div style={{ padding: "40px", background: "#111", border: "1px solid #333", textAlign: "center", width: "350px" }}>
        <h2 style={{ color: "#00ff9c" }}>🛡️ GUARDIAN GATEWAY</h2>
        <div style={{ margin: "20px 0", display: "flex", justifyContent: "space-between" }}>
          <button onClick={() => setRole("user")} style={{ background: "none", color: role === "user" ? "#00ff9c" : "#666", border: "none", cursor: "pointer" }}>CIVILIAN</button>
          <button onClick={() => setRole("admin")} style={{ background: "none", color: role === "admin" ? "#ff3333" : "#666", border: "none", cursor: "pointer" }}>ADMIN</button>
        </div>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Username/ID" style={{ width: "100%", padding: "10px", marginBottom: "10px", background: "#222", border: "1px solid #444", color: "white" }} required />
          <button type="submit" style={{ width: "100%", padding: "12px", background: role === "admin" ? "#ff3333" : "#00ff9c", border: "none", fontWeight: "bold", cursor: "pointer" }}>
            LOGIN AS {role.toUpperCase()}
          </button>
        </form>
      </div>
    </div>
  );
}
import { useState, useRef, useEffect } from "react";

export default function VideoPlayer() {
  const [source, setSource] = useState("");
  const [videoURL, setVideoURL] = useState(null);
  const [isWebcam, setIsWebcam] = useState(false);
  const [mode, setMode] = useState("RGB"); // RGB | THERMAL
  const [streamURL, setStreamURL] = useState(null); // ✅ backend stream

  const videoRef = useRef(null);

  // 🎥 Start Webcam
  const startWebcam = async () => {
    setIsWebcam(true);
    setVideoURL(null);
    setStreamURL(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
    } catch (err) {
      console.log("Webcam error:", err);
    }
  };

  // 📁 Handle Upload
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsWebcam(false);
      setStreamURL(null);
      setVideoURL(URL.createObjectURL(file));
    }
  };

  // 📡 CONNECT BACKEND STREAM
  const handleConnect = () => {
    setIsWebcam(false);
    setVideoURL(null);

    // 👉 backend stream endpoint
    setStreamURL("http://127.0.0.1:8000/api/stream");
  };

  // 🧹 Cleanup webcam on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 🎨 Thermal Filter
  const thermalStyle =
    mode === "THERMAL"
      ? {
          filter: "contrast(200%) saturate(300%) hue-rotate(180deg)",
        }
      : {};

  return (
    <div className="panel">
      <div className="panel-title">TACTICAL VIDEO</div>

      {/* 🔌 INPUT SOURCE */}
      <input
        value={source}
        onChange={(e) => setSource(e.target.value)}
        placeholder="0 or IP stream"
      />

      {/* 🔗 CONNECT BUTTON */}
      <button className="btn green" onClick={handleConnect}>
        CONNECT
      </button>

      {/* 🎛️ RGB / THERMAL */}
      <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
        <button
          className={`btn ${mode === "RGB" ? "green" : ""}`}
          onClick={() => setMode("RGB")}
        >
          RGB
        </button>

        <button
          className={`btn ${mode === "THERMAL" ? "orange" : ""}`}
          onClick={() => setMode("THERMAL")}
        >
          THERMAL
        </button>
      </div>

      {/* 🎥 CONTROLS */}
      <button className="btn blue" onClick={startWebcam}>
        🎥 USE WEBCAM
      </button>

      <input
        type="file"
        accept="video/*"
        onChange={handleUpload}
        style={{ marginTop: "5px" }}
      />

      {/* 📺 VIDEO DISPLAY */}
      <div
        style={{
          height: "300px",
          border: "1px solid #00ff00",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "5px",
        }}
      >
        {isWebcam ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            width="100%"
            style={thermalStyle}
          />
        ) : videoURL ? (
          <video
            src={videoURL}
            controls
            autoPlay
            width="100%"
            style={thermalStyle}
          />
        ) : streamURL ? (
          <img
            src={streamURL}
            alt="live stream"
            width="100%"
            style={thermalStyle}
          />
        ) : (
          "VIDEO FEED"
        )}
      </div>
    </div>
  );
} 
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadVideo, submitYouTubeUrl, getPitStopStatus } from "../services/api";
import ProgressBar from "../components/ProgressBar";

type Tab = "file" | "youtube";
type Phase = "idle" | "uploading" | "downloading" | "processing" | "done" | "error";

export default function UploadPage() {
  const [tab, setTab] = useState<Tab>("file");
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [processingPct, setProcessingPct] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [pitStopId, setPitStopId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["mp4", "avi", "mov", "mkv", "webm"].includes(ext || "")) {
      setErrorMsg("Unsupported file type. Use mp4, avi, mov, mkv, or webm.");
      return;
    }
    setFile(f);
    setErrorMsg("");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const pollProcessing = async (id: number) => {
    const poll = async () => {
      try {
        const status = await getPitStopStatus(id);
        if (status.status === "downloading") {
          setPhase("downloading");
          setTimeout(poll, 2000);
          return;
        }
        setPhase("processing");
        setProcessingPct(status.progress_pct);
        if (status.status === "completed") {
          setPhase("done");
          return;
        }
        if (status.status === "failed") {
          setPhase("error");
          setErrorMsg("Processing failed.");
          return;
        }
        setTimeout(poll, 1500);
      } catch {
        setTimeout(poll, 3000);
      }
    };
    poll();
  };

  const handleUpload = async () => {
    if (!file) return;
    setPhase("uploading");
    setUploadPct(0);
    try {
      const res = await uploadVideo(file, setUploadPct);
      setPitStopId(res.id);
      setPhase("processing");
      setProcessingPct(0);
      pollProcessing(res.id);
    } catch (err: any) {
      setPhase("error");
      setErrorMsg(err?.response?.data?.detail || "Upload failed.");
    }
  };

  const handleYouTube = async () => {
    const url = youtubeUrl.trim();
    if (!url) return;
    if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
      setErrorMsg("Please enter a valid YouTube URL.");
      return;
    }
    setPhase("downloading");
    setErrorMsg("");
    try {
      const res = await submitYouTubeUrl(url);
      setPitStopId(res.id);
      pollProcessing(res.id);
    } catch (err: any) {
      setPhase("error");
      setErrorMsg(err?.response?.data?.detail || "Failed to submit YouTube URL.");
    }
  };

  const reset = () => {
    setPhase("idle");
    setFile(null);
    setYoutubeUrl("");
    setErrorMsg("");
    setUploadPct(0);
    setProcessingPct(0);
    setPitStopId(null);
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h1>Analyze Pit Stop Video</h1>

      {/* Tabs - only show in idle state */}
      {phase === "idle" && (
        <>
          <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
            <button
              onClick={() => { setTab("file"); setErrorMsg(""); }}
              style={{
                ...tabStyle,
                backgroundColor: tab === "file" ? "#3b82f6" : "#e5e7eb",
                color: tab === "file" ? "#fff" : "#555",
                borderRadius: "8px 0 0 8px",
              }}
            >
              Upload File
            </button>
            <button
              onClick={() => { setTab("youtube"); setErrorMsg(""); }}
              style={{
                ...tabStyle,
                backgroundColor: tab === "youtube" ? "#3b82f6" : "#e5e7eb",
                color: tab === "youtube" ? "#fff" : "#555",
                borderRadius: "0 8px 8px 0",
              }}
            >
              YouTube URL
            </button>
          </div>

          {/* File upload tab */}
          {tab === "file" && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? "#3b82f6" : "#d1d5db"}`,
                  borderRadius: 12,
                  padding: 40,
                  textAlign: "center",
                  cursor: "pointer",
                  backgroundColor: dragOver ? "#eff6ff" : "#f9fafb",
                  transition: "all 0.2s",
                }}
              >
                <p style={{ fontSize: 16, color: "#555" }}>
                  {file ? file.name : "Drag & drop a video file here, or click to browse"}
                </p>
                {file && (
                  <p style={{ fontSize: 13, color: "#888" }}>
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept=".mp4,.avi,.mov,.mkv,.webm"
                  style={{ display: "none" }}
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
              {file && (
                <button onClick={handleUpload} style={{ ...btnStyle, marginTop: 16, width: "100%" }}>
                  Upload & Analyze
                </button>
              )}
            </>
          )}

          {/* YouTube URL tab */}
          {tab === "youtube" && (
            <div>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => { setYoutubeUrl(e.target.value); setErrorMsg(""); }}
                placeholder="https://www.youtube.com/watch?v=..."
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: 15,
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onKeyDown={(e) => e.key === "Enter" && handleYouTube()}
              />
              <button
                onClick={handleYouTube}
                disabled={!youtubeUrl.trim()}
                style={{
                  ...btnStyle,
                  marginTop: 16,
                  width: "100%",
                  opacity: youtubeUrl.trim() ? 1 : 0.5,
                }}
              >
                Download & Analyze
              </button>
            </div>
          )}

          {errorMsg && (
            <p style={{ color: "#ef4444", marginTop: 12, fontSize: 14 }}>{errorMsg}</p>
          )}
        </>
      )}

      {/* Uploading (file) */}
      {phase === "uploading" && (
        <div style={{ marginTop: 24 }}>
          <ProgressBar value={uploadPct} label="Uploading video..." />
        </div>
      )}

      {/* Downloading (YouTube) */}
      {phase === "downloading" && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 14, color: "#5b21b6", marginBottom: 8, fontWeight: 600 }}>
            Downloading from YouTube...
          </div>
          <div style={{
            width: "100%",
            height: 20,
            backgroundColor: "#e5e7eb",
            borderRadius: 10,
            overflow: "hidden",
          }}>
            <div style={{
              width: "100%",
              height: "100%",
              borderRadius: 10,
              background: "linear-gradient(90deg, #8b5cf6 25%, #a78bfa 50%, #8b5cf6 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite linear",
            }} />
          </div>
          <style>{`@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }`}</style>
        </div>
      )}

      {/* Processing (YOLO) */}
      {phase === "processing" && (
        <div style={{ marginTop: 24 }}>
          <ProgressBar value={100} label={tab === "youtube" ? "Download complete" : "Upload complete"} />
          <div style={{ marginTop: 16 }}>
            <ProgressBar value={processingPct} label="Analyzing frames with YOLO..." />
          </div>
        </div>
      )}

      {/* Done */}
      {phase === "done" && pitStopId && (
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <ProgressBar value={100} label={tab === "youtube" ? "Download complete" : "Upload complete"} />
          <div style={{ marginTop: 16 }}>
            <ProgressBar value={100} label="Analysis complete!" />
          </div>
          <button
            onClick={() => navigate(`/analysis/${pitStopId}`)}
            style={{ ...btnStyle, marginTop: 24 }}
          >
            View Results
          </button>
        </div>
      )}

      {/* Error */}
      {phase === "error" && (
        <div style={{ marginTop: 24, color: "#ef4444", textAlign: "center" }}>
          <p>{errorMsg}</p>
          <button onClick={reset} style={btnStyle}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 24px",
  backgroundColor: "#3b82f6",
  color: "#fff",
  borderRadius: 8,
  border: "none",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
};

const tabStyle: React.CSSProperties = {
  flex: 1,
  padding: "10px 16px",
  border: "none",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

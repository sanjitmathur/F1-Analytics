import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { PitStop } from "../types";
import {
  listPitStops,
  deletePitStop,
  submitYouTubeUrl,
  uploadVideo,
  getPitStopStatus,
} from "../services/api";
import StatusBadge from "../components/StatusBadge";
import ProgressBar from "../components/ProgressBar";

type UploadTab = "youtube" | "file";
type Phase = "idle" | "uploading" | "downloading" | "processing" | "done" | "error";

export default function DashboardPage() {
  const [pitStops, setPitStops] = useState<PitStop[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTab, setUploadTab] = useState<UploadTab>("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadPct, setUploadPct] = useState(0);
  const [processingPct, setProcessingPct] = useState(0);
  const [pitStopId, setPitStopId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const data = await listPitStops();
      setPitStops(data);
    } catch (err) {
      console.error("Failed to fetch pit stops", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this pit stop and its data?")) return;
    try {
      await deletePitStop(id);
      setPitStops((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  // --- Upload logic ---

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
          fetchData();
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
    } catch (err: unknown) {
      setPhase("error");
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setErrorMsg(axiosErr?.response?.data?.detail || "Upload failed.");
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
    } catch (err: unknown) {
      setPhase("error");
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setErrorMsg(axiosErr?.response?.data?.detail || "Failed to submit YouTube URL.");
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
    setShowUpload(false);
  };

  const hasPitStops = !loading && pitStops.length > 0;

  const uploadPanel = (
    <div style={{
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 20,
      backgroundColor: "#f9fafb",
      maxWidth: 500,
      width: "100%",
    }}>
      {phase === "idle" && (
        <>
          <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
            <button
              onClick={() => { setUploadTab("youtube"); setErrorMsg(""); }}
              style={{
                ...tabStyle,
                backgroundColor: uploadTab === "youtube" ? "#3b82f6" : "#e5e7eb",
                color: uploadTab === "youtube" ? "#fff" : "#555",
                borderRadius: "8px 0 0 8px",
              }}
            >
              YouTube Link
            </button>
            <button
              onClick={() => { setUploadTab("file"); setErrorMsg(""); }}
              style={{
                ...tabStyle,
                backgroundColor: uploadTab === "file" ? "#3b82f6" : "#e5e7eb",
                color: uploadTab === "file" ? "#fff" : "#555",
                borderRadius: "0 8px 8px 0",
              }}
            >
              From Device
            </button>
          </div>

          {uploadTab === "youtube" && (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => { setYoutubeUrl(e.target.value); setErrorMsg(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleYouTube()}
                placeholder="https://www.youtube.com/watch?v=..."
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  fontSize: 14,
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: "#fff",
                }}
              />
              <button
                onClick={handleYouTube}
                disabled={!youtubeUrl.trim()}
                style={{
                  ...btnStyle,
                  opacity: youtubeUrl.trim() ? 1 : 0.5,
                  cursor: youtubeUrl.trim() ? "pointer" : "default",
                }}
              >
                Analyze
              </button>
            </div>
          )}

          {uploadTab === "file" && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? "#3b82f6" : "#d1d5db"}`,
                  borderRadius: 10,
                  padding: 28,
                  textAlign: "center",
                  cursor: "pointer",
                  backgroundColor: dragOver ? "#eff6ff" : "#fff",
                  transition: "all 0.2s",
                }}
              >
                <p style={{ fontSize: 14, color: "#555", margin: 0 }}>
                  {file ? file.name : "Drag & drop a video file, or click to browse"}
                </p>
                {file && (
                  <p style={{ fontSize: 12, color: "#888", margin: "4px 0 0" }}>
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
                <button onClick={handleUpload} style={{ ...btnStyle, marginTop: 12, width: "100%" }}>
                  Upload & Analyze
                </button>
              )}
            </>
          )}

          {errorMsg && (
            <p style={{ color: "#ef4444", marginTop: 10, marginBottom: 0, fontSize: 13 }}>{errorMsg}</p>
          )}
        </>
      )}

      {/* Uploading (file) */}
      {phase === "uploading" && (
        <ProgressBar value={uploadPct} label="Uploading video..." />
      )}

      {/* Downloading (YouTube) */}
      {phase === "downloading" && (
        <div>
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
        <div>
          <ProgressBar
            value={100}
            label={uploadTab === "youtube" ? "Download complete" : "Upload complete"}
          />
          <div style={{ marginTop: 12 }}>
            <ProgressBar value={processingPct} label="Analyzing frames with YOLO..." />
          </div>
        </div>
      )}

      {/* Done */}
      {phase === "done" && pitStopId && (
        <div style={{ textAlign: "center" }}>
          <ProgressBar value={100} label="Analysis complete!" />
          <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              onClick={() => navigate(`/analysis/${pitStopId}`)}
              style={btnStyle}
            >
              View Results
            </button>
            <button
              onClick={reset}
              style={{ ...btnStyle, backgroundColor: "#6b7280" }}
            >
              Analyze Another
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {phase === "error" && (
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#ef4444", margin: "0 0 12px" }}>{errorMsg}</p>
          <button onClick={reset} style={btnStyle}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );

  // No pit stops: centered layout
  if (!hasPitStops) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 120px)",
      }}>
        <h1 style={{ marginBottom: 24 }}>F1 Pit Stop Dashboard</h1>
        {loading ? <p>Loading...</p> : uploadPanel}
      </div>
    );
  }

  // Has pit stops: top-aligned layout with toggle
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>F1 Pit Stop Dashboard</h1>
        {phase === "idle" && !showUpload && (
          <button onClick={() => setShowUpload(true)} style={btnStyle}>
            Upload Video
          </button>
        )}
      </div>

      {(showUpload || phase !== "idle") && (
        <div style={{ marginBottom: 32 }}>
          {uploadPanel}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>Filename</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Duration</th>
            <th style={thStyle}>Frames</th>
            <th style={thStyle}>Uploaded</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pitStops.map((ps) => (
            <tr key={ps.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={tdStyle}>{ps.id}</td>
              <td style={tdStyle}>{ps.original_filename}</td>
              <td style={tdStyle}>
                <StatusBadge status={ps.status} />
              </td>
              <td style={tdStyle}>
                {ps.duration_sec ? `${ps.duration_sec.toFixed(1)}s` : "-"}
              </td>
              <td style={tdStyle}>
                {ps.processed_frames}
                {ps.total_frames ? ` / ${ps.total_frames}` : ""}
              </td>
              <td style={tdStyle}>
                {new Date(ps.created_at).toLocaleString()}
              </td>
              <td style={tdStyle}>
                {ps.status === "completed" && (
                  <Link to={`/analysis/${ps.id}`} style={{ marginRight: 8, color: "#3b82f6" }}>
                    View
                  </Link>
                )}
                {ps.status === "processing" && (
                  <Link to={`/analysis/${ps.id}`} style={{ marginRight: 8, color: "#3b82f6" }}>
                    Progress
                  </Link>
                )}
                <button
                  onClick={() => handleDelete(ps.id)}
                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 20px",
  backgroundColor: "#3b82f6",
  color: "#fff",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: 600,
  border: "none",
  fontSize: 14,
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

const thStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 14 };
const tdStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 14 };

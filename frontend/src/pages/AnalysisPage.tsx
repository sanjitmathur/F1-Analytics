import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import type { PitStopDetail, Detection, PitStopAnalytics } from "../types";
import { getPitStop, getDetections, getPitStopStatus, reprocessPitStop, getAnalytics, runAnalysis } from "../services/api";
import StatusBadge from "../components/StatusBadge";
import ProgressBar from "../components/ProgressBar";
import DetectionTimeline from "../components/DetectionTimeline";
import ConfidenceChart from "../components/ConfidenceChart";
import ModelSelector from "../components/ModelSelector";
import PitStopIntelligence from "../components/PitStopIntelligence";

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const [pitStop, setPitStop] = useState<PitStopDetail | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressPct, setProgressPct] = useState(0);
  const [reprocessing, setReprocessing] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [analytics, setAnalytics] = useState<PitStopAnalytics | null>(null);
  const [analyzingPitStop, setAnalyzingPitStop] = useState(false);

  useEffect(() => {
    if (!id) return;
    const numId = parseInt(id);

    const fetchAll = async () => {
      try {
        const ps = await getPitStop(numId);
        setPitStop(ps);

        if (ps.status === "completed") {
          const dets = await getDetections(numId, 1, 200);
          setDetections(dets.items);
          // Try to load existing analytics
          try {
            const a = await getAnalytics(numId);
            setAnalytics(a);
          } catch { /* analytics may not exist yet */ }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();

    // Poll if still processing
    const poll = setInterval(async () => {
      try {
        const status = await getPitStopStatus(numId);
        setProgressPct(status.progress_pct);
        if (status.status === "completed" || status.status === "failed") {
          clearInterval(poll);
          const ps = await getPitStop(numId);
          setPitStop(ps);
          if (ps.status === "completed") {
            const dets = await getDetections(numId, 1, 200);
            setDetections(dets.items);
            try {
              const a = await getAnalytics(numId);
              setAnalytics(a);
            } catch { /* analytics may not exist yet */ }
          }
        }
      } catch { /* ignore polling errors */ }
    }, 2000);

    return () => clearInterval(poll);
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (!pitStop) return <p>Pit stop not found.</p>;

  const isProcessing = pitStop.status === "processing" || pitStop.status === "pending";

  return (
    <div>
      <Link to="/" style={{ color: "#3b82f6", textDecoration: "none", fontSize: 14 }}>
        &larr; Back to Dashboard
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>{pitStop.original_filename}</h1>
        <StatusBadge status={pitStop.status} />
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <ModelSelector onModelChange={(name) => setSelectedModel(name)} />
          {pitStop.status === "completed" && (
            <button
              onClick={async () => {
                if (!selectedModel || reprocessing) return;
                setReprocessing(true);
                await reprocessPitStop(parseInt(id!), selectedModel);
                // Refresh to show processing state
                const ps = await getPitStop(parseInt(id!));
                setPitStop(ps);
                setReprocessing(false);
              }}
              disabled={reprocessing || !selectedModel}
              style={{
                padding: "6px 14px",
                background: reprocessing ? "#9ca3af" : "#f59e0b",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: reprocessing ? "not-allowed" : "pointer",
              }}
            >
              {reprocessing ? "Reprocessing..." : "Reprocess"}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 16, flexWrap: "wrap" }}>
        <InfoCard label="Duration" value={pitStop.duration_sec ? `${pitStop.duration_sec.toFixed(1)}s` : "-"} />
        <InfoCard label="FPS" value={pitStop.fps?.toFixed(1) || "-"} />
        <InfoCard label="Total Frames" value={pitStop.total_frames?.toString() || "-"} />
        <InfoCard label="Analyzed Frames" value={pitStop.processed_frames.toString()} />
        <InfoCard label="Object Classes" value={pitStop.summaries.length.toString()} />
        <InfoCard
          label="Total Detections"
          value={pitStop.summaries.reduce((s, d) => s + d.total_count, 0).toString()}
        />
      </div>

      {isProcessing && (
        <div style={{ marginTop: 24 }}>
          <ProgressBar value={progressPct} label="Processing video..." />
        </div>
      )}

      {pitStop.status === "failed" && (
        <div style={{ marginTop: 24, padding: 16, backgroundColor: "#fee2e2", borderRadius: 8, color: "#991b1b" }}>
          Error: {pitStop.error_message || "Unknown error"}
        </div>
      )}

      {pitStop.status === "completed" && (
        <>
          {/* Summaries */}
          <h2 style={{ marginTop: 32 }}>Detection Summaries</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={thStyle}>Class</th>
                <th style={thStyle} title="Max objects detected in a single frame">Count</th>
                <th style={thStyle} title="Total detections across all frames">Total Detections</th>
                <th style={thStyle}>Avg Conf.</th>
                <th style={thStyle}>First Seen</th>
                <th style={thStyle}>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {pitStop.summaries
                .sort((a, b) => (b.max_per_frame || 0) - (a.max_per_frame || 0))
                .map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={tdStyle}>{s.class_name}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{s.max_per_frame || "-"}</td>
                    <td style={{ ...tdStyle, color: "#888" }}>{s.total_count}</td>
                    <td style={tdStyle}>{(s.avg_confidence * 100).toFixed(1)}%</td>
                    <td style={tdStyle}>{s.first_seen_sec.toFixed(1)}s</td>
                    <td style={tdStyle}>{s.last_seen_sec.toFixed(1)}s</td>
                  </tr>
                ))}
            </tbody>
          </table>

          {/* Charts */}
          <h2 style={{ marginTop: 32 }}>Detection Timeline</h2>
          <DetectionTimeline detections={detections} />

          <h2 style={{ marginTop: 32 }}>Confidence by Class</h2>
          <ConfidenceChart summaries={pitStop.summaries} />

          {/* Pit Stop Intelligence */}
          {analytics ? (
            <PitStopIntelligence analytics={analytics} />
          ) : (
            <div style={{ marginTop: 32 }}>
              <button
                onClick={async () => {
                  setAnalyzingPitStop(true);
                  try {
                    const a = await runAnalysis(parseInt(id!));
                    setAnalytics(a);
                  } catch (err) {
                    console.error("Analysis failed:", err);
                  } finally {
                    setAnalyzingPitStop(false);
                  }
                }}
                disabled={analyzingPitStop}
                style={{
                  padding: "10px 20px",
                  background: analyzingPitStop ? "#9ca3af" : "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: analyzingPitStop ? "not-allowed" : "pointer",
                }}
              >
                {analyzingPitStop ? "Analyzing..." : "Run Pit Stop Analysis"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "12px 20px",
        backgroundColor: "#f9fafb",
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 14 };
const tdStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 14 };

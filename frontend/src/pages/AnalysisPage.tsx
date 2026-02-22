import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import type { PitStopDetail, Detection } from "../types";
import { getPitStop, getDetections, getPitStopStatus } from "../services/api";
import StatusBadge from "../components/StatusBadge";
import ProgressBar from "../components/ProgressBar";
import DetectionTimeline from "../components/DetectionTimeline";
import ConfidenceChart from "../components/ConfidenceChart";

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const [pitStop, setPitStop] = useState<PitStopDetail | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressPct, setProgressPct] = useState(0);

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
          }
        }
      } catch {}
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

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
        <h1 style={{ margin: 0 }}>{pitStop.original_filename}</h1>
        <StatusBadge status={pitStop.status} />
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
                <th style={thStyle}>Count</th>
                <th style={thStyle}>Avg Conf.</th>
                <th style={thStyle}>Min Conf.</th>
                <th style={thStyle}>Max Conf.</th>
                <th style={thStyle}>First Seen</th>
                <th style={thStyle}>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {pitStop.summaries
                .sort((a, b) => b.total_count - a.total_count)
                .map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={tdStyle}>{s.class_name}</td>
                    <td style={tdStyle}>{s.total_count}</td>
                    <td style={tdStyle}>{(s.avg_confidence * 100).toFixed(1)}%</td>
                    <td style={tdStyle}>{(s.min_confidence * 100).toFixed(1)}%</td>
                    <td style={tdStyle}>{(s.max_confidence * 100).toFixed(1)}%</td>
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

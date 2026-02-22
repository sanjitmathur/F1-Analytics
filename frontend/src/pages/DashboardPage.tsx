import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { PitStop } from "../types";
import { listPitStops, deletePitStop } from "../services/api";
import StatusBadge from "../components/StatusBadge";

export default function DashboardPage() {
  const [pitStops, setPitStops] = useState<PitStop[]>([]);
  const [loading, setLoading] = useState(true);

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
    // Auto-refresh while any are processing
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>F1 Pit Stop Dashboard</h1>
        <Link to="/upload" style={btnStyle}>
          Upload Video
        </Link>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : pitStops.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#888" }}>
          <p style={{ fontSize: 18 }}>No pit stops analyzed yet.</p>
          <Link to="/upload" style={btnStyle}>
            Upload your first video
          </Link>
        </div>
      ) : (
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
      )}
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
};

const thStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 14 };
const tdStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 14 };

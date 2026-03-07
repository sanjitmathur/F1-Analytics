import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getTrack, getTrackHistory } from "../services/api";
import type { Track, TrackHistory } from "../types";
import CircuitMap from "../components/CircuitMap";

const TEAM_COLORS: Record<string, string> = {
  "Red Bull": "#3671C6",
  "Ferrari": "#E8002D",
  "Mercedes": "#27F4D2",
  "McLaren": "#FF8000",
  "Aston Martin": "#229971",
  "Alpine": "#FF87BC",
  "Williams": "#64C4FF",
  "Racing Bulls": "#6692FF",
  "RB": "#6692FF",
  "AlphaTauri": "#6692FF",
  "Sauber": "#52E252",
  "Kick Sauber": "#52E252",
  "Haas": "#B6BABD",
  "Cadillac": "#C0A44D",
};

function getCharacteristics(track: Track) {
  const badges: { label: string; color: string }[] = [];
  if (track.base_lap_time >= 95) badges.push({ label: "High Speed", color: "#E8002D" });
  if (track.base_lap_time <= 78) badges.push({ label: "Short Lap", color: "#FF8000" });
  if (track.overtake_difficulty >= 1.5) badges.push({ label: "Street Circuit", color: "#FF87BC" });
  if (track.overtake_difficulty <= 0.8) badges.push({ label: "High Overtaking", color: "#27F4D2" });
  if (track.overtake_difficulty > 0.8 && track.overtake_difficulty < 1.5 && track.drs_zones >= 2)
    badges.push({ label: "Balanced", color: "#64C4FF" });
  if (track.overtake_difficulty >= 1.2 && track.drs_zones <= 1) badges.push({ label: "Technical", color: "#FFD700" });
  if (track.safety_car_probability >= 0.05) badges.push({ label: "Safety Car Hotspot", color: "#FF4444" });
  if (track.drs_zones >= 3) badges.push({ label: "Multi-Zone", color: "#3671C6" });
  if (track.total_laps >= 70) badges.push({ label: "Endurance", color: "#229971" });
  return badges;
}

export default function TrackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [track, setTrack] = useState<Track | null>(null);
  const [history, setHistory] = useState<TrackHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const trackId = Number(id);
    Promise.all([getTrack(trackId), getTrackHistory(trackId)])
      .then(([t, h]) => { setTrack(t); setHistory(h); })
      .catch(() => navigate("/tracks"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading || !track) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <div className="spinner" />
      </div>
    );
  }

  const badges = getCharacteristics(track);

  return (
    <div>
      {/* Header */}
      <div className="page-header animate-in">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate("/tracks")}
            style={{ fontSize: 18, padding: "4px 12px" }}
          >
            &larr;
          </button>
          <div>
            <div className="section-label">{track.country}</div>
            <h1 style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {track.name}
              {track.is_preset && (
                <span style={{
                  fontSize: 10, color: "var(--accent-green)", background: "rgba(0,230,118,0.1)",
                  padding: "4px 12px", borderRadius: 100, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
                }}>
                  Preset
                </span>
              )}
            </h1>
          </div>
        </div>
        <Link to="/simulate" className="btn btn-primary btn-sm">Simulate This Track</Link>
      </div>

      {/* Hero: Stats + Circuit Map */}
      <div className="grid-2 animate-in" style={{ animationDelay: "0.1s", marginBottom: 32 }}>
        {/* Stats Card */}
        <div className="card">
          <div className="card-header">Track Statistics</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              { v: track.total_laps, l: "Race Laps" },
              { v: `${track.base_lap_time}s`, l: "Base Lap Time" },
              { v: `${track.pit_loss_time}s`, l: "Pit Loss" },
              { v: track.drs_zones, l: "Active Aero Zones" },
              { v: `${track.overtake_difficulty}x`, l: "Overtake Difficulty" },
              { v: `${(track.safety_car_probability * 100).toFixed(0)}%`, l: "SC Chance / Lap" },
              ...(history?.circuit_length_km ? [{ v: `${history.circuit_length_km} km`, l: "Circuit Length" }] : []),
              ...(history?.lap_record ? [{ v: history.lap_record, l: `Record (${history.lap_record_holder}, ${history.lap_record_year})` }] : []),
            ].map(item => (
              <div key={item.l} style={{ padding: "12px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, fontWeight: 800 }}>{item.v}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>{item.l}</div>
              </div>
            ))}
          </div>
          {history?.first_gp && (
            <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-muted)" }}>
              First Grand Prix: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{history.first_gp}</span>
            </div>
          )}
        </div>

        {/* Circuit Map */}
        <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 350 }}>
          <CircuitMap trackName={track.name} size={350} color="var(--f1-red)" opacity={0.3} />
        </div>
      </div>

      {/* Track Characteristics */}
      {badges.length > 0 && (
        <div className="card animate-in" style={{ animationDelay: "0.2s", marginBottom: 32 }}>
          <div className="card-header">Track Characteristics</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {badges.map(b => (
              <span key={b.label} style={{
                background: `${b.color}18`,
                color: b.color,
                border: `1px solid ${b.color}40`,
                padding: "8px 18px",
                borderRadius: 100,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}>
                {b.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Past Winners */}
      {history && history.past_winners.length > 0 && (
        <div className="card animate-in" style={{ animationDelay: "0.3s" }}>
          <div className="card-header">Past Winners</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Year", "Driver", "Team"].map(h => (
                    <th key={h} style={{
                      textAlign: "left", padding: "12px 16px", fontSize: 10,
                      textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.past_winners.map((w, i) => (
                  <tr key={w.year} style={{
                    borderBottom: i < history.past_winners.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  }}>
                    <td style={{ padding: "14px 16px", fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 14 }}>
                      {w.year}
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 600, fontSize: 14 }}>
                      {w.driver}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                      }}>
                        <span style={{
                          width: 4, height: 20, borderRadius: 2,
                          background: TEAM_COLORS[w.team] || "var(--text-muted)",
                        }} />
                        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{w.team}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

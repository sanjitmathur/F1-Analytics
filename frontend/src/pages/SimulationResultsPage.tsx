import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getSimulation,
  getSimulationResults,
  getLapData,
  getSimulationStatus,
  getTeamColors,
} from "../services/api";
import type { SimulationRun, SimulationResult, LapData, TeamColors } from "../types";
import PositionChart from "../components/PositionChart";
import LapTimeChart from "../components/LapTimeChart";
import StrategyTimeline from "../components/StrategyTimeline";

export default function SimulationResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [sim, setSim] = useState<SimulationRun | null>(null);
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [laps, setLaps] = useState<LapData[]>([]);
  const [teamColors, setTeamColors] = useState<TeamColors>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const runId = Number(id);
    const poll = async () => {
      const status = await getSimulationStatus(runId);
      if (status.status === "completed") {
        const [s, r, l, c] = await Promise.all([
          getSimulation(runId), getSimulationResults(runId), getLapData(runId), getTeamColors(),
        ]);
        setSim(s); setResults(r); setLaps(l); setTeamColors(c); setLoading(false);
      } else if (status.status === "failed") {
        const s = await getSimulation(runId); setSim(s); setLoading(false);
      } else {
        setTimeout(poll, 1000);
      }
    };
    poll();
  }, [id]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(3);
    return `${m}:${s.padStart(6, "0")}`;
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ position: "relative", width: 64, height: 64, margin: "0 auto 24px" }}>
            <span className="spinner" style={{ width: 64, height: 64, borderWidth: 2 }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 800, color: "var(--f1-red)" }}>SIM</div>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>Simulating race</p>
        </div>
      </div>
    );
  }

  if (!sim || sim.status === "failed") {
    return (
      <div className="card" style={{ textAlign: "center", padding: 60 }}>
        <h2 style={{ fontFamily: "'Orbitron', sans-serif", color: "var(--f1-red)", marginBottom: 12 }}>Simulation Failed</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>{sim?.error_message || "Unknown error"}</p>
        <Link to="/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
      </div>
    );
  }

  const winner = results[0];
  const totalLaps = results[0]?.laps_completed || 0;

  return (
    <div>
      {/* Header */}
      <div className="page-header animate-in">
        <div>
          <div className="section-label">{sim.track_name}</div>
          <h1>{sim.name || "Race Results"}</h1>
        </div>
        <Link to="/dashboard" className="btn btn-secondary btn-sm">Back</Link>
      </div>

      {/* Winner spotlight */}
      {winner && (
        <div className="card animate-in" style={{
          background: `linear-gradient(135deg, rgba(255,215,0,0.05), var(--bg-glass))`,
          borderColor: "rgba(255,215,0,0.15)",
          textAlign: "center",
          padding: "40px 28px",
        }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 3, marginBottom: 8 }}>Race Winner</div>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 36, fontWeight: 900, marginBottom: 4 }}>
            {winner.driver_name}
          </div>
          <div style={{ color: teamColors[winner.team] || "var(--text-secondary)", fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
            {winner.team}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 40 }}>
            {[
              { label: "Time", value: formatTime(winner.total_time) },
              { label: "Best Lap", value: winner.best_lap_time ? formatTime(winner.best_lap_time) : "—" },
              { label: "Pit Stops", value: winner.pit_stops },
              { label: "Laps", value: totalLaps },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results table */}
      <div className="card animate-in">
        <div className="card-header">Classification</div>
        <table className="results-table">
          <thead>
            <tr>
              <th style={{ width: 50 }}>Pos</th>
              <th>Driver</th>
              <th>Team</th>
              <th>Time / Gap</th>
              <th>Stops</th>
              <th>Best Lap</th>
              <th style={{ textAlign: "right" }}>+/-</th>
            </tr>
          </thead>
          <tbody>
            {results.map(r => (
              <tr key={r.driver_name} style={{ opacity: r.is_dnf ? 0.4 : 1 }}>
                <td>
                  <span className={`position-number position-${r.position}`}>{r.position}</span>
                </td>
                <td style={{ fontWeight: 600 }}>
                  <span className="team-color-bar" style={{ backgroundColor: teamColors[r.team] || "#444", boxShadow: `0 0 8px ${teamColors[r.team] || "transparent"}40` }} />
                  {r.driver_name}
                </td>
                <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>{r.team}</td>
                <td style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 600 }}>
                  {r.is_dnf ? "DNF" : r.position === 1 ? formatTime(r.total_time) : `+${r.gap_to_leader.toFixed(3)}s`}
                </td>
                <td style={{ textAlign: "center" }}>{r.pit_stops}</td>
                <td style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, color: "var(--text-secondary)" }}>
                  {r.best_lap_time ? formatTime(r.best_lap_time) : "—"}
                </td>
                <td style={{ textAlign: "right", fontWeight: 700, fontSize: 13, color: r.positions_gained > 0 ? "var(--accent-green)" : r.positions_gained < 0 ? "var(--f1-red)" : "var(--text-muted)" }}>
                  {r.positions_gained > 0 ? `+${r.positions_gained}` : r.positions_gained === 0 ? "—" : r.positions_gained}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div className="grid-2">
        <div className="card animate-in">
          <div className="card-header">Position Battle</div>
          <PositionChart laps={laps} />
        </div>
        <div className="card animate-in">
          <div className="card-header">Lap Times</div>
          <LapTimeChart laps={laps} />
        </div>
      </div>

      <div className="card animate-in">
        <div className="card-header">Strategy Timeline</div>
        <StrategyTimeline laps={laps} teamColors={teamColors} results={results} />
      </div>
    </div>
  );
}

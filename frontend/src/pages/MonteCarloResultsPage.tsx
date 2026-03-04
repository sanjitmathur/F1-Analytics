import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getSimulation,
  getSimulationStatus,
  getMonteCarloResults,
  getTeamColors,
} from "../services/api";
import type { SimulationRun, MonteCarloResult, TeamColors } from "../types";
import MonteCarloDistribution from "../components/MonteCarloDistribution";
import PositionHistogram from "../components/PositionHistogram";

export default function MonteCarloResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [sim, setSim] = useState<SimulationRun | null>(null);
  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null);
  const [teamColors, setTeamColors] = useState<TeamColors>({});
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const runId = Number(id);
    const poll = async () => {
      const status = await getSimulationStatus(runId);
      setProgress(status.progress_pct);
      if (status.status === "completed") {
        const [s, mc, c] = await Promise.all([getSimulation(runId), getMonteCarloResults(runId), getTeamColors()]);
        setSim(s); setMcResult(mc); setTeamColors(c); setLoading(false);
      } else if (status.status === "failed") {
        const s = await getSimulation(runId); setSim(s); setLoading(false);
      } else {
        setTimeout(poll, 1500);
      }
    };
    poll();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center", width: 340 }}>
          <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 32px" }}>
            <span className="spinner" style={{ width: 80, height: 80, borderWidth: 2 }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, fontWeight: 900 }}>{progress.toFixed(0)}</div>
              <div style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 2 }}>percent</div>
            </div>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>Running Monte Carlo</p>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  if (!sim || sim.status === "failed" || !mcResult) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 60 }}>
        <h2 style={{ fontFamily: "'Orbitron', sans-serif", color: "var(--f1-red)" }}>Simulation Failed</h2>
        <p style={{ color: "var(--text-secondary)", marginTop: 12, marginBottom: 24 }}>{sim?.error_message || "Unknown error"}</p>
        <Link to="/dashboard" className="btn btn-secondary">Back</Link>
      </div>
    );
  }

  const topDriver = mcResult.drivers[0];

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="section-label">Monte Carlo Analysis</div>
          <h1>{sim.name || sim.track_name}</h1>
          <div className="subtitle">{mcResult.num_simulations.toLocaleString()} simulations completed</div>
        </div>
        <Link to="/dashboard" className="btn btn-secondary btn-sm">Back</Link>
      </div>

      {/* Top prediction spotlight */}
      {topDriver && (
        <div className="card animate-in" style={{
          background: "linear-gradient(135deg, rgba(225,6,0,0.06), var(--bg-glass))",
          borderColor: "rgba(225,6,0,0.12)",
          display: "flex", alignItems: "center", gap: 40, padding: "32px 36px",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 3, marginBottom: 8 }}>Predicted Winner</div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 28, fontWeight: 900 }}>{topDriver.driver_name}</div>
            <div style={{ color: teamColors[topDriver.team] || "var(--text-secondary)", fontSize: 13, fontWeight: 600, marginTop: 2 }}>{topDriver.team}</div>
          </div>
          <div style={{ display: "flex", gap: 32 }}>
            {[
              { label: "Win %", value: topDriver.win_pct.toFixed(1), color: "var(--f1-red)" },
              { label: "Podium %", value: topDriver.podium_pct.toFixed(1), color: "var(--accent-yellow)" },
              { label: "Avg Pos", value: topDriver.avg_position.toFixed(1), color: "var(--accent-blue)" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="card animate-in">
        <div className="card-header">Win Probability</div>
        <MonteCarloDistribution drivers={mcResult.drivers} teamColors={teamColors} metric="win_pct" label="Win %" />
      </div>

      <div className="grid-2">
        <div className="card animate-in">
          <div className="card-header">Podium Probability</div>
          <MonteCarloDistribution drivers={mcResult.drivers} teamColors={teamColors} metric="podium_pct" label="Podium %" />
        </div>
        <div className="card animate-in">
          <div className="card-header">DNF Risk</div>
          <MonteCarloDistribution drivers={mcResult.drivers} teamColors={teamColors} metric="dnf_pct" label="DNF %" />
        </div>
      </div>

      {/* Full table */}
      <div className="card animate-in">
        <div className="card-header">Full Probability Matrix</div>
        <table className="results-table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>Team</th>
              <th>Avg Pos</th>
              <th>Win %</th>
              <th>Podium %</th>
              <th>Top 5 %</th>
              <th>DNF %</th>
              <th>Best</th>
              <th>Worst</th>
            </tr>
          </thead>
          <tbody>
            {mcResult.drivers.map(d => (
              <tr
                key={d.driver_name}
                onClick={() => setSelectedDriver(d.driver_name === selectedDriver ? null : d.driver_name)}
                style={{ cursor: "pointer", background: d.driver_name === selectedDriver ? "var(--bg-glass-hover)" : undefined }}
              >
                <td style={{ fontWeight: 600 }}>
                  <span className="team-color-bar" style={{ backgroundColor: teamColors[d.team] || "#444", boxShadow: `0 0 8px ${teamColors[d.team] || "transparent"}40` }} />
                  {d.driver_name}
                </td>
                <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>{d.team}</td>
                <td style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 800 }}>{d.avg_position.toFixed(1)}</td>
                <td style={{ color: "var(--f1-red)", fontWeight: 600 }}>{d.win_pct.toFixed(1)}</td>
                <td>{d.podium_pct.toFixed(1)}</td>
                <td>{d.top5_pct.toFixed(1)}</td>
                <td style={{ color: d.dnf_pct > 5 ? "var(--f1-red)" : "var(--text-secondary)" }}>{d.dnf_pct.toFixed(1)}</td>
                <td style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12 }}>P{d.best_position}</td>
                <td style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, color: "var(--text-muted)" }}>P{d.worst_position}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedDriver && (
        <div className="card animate-in">
          <div className="card-header">Position Distribution — {selectedDriver}</div>
          <PositionHistogram
            driver={mcResult.drivers.find(d => d.driver_name === selectedDriver)!}
            teamColors={teamColors}
          />
        </div>
      )}
    </div>
  );
}

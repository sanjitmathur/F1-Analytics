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
import CircuitMap from "../components/CircuitMap";

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
  const topColor = topDriver ? (teamColors[topDriver.team] || "var(--f1-red)") : "var(--f1-red)";

  return (
    <div>
      {/* ═══ HERO SECTION ═══ */}
      <div style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "var(--radius-lg)",
        background: `linear-gradient(135deg, ${topColor}0A 0%, var(--bg-card) 40%, ${topColor}06 100%)`,
        border: `1px solid ${topColor}20`,
        marginBottom: 20,
        padding: "40px 36px",
        minHeight: 280,
      }}>
        {/* Circuit map background */}
        <div style={{
          position: "absolute",
          right: 40,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          zIndex: 0,
        }}>
          <CircuitMap trackName={sim.track_name || ""} color={topColor} opacity={0.18} size={300} />
        </div>

        {/* Ambient glow */}
        <div style={{
          position: "absolute",
          top: -100,
          right: -50,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${topColor}18 0%, ${topColor}08 30%, transparent 70%)`,
          pointerEvents: "none",
          zIndex: 0,
        }} />
        <div style={{
          position: "absolute",
          bottom: -80,
          left: -80,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${topColor}0C 0%, transparent 70%)`,
          pointerEvents: "none",
          zIndex: 0,
        }} />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Top bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
            <div>
              <div style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 3,
                color: topColor,
                fontWeight: 700,
                marginBottom: 4,
              }}>
                {sim.track_name} — Monte Carlo
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {mcResult.num_simulations.toLocaleString()} simulations
              </div>
            </div>
            <Link to="/dashboard" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>Back</Link>
          </div>

          {/* Predicted winner */}
          {topDriver && (
            <div style={{ marginBottom: 28 }}>
              <div style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 3,
                color: "var(--text-muted)",
                marginBottom: 8,
              }}>
                Predicted Winner
              </div>
              <div style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 42,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: -1,
                marginBottom: 6,
              }}>
                {topDriver.driver_name}
              </div>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: topColor,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <span style={{ width: 4, height: 16, borderRadius: 2, background: topColor, display: "inline-block" }} />
                {topDriver.team}
              </div>
            </div>
          )}

          {/* Stats row */}
          {topDriver && (
            <div style={{ display: "flex", gap: 40 }}>
              {[
                { label: "Win %", value: `${topDriver.win_pct.toFixed(1)}%`, accent: true },
                { label: "Podium %", value: `${topDriver.podium_pct.toFixed(1)}%` },
                { label: "Avg Pos", value: topDriver.avg_position.toFixed(1) },
                { label: "Top 5 %", value: `${topDriver.top5_pct.toFixed(1)}%` },
                { label: "DNF %", value: `${topDriver.dnf_pct.toFixed(1)}%` },
              ].map(s => (
                <div key={s.label}>
                  <div style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 18,
                    fontWeight: 800,
                    color: s.accent ? topColor : undefined,
                  }}>
                    {s.value}
                  </div>
                  <div style={{
                    fontSize: 9,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    marginTop: 2,
                  }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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

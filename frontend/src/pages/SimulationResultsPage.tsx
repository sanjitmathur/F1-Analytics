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
import CircuitMap from "../components/CircuitMap";

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
  const p2 = results[1];
  const p3 = results[2];
  const totalLaps = winner?.laps_completed || 0;
  const winnerColor = winner ? (teamColors[winner.team] || "var(--f1-red)") : "var(--f1-red)";

  return (
    <div>
      {/* ═══ HERO SECTION ═══ */}
      <div style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "var(--radius-lg)",
        background: `linear-gradient(135deg, ${winnerColor}0A 0%, var(--bg-card) 40%, ${winnerColor}06 100%)`,
        border: `1px solid ${winnerColor}20`,
        marginBottom: 20,
        padding: "48px 40px",
        minHeight: 320,
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
          <CircuitMap trackName={sim.track_name || ""} color={winnerColor} opacity={0.18} size={320} />
        </div>

        {/* Ambient glow — team color */}
        <div style={{
          position: "absolute",
          top: -100,
          right: -50,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${winnerColor}18 0%, ${winnerColor}08 30%, transparent 70%)`,
          pointerEvents: "none",
          zIndex: 0,
        }} />
        {/* Secondary glow bottom-left */}
        <div style={{
          position: "absolute",
          bottom: -80,
          left: -80,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${winnerColor}0C 0%, transparent 70%)`,
          pointerEvents: "none",
          zIndex: 0,
        }} />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Top bar: track label + back link */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
            <div>
              <div style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 3,
                color: winnerColor,
                fontWeight: 700,
                marginBottom: 4,
              }}>
                {sim.track_name}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {sim.name || "Race Simulation"}
              </div>
            </div>
            <Link to="/dashboard" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>Back</Link>
          </div>

          {/* Winner name — large */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: 3,
              color: "var(--text-muted)",
              marginBottom: 8,
            }}>
              Race Winner
            </div>
            <div style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 48,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -1,
              marginBottom: 6,
            }}>
              {winner?.driver_name}
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: winnerColor,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span style={{
                width: 4,
                height: 16,
                borderRadius: 2,
                background: winnerColor,
                display: "inline-block",
              }} />
              {winner?.team}
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 40 }}>
            {[
              { label: "Race Time", value: winner ? formatTime(winner.total_time) : "—" },
              { label: "Best Lap", value: winner?.best_lap_time ? formatTime(winner.best_lap_time) : "—" },
              { label: "Pit Stops", value: String(winner?.pit_stops ?? "—") },
              { label: "Laps", value: String(totalLaps) },
              { label: "Gained", value: winner ? (winner.positions_gained > 0 ? `+${winner.positions_gained}` : winner.positions_gained === 0 ? "—" : String(winner.positions_gained)) : "—" },
            ].map(s => (
              <div key={s.label}>
                <div style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 18,
                  fontWeight: 800,
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
        </div>
      </div>

      {/* ═══ PODIUM ═══ */}
      {p2 && p3 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          marginBottom: 20,
        }}>
          {[
            { r: p2, pos: 2, height: 100 },
            { r: winner, pos: 1, height: 140 },
            { r: p3, pos: 3, height: 72 },
          ].map(({ r, pos, height }) => {
            if (!r) return null;
            const color = teamColors[r.team] || "var(--text-muted)";
            return (
              <div
                key={pos}
                className="animate-in"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                }}
              >
                {/* Driver info */}
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <div style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: pos === 1 ? 16 : 13,
                    fontWeight: 800,
                    marginBottom: 2,
                  }}>
                    {r.driver_name}
                  </div>
                  <div style={{ fontSize: 11, color, fontWeight: 600 }}>{r.team}</div>
                  <div style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontFamily: "'Orbitron', sans-serif",
                    marginTop: 4,
                  }}>
                    {pos === 1 ? formatTime(r.total_time) : `+${r.gap_to_leader.toFixed(3)}s`}
                  </div>
                </div>

                {/* Podium block */}
                <div style={{
                  width: "100%",
                  height,
                  borderRadius: "12px 12px 0 0",
                  background: `linear-gradient(180deg, ${color}25 0%, ${color}0A 60%, transparent 100%)`,
                  border: `1px solid ${color}35`,
                  borderBottom: `3px solid ${color}60`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}>
                  <span style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: pos === 1 ? 48 : 36,
                    fontWeight: 900,
                    color: `${color}30`,
                  }}>
                    {pos}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ CLASSIFICATION ═══ */}
      <div className="card animate-in" style={{ marginBottom: 20 }}>
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

      {/* ═══ CHARTS ═══ */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card animate-in">
          <div className="card-header">Position Battle</div>
          <PositionChart laps={laps} />
        </div>
        <div className="card animate-in">
          <div className="card-header">Lap Times</div>
          <LapTimeChart laps={laps} />
        </div>
      </div>

      {/* ═══ STRATEGY ═══ */}
      <div className="card animate-in">
        <div className="card-header">Strategy Timeline</div>
        <StrategyTimeline laps={laps} teamColors={teamColors} results={results} />
      </div>
    </div>
  );
}

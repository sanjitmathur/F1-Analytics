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
import RaceReplay from "../components/RaceReplay";

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
      {/* ═══ CINEMATIC HERO SECTION ═══ */}
      <div
        className="results-hero"
        style={{
          background: `linear-gradient(135deg, ${winnerColor}0A 0%, var(--bg-card) 30%, ${winnerColor}08 70%, var(--bg-card) 100%)`,
          borderColor: `${winnerColor}20`,
        }}
      >
        {/* Checkered strip along bottom */}
        <div className="results-checkered" />

        {/* Ambient glows */}
        <div className="results-hero-glow" style={{
          top: -100, right: -50,
          background: `radial-gradient(circle, ${winnerColor}18 0%, ${winnerColor}08 30%, transparent 70%)`,
        }} />
        <div className="results-hero-glow" style={{
          bottom: -80, left: -80, width: 300, height: 300,
          background: `radial-gradient(circle, ${winnerColor}0C 0%, transparent 70%)`,
        }} />

        {/* Back button — top-right */}
        <Link to="/dashboard" className="btn btn-ghost btn-sm results-hero-back">Back</Link>

        {/* ─── Left Column ─── */}
        <div className="results-hero-left">
          {/* Track tag with pulsing dot */}
          <div className="results-track-tag">
            <span className="results-pulse-dot" style={{ background: winnerColor, boxShadow: `0 0 8px ${winnerColor}` }} />
            <span>{sim.track_name}</span>
          </div>

          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>
            {sim.name || "Race Simulation"}
          </div>

          {/* "RACE WINNER" label */}
          <div className="results-winner-label">Race Winner</div>

          {/* Giant driver name */}
          <h1
            className="results-winner-name"
            style={{
              backgroundImage: `linear-gradient(135deg, #ffffff 40%, ${winnerColor} 100%)`,
              textShadow: `0 0 60px ${winnerColor}30`,
            }}
          >
            {winner?.driver_name}
          </h1>

          {/* Team with color bar */}
          <div className="results-team-row" style={{ color: winnerColor }}>
            <span className="results-team-bar" style={{ background: winnerColor }} />
            {winner?.team}
          </div>

          {/* Stats row with staggered fade */}
          <div className="results-stats-row">
            {[
              { label: "Race Time", value: winner ? formatTime(winner.total_time) : "—" },
              { label: "Best Lap", value: winner?.best_lap_time ? formatTime(winner.best_lap_time) : "—" },
              { label: "Pit Stops", value: String(winner?.pit_stops ?? "—") },
              { label: "Laps", value: String(totalLaps) },
              { label: "Gained", value: winner ? (winner.positions_gained > 0 ? `+${winner.positions_gained}` : winner.positions_gained === 0 ? "—" : String(winner.positions_gained)) : "—" },
            ].map((s, i) => (
              <div key={s.label} className="results-hero-stat" style={{ animationDelay: `${0.6 + i * 0.1}s` }}>
                <div className="results-stat-value">{s.value}</div>
                <div className="results-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Right Column (visual) ─── */}
        <div className="results-hero-right">
          {/* Giant driver number background */}
          <div className="results-number-bg" style={{ color: `${winnerColor}08` }}>
            {winner ? String(winner.position - winner.positions_gained).padStart(2, "0") : "01"}
          </div>

          {/* Rotating circuit map */}
          <div className="results-circuit-spin">
            <CircuitMap trackName={sim.track_name || ""} color={winnerColor} opacity={0.2} size={280} />
          </div>

          {/* Helmet SVG — team colored */}
          <svg className="results-helmet-svg" viewBox="0 0 300 280" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="resHelmetGrad" x1="0" y1="0" x2="300" y2="280" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.04)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
              </linearGradient>
              <linearGradient id="resVisorGrad" x1="60" y1="130" x2="230" y2="180" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={winnerColor} stopOpacity={0.6} />
                <stop offset="50%" stopColor={winnerColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={winnerColor} stopOpacity={0.1} />
              </linearGradient>
              <filter id="resVisorGlow">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d="M150 30 C80 30, 30 80, 30 150 C30 200, 50 240, 90 260 L210 260 C250 240, 270 200, 270 150 C270 80, 220 30, 150 30Z"
              fill="url(#resHelmetGrad)"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1.5"
            />
            <path
              d="M70 135 C70 120, 90 110, 150 110 C210 110, 230 120, 230 135 L220 175 C210 190, 180 195, 150 195 C120 195, 90 190, 80 175 Z"
              fill="url(#resVisorGrad)"
              filter="url(#resVisorGlow)"
            />
            <path
              d="M85 140 Q150 125, 220 140"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
              fill="none"
            />
          </svg>

          {/* Floating telemetry pills */}
          <div className="results-telemetry">
            <div className="results-telemetry-pill">
              <span className="results-tele-label">BEST</span>
              <span className="results-tele-value">{winner?.best_lap_time ? formatTime(winner.best_lap_time) : "—"}</span>
            </div>
            <div className="results-telemetry-pill">
              <span className="results-tele-label">STOPS</span>
              <span className="results-tele-value">{winner?.pit_stops ?? "—"}</span>
            </div>
            <div className="results-telemetry-pill">
              <span className="results-tele-label">+/-</span>
              <span className="results-tele-value">{winner ? (winner.positions_gained > 0 ? `+${winner.positions_gained}` : winner.positions_gained === 0 ? "0" : String(winner.positions_gained)) : "—"}</span>
            </div>
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

      {/* ═══ RACE REPLAY ═══ */}
      {laps.length > 0 && (
        <div className="card animate-in">
          <div className="card-header">Race Replay</div>
          <RaceReplay
            trackName={sim?.track_name || ""}
            lapData={(() => {
              const grouped: Record<number, Array<{ driver_name: string; position: number; team_color: string }>> = {};
              for (const l of laps) {
                if (!grouped[l.lap]) grouped[l.lap] = [];
                grouped[l.lap].push({
                  driver_name: l.driver_name,
                  position: l.position,
                  team_color: teamColors[results.find(r => r.driver_name === l.driver_name)?.team || ""] || "#ffffff",
                });
              }
              return Object.entries(grouped)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([lap, positions]) => ({ lap: Number(lap), positions }));
            })()}
            totalLaps={totalLaps}
          />
        </div>
      )}
    </div>
  );
}

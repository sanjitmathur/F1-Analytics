import { useEffect, useState } from "react";
import {
  getDriverStandings,
  getConstructorStandings,
  getSeasonTeamColors,
} from "../services/api";
import type { ChampionshipStanding, TeamColors } from "../types";

export default function ChampionshipPage() {
  const [predictedDrivers, setPredictedDrivers] = useState<ChampionshipStanding[]>([]);
  const [predictedConstructors, setPredictedConstructors] = useState<ChampionshipStanding[]>([]);
  const [realDrivers, setRealDrivers] = useState<ChampionshipStanding[]>([]);
  const [realConstructors, setRealConstructors] = useState<ChampionshipStanding[]>([]);
  const [teamColors, setTeamColors] = useState<TeamColors>({});
  const [view, setView] = useState<"driver" | "constructor">("driver");
  const [mode, setMode] = useState<"predicted" | "real">("predicted");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDriverStandings(2026, true).catch(() => []),
      getConstructorStandings(2026, true).catch(() => []),
      getDriverStandings(2026, false).catch(() => []),
      getConstructorStandings(2026, false).catch(() => []),
      getSeasonTeamColors(2026).catch(() => ({})),
    ]).then(([pd, pc, rd, rc, tc]) => {
      setPredictedDrivers(pd);
      setPredictedConstructors(pc);
      setRealDrivers(rd);
      setRealConstructors(rc);
      setTeamColors(tc);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><span className="spinner" /></div>;

  const standings = mode === "predicted"
    ? (view === "driver" ? predictedDrivers : predictedConstructors)
    : (view === "driver" ? realDrivers : realConstructors);
  const leader = standings[0];

  const accentColor = "var(--f1-red)";

  return (
    <div>
      <div className="page-header animate-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="section-label">Championship</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0 }}>2026 Standings</h1>
            <div style={{ display: "flex", gap: 4, background: "var(--bg-secondary)", borderRadius: 6, padding: 3 }}>
              <button
                onClick={() => setMode("predicted")}
                style={{
                  padding: "5px 14px",
                  borderRadius: 4,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  background: mode === "predicted" ? "var(--f1-red)" : "transparent",
                  color: mode === "predicted" ? "#fff" : "var(--text-muted)",
                  transition: "all 0.2s ease",
                }}
              >
                Predicted
              </button>
              <button
                onClick={() => setMode("real")}
                style={{
                  padding: "5px 14px",
                  borderRadius: 4,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  background: mode === "real" ? "var(--f1-red)" : "transparent",
                  color: mode === "real" ? "#fff" : "var(--text-muted)",
                  transition: "all 0.2s ease",
                }}
              >
                Real
              </button>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className={`btn ${view === "driver" ? "btn-primary" : "btn-ghost"} btn-sm`} onClick={() => setView("driver")}>Drivers</button>
          <button className={`btn ${view === "constructor" ? "btn-primary" : "btn-ghost"} btn-sm`} onClick={() => setView("constructor")}>Constructors</button>
        </div>
      </div>

      {/* Leader spotlight */}
      {leader && (
        <div className="card animate-in" style={{
          background: "linear-gradient(135deg, rgba(225,6,0,0.06), var(--bg-glass))",
          borderColor: "rgba(225,6,0,0.12)",
          display: "flex", alignItems: "center", gap: 40, padding: "28px 36px",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 3, marginBottom: 8 }}>
              {mode === "real" ? "Real" : "Predicted"} {view === "driver" ? "Championship Leader" : "Leading Constructor"}
            </div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 26, fontWeight: 900, display: "flex", alignItems: "center", gap: 12 }}>
              {view === "constructor" && (
                <span style={{ width: 5, height: 28, borderRadius: 3, backgroundColor: teamColors[leader.entity_name] || "#444" }} />
              )}
              {leader.entity_name}
            </div>
            {leader.through_round > 0 && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                Through Round {leader.through_round}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 32 }}>
            {[
              { label: "Points", value: leader.points.toFixed(0), color: accentColor },
              { label: "Wins", value: leader.wins.toString(), color: "var(--accent-yellow)" },
              { label: "Podiums", value: leader.podiums.toString(), color: "var(--accent-blue)" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full standings */}
      <div className="card animate-in">
        <div className="card-header">
          {mode === "real" ? "Real" : "Predicted"} {view === "driver" ? "Driver" : "Constructor"} Standings
        </div>
        {standings.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <p style={{ color: "var(--text-muted)" }}>
              {mode === "predicted"
                ? "No predictions yet. Run race predictions to populate standings."
                : "No real results yet. Results update automatically after each race."}
            </p>
          </div>
        ) : (
          <table className="results-table">
            <thead>
              <tr>
                <th>Pos</th>
                <th>{view === "driver" ? "Driver" : "Team"}</th>
                <th>Points</th>
                <th>Wins</th>
                <th>Podiums</th>
                <th>Through Round</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.entity_name}>
                  <td>
                    <span className={`position-number ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}`}>{i + 1}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {view === "constructor" && (
                      <span className="team-color-bar" style={{ backgroundColor: teamColors[s.entity_name] || "#444" }} />
                    )}
                    {s.entity_name}
                  </td>
                  <td style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 800 }}>{s.points.toFixed(0)}</td>
                  <td>{s.wins}</td>
                  <td>{s.podiums}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>R{s.through_round}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

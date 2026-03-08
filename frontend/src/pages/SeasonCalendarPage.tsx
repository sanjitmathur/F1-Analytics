import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getSeasonCalendar,
  getDriverStandings,
  getConstructorStandings,
  getSeasonTeamColors,
  getRealRaceResults,
} from "../services/api";
import type { RaceWeekend, ChampionshipStanding, TeamColors } from "../types";
import type { RealRaceResult } from "../services/api";
import RaceCalendarCard from "../components/RaceCalendarCard";

export default function SeasonCalendarPage() {
  const navigate = useNavigate();
  const [races, setRaces] = useState<RaceWeekend[]>([]);
  const [driverStandings, setDriverStandings] = useState<ChampionshipStanding[]>([]);
  const [constructorStandings, setConstructorStandings] = useState<ChampionshipStanding[]>([]);
  const [realDriverStandings, setRealDriverStandings] = useState<ChampionshipStanding[]>([]);
  const [realConstructorStandings, setRealConstructorStandings] = useState<ChampionshipStanding[]>([]);
  const [realResults, setRealResults] = useState<Record<number, RealRaceResult[]>>({});
  const [teamColors, setTeamColors] = useState<TeamColors>({});
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"predicted" | "real">("predicted");

  useEffect(() => {
    Promise.all([
      getSeasonCalendar(2026),
      getDriverStandings(2026, true).catch(() => []),
      getConstructorStandings(2026, true).catch(() => []),
      getDriverStandings(2026, false).catch(() => []),
      getConstructorStandings(2026, false).catch(() => []),
      getSeasonTeamColors(2026).catch(() => ({})),
    ]).then(([r, ds, cs, rds, rcs, tc]) => {
      setRaces(r);
      setDriverStandings(ds);
      setConstructorStandings(cs);
      setRealDriverStandings(rds);
      setRealConstructorStandings(rcs);
      setTeamColors(tc);
      setLoading(false);

      // Fetch real results for completed rounds
      const completedRounds = r.filter(race => race.status === "completed").map(race => race.round_number);
      completedRounds.forEach(round => {
        getRealRaceResults(2026, round).then(results => {
          setRealResults(prev => ({ ...prev, [round]: results }));
        }).catch(() => {});
      });
    });
  }, []);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><span className="spinner" /></div>;

  const predicted = races.filter(r => r.status !== "upcoming").length;
  const completed = races.filter(r => r.status === "completed").length;

  const activeDriverStandings = mode === "predicted" ? driverStandings : realDriverStandings;
  const activeConstructorStandings = mode === "predicted" ? constructorStandings : realConstructorStandings;

  return (
    <div>
      <div className="page-header animate-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="section-label">Season Overview</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0 }}>2026 F1 Season</h1>
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
          <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              <strong style={{ color: "var(--text-primary)" }}>{races.length}</strong> Races
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              <strong style={{ color: "var(--accent-blue)" }}>{predicted}</strong> Predicted
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              <strong style={{ color: "var(--accent-green)" }}>{completed}</strong> Completed
            </span>
          </div>
        </div>

        {/* Leader spotlight — right side */}
        <div style={{ display: "flex", gap: 48, textAlign: "right" }}>
          <div>
            <div className="section-label">{mode === "predicted" ? "Predicted" : "Real"} Driver Leader</div>
            {activeDriverStandings.length > 0 ? (
              <>
                <h1 style={{ margin: 0 }}>{activeDriverStandings[0].entity_name}</h1>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}><strong style={{ color: "var(--f1-red)", fontFamily: "'Orbitron', sans-serif" }}>{activeDriverStandings[0].points.toFixed(0)}</strong> pts</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}><strong style={{ color: "var(--accent-green)" }}>{activeDriverStandings[0].wins}</strong> wins</span>
                </div>
              </>
            ) : (
              <h1 style={{ margin: 0, color: "var(--text-muted)" }}>-</h1>
            )}
          </div>
          <div>
            <div className="section-label">{mode === "predicted" ? "Predicted" : "Real"} Constructor Leader</div>
            {activeConstructorStandings.length > 0 ? (
              <>
                <h1 style={{ margin: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                  <span className="team-color-bar" style={{ backgroundColor: teamColors[activeConstructorStandings[0].entity_name] || "#444" }} />
                  {activeConstructorStandings[0].entity_name}
                </h1>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}><strong style={{ color: "var(--f1-red)", fontFamily: "'Orbitron', sans-serif" }}>{activeConstructorStandings[0].points.toFixed(0)}</strong> pts</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}><strong style={{ color: "var(--accent-green)" }}>{activeConstructorStandings[0].wins}</strong> wins</span>
                </div>
              </>
            ) : (
              <h1 style={{ margin: 0, color: "var(--text-muted)" }}>-</h1>
            )}
          </div>
        </div>
      </div>

      {/* Standings tables — only show in real mode when we have data */}
      {mode === "real" && realDriverStandings.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {/* Driver Standings */}
          <div className="card animate-in">
            <div className="card-header">Driver Standings — After Round {realDriverStandings[0]?.through_round}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Pos</th>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Driver</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Pts</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Wins</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Podiums</th>
                </tr>
              </thead>
              <tbody>
                {realDriverStandings.map((s, i) => (
                  <tr key={s.entity_name} style={{ borderBottom: "1px solid var(--border-color)", background: i < 3 ? "rgba(39, 244, 210, 0.05)" : "transparent" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 700, fontFamily: "'Orbitron', sans-serif", color: i === 0 ? "var(--accent-gold, #FFD700)" : i < 3 ? "var(--accent-blue)" : "var(--text-muted)" }}>{i + 1}</td>
                    <td style={{ padding: "8px 12px" }}>{s.entity_name}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, fontFamily: "'Orbitron', sans-serif" }}>{s.points}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: s.wins > 0 ? "var(--accent-green)" : "var(--text-muted)" }}>{s.wins}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: s.podiums > 0 ? "var(--accent-blue)" : "var(--text-muted)" }}>{s.podiums}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Constructor Standings */}
          <div className="card animate-in">
            <div className="card-header">Constructor Standings — After Round {realConstructorStandings[0]?.through_round}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Pos</th>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Team</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Pts</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Wins</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Podiums</th>
                </tr>
              </thead>
              <tbody>
                {realConstructorStandings.map((s, i) => (
                  <tr key={s.entity_name} style={{ borderBottom: "1px solid var(--border-color)", background: i < 3 ? "rgba(39, 244, 210, 0.05)" : "transparent" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 700, fontFamily: "'Orbitron', sans-serif", color: i === 0 ? "var(--accent-gold, #FFD700)" : i < 3 ? "var(--accent-blue)" : "var(--text-muted)" }}>{i + 1}</td>
                    <td style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: teamColors[s.entity_name] || "#444", flexShrink: 0 }} />
                      {s.entity_name}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, fontFamily: "'Orbitron', sans-serif" }}>{s.points}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: s.wins > 0 ? "var(--accent-green)" : "var(--text-muted)" }}>{s.wins}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: s.podiums > 0 ? "var(--accent-blue)" : "var(--text-muted)" }}>{s.podiums}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Race Results tables for completed rounds in real mode */}
      {mode === "real" && Object.keys(realResults).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {Object.entries(realResults).sort(([a], [b]) => Number(a) - Number(b)).map(([roundStr, results]) => {
            const round = Number(roundStr);
            const race = races.find(r => r.round_number === round);
            return (
              <div key={round} className="card animate-in" style={{ marginBottom: 16 }}>
                <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Round {round} — {race?.name || `Race ${round}`}</span>
                  <span style={{ fontSize: 11, color: "var(--accent-green)", fontWeight: 600 }}>COMPLETED</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", width: 50 }}>Pos</th>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>Driver</th>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>Team</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>Pts</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => {
                      const pts = r.status === "finished" ? ({ 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 } as Record<number, number>)[r.position] || 0 : 0;
                      return (
                        <tr key={r.driver} style={{
                          borderBottom: "1px solid var(--border-color)",
                          background: r.position <= 3 && r.status === "finished" ? "rgba(39, 244, 210, 0.05)" : "transparent",
                          opacity: r.status !== "finished" ? 0.5 : 1,
                        }}>
                          <td style={{
                            padding: "8px 12px",
                            fontWeight: 700,
                            fontFamily: "'Orbitron', sans-serif",
                            color: r.status !== "finished" ? "var(--text-muted)"
                              : r.position === 1 ? "var(--accent-gold, #FFD700)"
                              : r.position <= 3 ? "var(--accent-blue)"
                              : "var(--text-muted)",
                          }}>
                            {r.status === "finished" ? r.position : "-"}
                          </td>
                          <td style={{ padding: "8px 12px" }}>{r.driver}</td>
                          <td style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: teamColors[r.team] || "#444", flexShrink: 0 }} />
                            {r.team}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: pts > 0 ? 600 : 400, fontFamily: pts > 0 ? "'Orbitron', sans-serif" : "inherit" }}>
                            {pts > 0 ? pts : "-"}
                          </td>
                          <td style={{
                            padding: "8px 12px",
                            textAlign: "right",
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            color: r.status === "finished" ? "var(--accent-green)" : r.status === "dnf" ? "var(--f1-red)" : "var(--text-muted)",
                          }}>
                            {r.status === "finished" ? "FIN" : r.status.toUpperCase()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* Calendar grid */}
      <div className="card animate-in">
        <div className="card-header">Race Calendar</div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
        }}>
          {races.map(race => (
            <RaceCalendarCard
              key={race.id}
              race={race}
              onClick={() => navigate(`/season/2026/race/${race.round_number}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

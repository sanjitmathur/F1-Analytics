import { useEffect, useState } from "react";
import {
  getDriverStandings,
  getConstructorStandings,
  getSeasonTeamColors,
} from "../services/api";
import type { ChampionshipStanding, TeamColors } from "../types";

export default function ChampionshipPage() {
  const [driverStandings, setDriverStandings] = useState<ChampionshipStanding[]>([]);
  const [constructorStandings, setConstructorStandings] = useState<ChampionshipStanding[]>([]);
  const [teamColors, setTeamColors] = useState<TeamColors>({});
  const [view, setView] = useState<"driver" | "constructor">("driver");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDriverStandings(2026).catch(() => []),
      getConstructorStandings(2026).catch(() => []),
      getSeasonTeamColors(2026).catch(() => ({})),
    ]).then(([ds, cs, tc]) => {
      setDriverStandings(ds);
      setConstructorStandings(cs);
      setTeamColors(tc);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><span className="spinner" /></div>;

  const standings = view === "driver" ? driverStandings : constructorStandings;
  const leader = standings[0];

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="section-label">Championship</div>
          <h1>2026 Standings</h1>
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
              {view === "driver" ? "Championship Leader" : "Leading Constructor"}
            </div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 26, fontWeight: 900 }}>{leader.entity_name}</div>
          </div>
          <div style={{ display: "flex", gap: 32 }}>
            {[
              { label: "Points", value: leader.points.toFixed(0), color: "var(--f1-red)" },
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
        <div className="card-header">{view === "driver" ? "Driver" : "Constructor"} Standings</div>
        {standings.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <p style={{ color: "var(--text-muted)" }}>No predictions yet. Run race predictions to populate standings.</p>
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

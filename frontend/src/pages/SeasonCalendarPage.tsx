import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getSeasonCalendar,
  getDriverStandings,
  getConstructorStandings,
  getSeasonTeamColors,
} from "../services/api";
import type { RaceWeekend, ChampionshipStanding, TeamColors } from "../types";
import RaceCalendarCard from "../components/RaceCalendarCard";

export default function SeasonCalendarPage() {
  const navigate = useNavigate();
  const [races, setRaces] = useState<RaceWeekend[]>([]);
  const [driverStandings, setDriverStandings] = useState<ChampionshipStanding[]>([]);
  const [constructorStandings, setConstructorStandings] = useState<ChampionshipStanding[]>([]);
  const [teamColors, setTeamColors] = useState<TeamColors>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSeasonCalendar(2026),
      getDriverStandings(2026).catch(() => []),
      getConstructorStandings(2026).catch(() => []),
      getSeasonTeamColors(2026).catch(() => ({})),
    ]).then(([r, ds, cs, tc]) => {
      setRaces(r);
      setDriverStandings(ds);
      setConstructorStandings(cs);
      setTeamColors(tc);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><span className="spinner" /></div>;

  const predicted = races.filter(r => r.status !== "upcoming").length;
  const completed = races.filter(r => r.status === "completed").length;

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="section-label">Season Overview</div>
          <h1>2026 F1 Season</h1>
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
      </div>

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

      {/* Championship standings */}
      <div className="grid-2">
        <div className="card animate-in">
          <div className="card-header">Driver Championship</div>
          {driverStandings.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 24 }}>
              No predictions yet. Run a race prediction to see standings.
            </p>
          ) : (
            <table className="results-table">
              <thead>
                <tr><th>Pos</th><th>Driver</th><th>Points</th><th>Wins</th></tr>
              </thead>
              <tbody>
                {driverStandings.slice(0, 10).map((s, i) => (
                  <tr key={s.entity_name}>
                    <td><span className={`position-number ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}`}>{i + 1}</span></td>
                    <td style={{ fontWeight: 600 }}>{s.entity_name}</td>
                    <td style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 800 }}>{s.points.toFixed(0)}</td>
                    <td>{s.wins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card animate-in">
          <div className="card-header">Constructor Championship</div>
          {constructorStandings.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 24 }}>
              No predictions yet.
            </p>
          ) : (
            <table className="results-table">
              <thead>
                <tr><th>Pos</th><th>Team</th><th>Points</th><th>Wins</th></tr>
              </thead>
              <tbody>
                {constructorStandings.map((s, i) => (
                  <tr key={s.entity_name}>
                    <td><span className={`position-number ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}`}>{i + 1}</span></td>
                    <td style={{ fontWeight: 600 }}>
                      <span className="team-color-bar" style={{ backgroundColor: teamColors[s.entity_name] || "#444" }} />
                      {s.entity_name}
                    </td>
                    <td style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 800 }}>{s.points.toFixed(0)}</td>
                    <td>{s.wins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

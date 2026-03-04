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
  const [mode, setMode] = useState<"predicted" | "real">("predicted");

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
                  background: mode === "predicted" ? "var(--accent-red)" : "transparent",
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
                  background: mode === "real" ? "var(--accent-blue)" : "transparent",
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

        {/* Leader spotlight — right side, same h1 font */}
        <div style={{ display: "flex", gap: 48, textAlign: "right" }}>
          <div>
            <div className="section-label">{mode === "predicted" ? "Predicted" : "Real"} Driver Leader</div>
            {mode === "predicted" && driverStandings.length > 0 ? (
              <>
                <h1 style={{ margin: 0 }}>{driverStandings[0].entity_name}</h1>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}><strong style={{ color: "var(--accent-red)", fontFamily: "'Orbitron', sans-serif" }}>{driverStandings[0].points.toFixed(0)}</strong> pts</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}><strong style={{ color: "var(--accent-green)" }}>{driverStandings[0].wins}</strong> wins</span>
                </div>
              </>
            ) : mode === "predicted" ? (
              <h1 style={{ margin: 0, color: "var(--text-muted)" }}>-</h1>
            ) : (
              <>
                <h1 style={{ margin: 0, color: "var(--text-muted)" }}>-</h1>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}><strong>-</strong> pts</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}><strong>-</strong> wins</span>
                </div>
              </>
            )}
          </div>
          <div>
            <div className="section-label">{mode === "predicted" ? "Predicted" : "Real"} Constructor Leader</div>
            {mode === "predicted" && constructorStandings.length > 0 ? (
              <>
                <h1 style={{ margin: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                  <span className="team-color-bar" style={{ backgroundColor: teamColors[constructorStandings[0].entity_name] || "#444" }} />
                  {constructorStandings[0].entity_name}
                </h1>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}><strong style={{ color: "var(--accent-red)", fontFamily: "'Orbitron', sans-serif" }}>{constructorStandings[0].points.toFixed(0)}</strong> pts</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}><strong style={{ color: "var(--accent-green)" }}>{constructorStandings[0].wins}</strong> wins</span>
                </div>
              </>
            ) : mode === "predicted" ? (
              <h1 style={{ margin: 0, color: "var(--text-muted)" }}>-</h1>
            ) : (
              <>
                <h1 style={{ margin: 0, color: "var(--text-muted)" }}>-</h1>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}><strong>-</strong> pts</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}><strong>-</strong> wins</span>
                </div>
              </>
            )}
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
    </div>
  );
}

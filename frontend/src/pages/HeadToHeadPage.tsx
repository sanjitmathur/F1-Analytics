import { useEffect, useState, useCallback } from "react";
import { getSeasonDrivers, getSeasonTeamColors, getHeadToHead } from "../services/api";
import type { Driver2026, HeadToHeadResult, TeamColors } from "../types";
import DriverComparison from "../components/DriverComparison";
import DriverRadarChart from "../components/DriverRadarChart";

/* Real F1 driver skill profiles — researched from 2020-2025 performance data.
 * Sources: F1Pace qualifying deltas, PlanetF1 H2H stats, Motorsport.com season reviews,
 * Formula1.com stats. Each stat is 0-100. See agent research for detailed justifications. */
const DRIVER_PROFILES: Record<string, { pace: number; racecraft: number; consistency: number; wet: number; experience: number; qualifying: number }> = {
  "Max Verstappen":        { pace: 98, racecraft: 97, consistency: 95, wet: 98, experience: 88, qualifying: 97 },
  "Lewis Hamilton":        { pace: 88, racecraft: 95, consistency: 82, wet: 94, experience: 99, qualifying: 88 },
  "Charles Leclerc":       { pace: 95, racecraft: 88, consistency: 80, wet: 82, experience: 78, qualifying: 96 },
  "Lando Norris":          { pace: 94, racecraft: 90, consistency: 88, wet: 85, experience: 75, qualifying: 94 },
  "Oscar Piastri":         { pace: 92, racecraft: 89, consistency: 85, wet: 74, experience: 55, qualifying: 90 },
  "Carlos Sainz":          { pace: 86, racecraft: 88, consistency: 90, wet: 80, experience: 82, qualifying: 85 },
  "George Russell":        { pace: 91, racecraft: 84, consistency: 87, wet: 89, experience: 72, qualifying: 93 },
  "Fernando Alonso":       { pace: 82, racecraft: 94, consistency: 86, wet: 92, experience: 99, qualifying: 83 },
  "Pierre Gasly":          { pace: 80, racecraft: 78, consistency: 82, wet: 75, experience: 74, qualifying: 81 },
  "Alexander Albon":       { pace: 81, racecraft: 82, consistency: 83, wet: 80, experience: 68, qualifying: 80 },
  "Yuki Tsunoda":          { pace: 79, racecraft: 72, consistency: 68, wet: 65, experience: 60, qualifying: 78 },
  "Nico Hulkenberg":       { pace: 78, racecraft: 76, consistency: 84, wet: 85, experience: 90, qualifying: 80 },
  "Lance Stroll":          { pace: 68, racecraft: 65, consistency: 60, wet: 72, experience: 76, qualifying: 62 },
  "Esteban Ocon":          { pace: 76, racecraft: 74, consistency: 75, wet: 72, experience: 74, qualifying: 75 },
  "Kevin Magnussen":       { pace: 72, racecraft: 80, consistency: 62, wet: 68, experience: 78, qualifying: 70 },
  "Valtteri Bottas":       { pace: 78, racecraft: 65, consistency: 80, wet: 72, experience: 92, qualifying: 82 },
  "Zhou Guanyu":           { pace: 62, racecraft: 58, consistency: 65, wet: 55, experience: 52, qualifying: 60 },
  "Daniel Ricciardo":      { pace: 76, racecraft: 92, consistency: 72, wet: 78, experience: 90, qualifying: 78 },
  "Logan Sargeant":        { pace: 55, racecraft: 50, consistency: 42, wet: 40, experience: 32, qualifying: 52 },
  "Andrea Kimi Antonelli": { pace: 90, racecraft: 78, consistency: 65, wet: 72, experience: 30, qualifying: 88 },
  "Isack Hadjar":          { pace: 84, racecraft: 76, consistency: 78, wet: 68, experience: 28, qualifying: 85 },
  "Jack Doohan":           { pace: 65, racecraft: 58, consistency: 52, wet: 55, experience: 22, qualifying: 62 },
  "Gabriel Bortoleto":     { pace: 78, racecraft: 72, consistency: 70, wet: 62, experience: 25, qualifying: 76 },
  "Arvid Lindblad":        { pace: 82, racecraft: 70, consistency: 65, wet: 60, experience: 15, qualifying: 80 },
  "Sergio Perez":          { pace: 75, racecraft: 82, consistency: 68, wet: 70, experience: 95, qualifying: 68 },
  "Oliver Bearman":        { pace: 80, racecraft: 75, consistency: 73, wet: 68, experience: 26, qualifying: 78 },
};

function getDriverStats(name: string, skill: number) {
  if (DRIVER_PROFILES[name]) return DRIVER_PROFILES[name];
  // Fallback: derive from skill for unknown/custom drivers
  const base = Math.round(90 + skill * -50);
  const c = Math.min(Math.max(base, 55), 95);
  return { pace: c, racecraft: c - 3, consistency: c - 1, wet: c - 5, experience: c - 8, qualifying: c + 1 };
}

type YearOption = "2026" | "2025" | "2024" | "2023" | "2022" | "2021" | "2020";
const YEARS: YearOption[] = ["2026", "2025", "2024", "2023", "2022", "2021", "2020"];

export default function HeadToHeadPage() {
  const [drivers, setDrivers] = useState<Driver2026[]>([]);
  const [teamColors, setTeamColors] = useState<TeamColors>({});
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [driver1, setDriver1] = useState<string | null>(null);
  const [driver2, setDriver2] = useState<string | null>(null);
  const [comparisonYear, setComparisonYear] = useState<YearOption>("2026");
  const [result, setResult] = useState<HeadToHeadResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      getSeasonDrivers(2026),
      getSeasonTeamColors(2026).catch(() => ({})),
    ]).then(([d, tc]) => {
      setDrivers(d);
      setTeamColors(tc);
    });
  }, []);

  // Get unique teams in order
  const teams = [...new Map(drivers.map(d => [d.team, d.team])).keys()];

  // Filter drivers by selected team
  const visibleDrivers = selectedTeam
    ? drivers.filter(d => d.team === selectedTeam)
    : drivers;

  // Auto-compare when 2 drivers selected or year changes
  const fetchComparison = useCallback(async (d1: string, d2: string, year: YearOption) => {
    setLoading(true);
    try {
      const data = await getHeadToHead(d1, d2, undefined, parseInt(year));
      setResult(data);
    } catch {
      setResult(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (driver1 && driver2) {
      fetchComparison(driver1, driver2, comparisonYear);
    } else {
      setResult(null);
    }
  }, [driver1, driver2, comparisonYear, fetchComparison]);

  const handleDriverClick = (name: string) => {
    if (driver1 === name) {
      setDriver1(null);
    } else if (driver2 === name) {
      setDriver2(null);
    } else if (!driver1) {
      setDriver1(name);
    } else if (!driver2) {
      setDriver2(name);
    } else {
      // Both slots full — replace driver2
      setDriver2(name);
    }
  };

  const handleTeamFilter = (team: string) => {
    setSelectedTeam(prev => (prev === team ? null : team));
  };

  const getDriverTeam = (name: string | null) =>
    drivers.find(d => d.name === name)?.team;

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="section-label">Analysis</div>
          <h1>Head-to-Head</h1>
        </div>
      </div>

      {/* Year Selector */}
      <div className="card animate-in">
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)" }}>Season</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {YEARS.map(y => (
            <button
              key={y}
              className={comparisonYear === y ? "btn btn-primary" : "btn btn-ghost"}
              style={{ fontSize: 12, padding: "6px 14px" }}
              onClick={() => setComparisonYear(y)}
            >
              {y === "2026" ? "2026 Predicted" : y}
            </button>
          ))}
        </div>
      </div>

      {/* Team Filter + Driver Grid */}
      <div className="card animate-in">
        {/* Team filter buttons */}
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)" }}>Filter by Team</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          <button
            className={selectedTeam === null ? "btn btn-primary" : "btn btn-ghost"}
            style={{ fontSize: 11, padding: "5px 12px" }}
            onClick={() => setSelectedTeam(null)}
          >
            All
          </button>
          {teams.map(team => (
            <button
              key={team}
              className="btn btn-ghost"
              style={{
                fontSize: 11,
                padding: "5px 12px",
                borderColor: selectedTeam === team ? (teamColors[team] || "var(--border-color)") : "var(--border-color)",
                background: selectedTeam === team ? `${teamColors[team] || "var(--f1-red)"}22` : undefined,
                color: selectedTeam === team ? (teamColors[team] || "var(--text-primary)") : undefined,
              }}
              onClick={() => handleTeamFilter(team)}
            >
              {team}
            </button>
          ))}
        </div>

        {/* Driver grid */}
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)" }}>
            Select two drivers {driver1 && !driver2 && "— pick a second driver"}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
          {visibleDrivers.map(d => {
            const isD1 = driver1 === d.name;
            const isD2 = driver2 === d.name;
            const isSelected = isD1 || isD2;
            const color = teamColors[d.team] || "var(--f1-red)";
            return (
              <button
                key={d.name}
                onClick={() => handleDriverClick(d.name)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: isSelected ? `${color}18` : "var(--bg-card)",
                  border: `2px solid ${isSelected ? color : "var(--border-color)"}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: isSelected ? `0 0 12px ${color}44` : "none",
                  textAlign: "left",
                  width: "100%",
                  color: "var(--text-primary)",
                }}
              >
                <div style={{
                  width: 4,
                  height: 28,
                  borderRadius: 2,
                  background: color,
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    color: isSelected ? color : "var(--text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {d.name}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{d.team}</div>
                </div>
                {isSelected && (
                  <div style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 9,
                    fontWeight: 800,
                    color,
                    background: `${color}22`,
                    padding: "2px 6px",
                    borderRadius: 4,
                    flexShrink: 0,
                  }}>
                    {isD1 ? "D1" : "D2"}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="card animate-in" style={{ textAlign: "center", padding: 40 }}>
          <span className="spinner" style={{ width: 32, height: 32, borderWidth: 2, margin: "0 auto 12px", display: "block" }} />
          <p style={{ color: "var(--text-muted)" }}>Loading comparison...</p>
        </div>
      )}

      {result && !loading && (
        <>
          <div className="card animate-in">
            <DriverComparison
              data={result}
              teamColors={teamColors}
              driver1Team={getDriverTeam(driver1)}
              driver2Team={getDriverTeam(driver2)}
            />
          </div>

          {driver1 && driver2 && (() => {
            const d1 = drivers.find(d => d.name === driver1);
            const d2 = drivers.find(d => d.name === driver2);
            const stats1 = getDriverStats(driver1, d1?.skill ?? 0);
            const stats2 = getDriverStats(driver2, d2?.skill ?? 0);
            return (
              <div className="card animate-in">
                <div className="card-header">Skill Comparison</div>
                <DriverRadarChart
                  driver1={{ name: driver1, team: getDriverTeam(driver1) || "", stats: stats1 }}
                  driver2={{ name: driver2, team: getDriverTeam(driver2) || "", stats: stats2 }}
                  teamColor1={teamColors[getDriverTeam(driver1) || ""] || "#e10600"}
                  teamColor2={teamColors[getDriverTeam(driver2) || ""] || "#448aff"}
                />
              </div>
            );
          })()}
        </>
      )}

      {!result && !loading && (
        <div className="card animate-in" style={{ textAlign: "center", padding: 60 }}>
          <p style={{ color: "var(--text-muted)" }}>
            Click two drivers above to compare. Run race predictions first for meaningful 2026 data.
          </p>
        </div>
      )}
    </div>
  );
}

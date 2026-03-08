import { useEffect, useState, useCallback } from "react";
import { getSeasonDrivers, getSeasonTeamColors, getHeadToHead, getDriverSkills } from "../services/api";
import type { DriverSkillProfile } from "../services/api";
import type { Driver2026, HeadToHeadResult, TeamColors } from "../types";
import DriverComparison from "../components/DriverComparison";
import DriverRadarChart from "../components/DriverRadarChart";

const FALLBACK_PROFILE = { pace: 60, racecraft: 57, consistency: 59, wet: 55, experience: 52, qualifying: 61 };

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
  const [skillProfiles, setSkillProfiles] = useState<Record<string, DriverSkillProfile>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      getSeasonDrivers(2026),
      getSeasonTeamColors(2026).catch(() => ({})),
      getDriverSkills(2026).catch(() => ({})),
    ]).then(([d, tc, sk]) => {
      setDrivers(d);
      setTeamColors(tc);
      setSkillProfiles(sk);
    });
  }, []);

  // Fetch skill profiles when year changes
  useEffect(() => {
    getDriverSkills(parseInt(comparisonYear)).then(setSkillProfiles).catch(() => setSkillProfiles({}));
  }, [comparisonYear]);

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
            const stats1 = skillProfiles[driver1] || FALLBACK_PROFILE;
            const stats2 = skillProfiles[driver2] || FALLBACK_PROFILE;
            const hasData = Object.keys(skillProfiles).length > 0;
            return (
              <div className="card animate-in">
                <div className="card-header">Skill Comparison — {comparisonYear}{!hasData && " (no data)"}</div>
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

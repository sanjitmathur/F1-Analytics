import { useEffect, useState } from "react";
import {
  getSeasonCalendar,
  getSeasonTeamColors,
  getRaceWeather,
  getWeatherImpact,
} from "../services/api";
import type { RaceWeekend, WeatherData, TeamColors } from "../types";
import WeatherBadge from "../components/WeatherBadge";

export default function WeatherAnalysisPage() {
  const [races, setRaces] = useState<RaceWeekend[]>([]);
  const [teamColors, setTeamColors] = useState<TeamColors>({});
  const [selectedRace, setSelectedRace] = useState<number | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [impact, setImpact] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSeasonCalendar(2026),
      getSeasonTeamColors(2026).catch(() => ({})),
    ]).then(([r, tc]) => {
      setRaces(r);
      setTeamColors(tc);
      if (r.length > 0) setSelectedRace(r[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedRace) return;
    getRaceWeather(selectedRace).then(setWeather).catch(() => setWeather(null));
    getWeatherImpact(selectedRace).then(setImpact).catch(() => setImpact(null));
  }, [selectedRace]);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><span className="spinner" /></div>;

  const rainChangers = (impact?.rain_changers as { driver_name: string; team: string; dry_position: number; wet_position: number; delta: number }[]) || [];

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="section-label">Analysis</div>
          <h1>Weather Impact</h1>
        </div>
      </div>

      <div className="card animate-in">
        <div className="form-group">
          <label>Select Race Weekend</label>
          <select value={selectedRace ?? ""} onChange={e => setSelectedRace(Number(e.target.value))}>
            {races.map(r => <option key={r.id} value={r.id}>R{r.round_number}: {r.name}</option>)}
          </select>
        </div>
      </div>

      {weather && (
        <div className="card animate-in">
          <div className="card-header">Current Forecast</div>
          <div style={{ display: "flex", gap: 32, alignItems: "center", padding: "8px 0" }}>
            <WeatherBadge condition={weather.condition} temperature={weather.temperature} />
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Rain probability: <strong>{weather.rain_probability ?? "N/A"}%</strong>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Wind: <strong>{weather.wind_speed ?? "N/A"} km/h</strong>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Humidity: <strong>{weather.humidity ?? "N/A"}%</strong>
              </div>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
              Source: {weather.source}
            </div>
          </div>
        </div>
      )}

      {rainChangers.length > 0 && (
        <div className="card animate-in">
          <div className="card-header">Rain Changers — Position Delta (Dry vs Wet)</div>
          <table className="results-table">
            <thead>
              <tr>
                <th>Driver</th><th>Team</th><th>Dry Pos</th><th>Wet Pos</th><th>Delta</th>
              </tr>
            </thead>
            <tbody>
              {rainChangers.map(d => (
                <tr key={d.driver_name}>
                  <td style={{ fontWeight: 600 }}>
                    <span className="team-color-bar" style={{ backgroundColor: teamColors[d.team] || "#444" }} />
                    {d.driver_name}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{d.team}</td>
                  <td style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12 }}>P{d.dry_position.toFixed(1)}</td>
                  <td style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12 }}>P{d.wet_position.toFixed(1)}</td>
                  <td style={{
                    fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 800,
                    color: d.delta > 0 ? "var(--accent-green)" : d.delta < 0 ? "var(--f1-red)" : "var(--text-muted)",
                  }}>
                    {d.delta > 0 ? "+" : ""}{d.delta.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!rainChangers.length && (
        <div className="card animate-in" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "var(--text-muted)" }}>
            Run both dry and wet predictions for a race to see weather impact analysis.
          </p>
        </div>
      )}
    </div>
  );
}

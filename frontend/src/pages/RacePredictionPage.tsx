import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getSeasonCalendar,
  getSeasonTeamColors,
  startRacePrediction,
  getPredictionStatus,
  getRaceWeekendPredictions,
  deleteRaceWeekendPredictions,
  getRaceWeather,
} from "../services/api";
import type { RaceWeekend, RacePrediction, TeamColors, WeatherData } from "../types";
import PodiumSpotlight from "../components/PodiumSpotlight";
import QualifyingBracket from "../components/QualifyingBracket";
import WeatherBadge from "../components/WeatherBadge";
import MonteCarloDistribution from "../components/MonteCarloDistribution";
import CircuitMap from "../components/CircuitMap";

export default function RacePredictionPage() {
  const { round } = useParams<{ round: string }>();
  const [race, setRace] = useState<RaceWeekend | null>(null);
  const [teamColors, setTeamColors] = useState<TeamColors>({});
  const [predictions, setPredictions] = useState<RacePrediction[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<"race" | "qualifying">("race");
  const [numSims, setNumSims] = useState(500);
  const [weatherOverride, setWeatherOverride] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!round) return;
    Promise.all([
      getSeasonCalendar(2026),
      getSeasonTeamColors(2026).catch(() => ({})),
    ]).then(([races, tc]) => {
      const r = races.find(r => r.round_number === Number(round));
      setRace(r || null);
      setTeamColors(tc);
      if (r) {
        getRaceWeather(r.id).then(setWeather).catch(() => {});
        getRaceWeekendPredictions(r.id).then(setPredictions).catch(() => {});
      }
      setLoading(false);
    });
  }, [round]);

  const handleRunPrediction = async () => {
    if (!race) return;
    setRunning(true);
    setProgress(0);

    try {
      const resp = await startRacePrediction(race.id, {
        num_simulations: numSims,
        weather_override: weatherOverride || undefined,
      });

      // Poll race prediction (qualifying usually finishes first)
      const raceId = resp.race_prediction_id;
      const poll = async () => {
        try {
          const status = await getPredictionStatus(raceId);
          setProgress(status.progress_pct);
          if (status.status === "completed" || status.status === "failed") {
            const preds = await getRaceWeekendPredictions(race.id);
            setPredictions(preds);
            setRunning(false);
          } else {
            setTimeout(poll, 1500);
          }
        } catch {
          setRunning(false);
        }
      };
      setTimeout(poll, 2000);
    } catch {
      setRunning(false);
    }
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><span className="spinner" /></div>;
  if (!race) return <div className="card" style={{ textAlign: "center", padding: 60 }}><h2>Race not found</h2><Link to="/season/2026" className="btn btn-secondary">Back</Link></div>;

  const qualiPred = predictions.find(p => p.prediction_type === "qualifying" && p.status === "completed");
  const racePred = predictions.find(p => p.prediction_type === "race" && p.status === "completed");
  const activeResults = activeTab === "qualifying" ? qualiPred?.results : racePred?.results;

  // Adapt results for MonteCarloDistribution
  const adaptedDrivers = activeResults?.map(r => ({
    driver_name: r.driver_name,
    team: r.team,
    win_pct: r.win_pct,
    podium_pct: r.podium_pct,
    top5_pct: r.top5_pct,
    top10_pct: r.top10_pct,
    dnf_pct: r.dnf_pct,
    avg_position: r.predicted_position,
    avg_gap: 0,
    best_position: 1,
    worst_position: 22,
    position_distribution: Object.fromEntries(
      Object.entries(r.position_distribution).map(([k, v]) => [Number(k), v])
    ),
  })) || [];

  return (
    <div>
      {/* Header */}
      <div className="page-header animate-in">
        <div>
          <div className="section-label">Round {race.round_number}</div>
          <h1>{race.name}</h1>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 4 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{race.track_name} — {race.country}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{race.race_date}</span>
            {weather && <WeatherBadge condition={weather.condition} temperature={weather.temperature} />}
          </div>
        </div>
        <Link to="/season/2026" className="btn btn-secondary btn-sm">Back</Link>
      </div>

      {/* Track info + Circuit map */}
      <div className="animate-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Left — Track Info */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-header">Track Info</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
            {[
              { label: "Laps", value: race.total_laps },
              { label: "Base Lap Time", value: `${race.base_lap_time}s` },
              { label: "Pit Loss", value: `${race.pit_loss_time}s` },
              { label: "DRS Zones", value: race.drs_zones },
              { label: "Overtake Difficulty", value: `${race.overtake_difficulty}x` },
              { label: "Safety Car Chance", value: `${(race.safety_car_probability * 100).toFixed(0)}%` },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>{item.label}</span>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, fontWeight: 800 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Circuit Map */}
        <div className="card" style={{ margin: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircuitMap trackName={race.track_name} color="var(--f1-red)" size={300} />
        </div>
      </div>

      {/* Run / Advanced */}
      <div className="card animate-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              className="btn btn-primary"
              onClick={handleRunPrediction}
              disabled={running}
              style={{ padding: "12px 32px" }}
            >
              {running ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  {progress.toFixed(0)}%
                </span>
              ) : predictions.length > 0 ? (
                "Re-run Prediction"
              ) : (
                "Run Prediction"
              )}
            </button>
            {predictions.length > 0 && (
              <button
                className="btn btn-sm"
                style={{ background: "var(--f1-red)", color: "#fff", border: "none" }}
                disabled={running}
                onClick={async () => {
                  if (!race || !confirm("Delete all predictions for this race?")) return;
                  try {
                    await deleteRaceWeekendPredictions(race.id);
                    setPredictions([]);
                  } catch { /* ignore */ }
                }}
              >
                Delete Prediction
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? "Hide" : "Advanced"} Options
            </button>
          </div>
          {racePred && (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {racePred.num_simulations.toLocaleString()} sims · {racePred.weather_condition}
            </span>
          )}
        </div>

        {showAdvanced && (
          <div style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Simulations</label>
              <input type="number" min={50} max={5000} value={numSims} onChange={e => setNumSims(Number(e.target.value))} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Weather Override</label>
              <select value={weatherOverride} onChange={e => setWeatherOverride(e.target.value)}>
                <option value="">Auto (forecast)</option>
                <option value="dry">Dry</option>
                <option value="wet">Wet</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {activeResults && activeResults.length > 0 && (
        <>
          {/* Tab selector */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }} className="animate-in">
            {(["race", "qualifying"] as const).map(tab => (
              <button
                key={tab}
                className={`btn ${activeTab === tab ? "btn-primary" : "btn-ghost"} btn-sm`}
                onClick={() => setActiveTab(tab)}
                style={{ textTransform: "capitalize" }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Qualifying bracket */}
          {activeTab === "qualifying" && qualiPred && (
            <div className="card animate-in">
              <div className="card-header">Qualifying Bracket</div>
              <QualifyingBracket results={qualiPred.results} teamColors={teamColors} />
            </div>
          )}

          {/* Race podium + probability */}
          {activeTab === "race" && racePred && (
            <>
              <div className="card animate-in">
                <div className="card-header">Podium Prediction</div>
                <PodiumSpotlight results={racePred.results} teamColors={teamColors} />
              </div>

              <div className="card animate-in">
                <div className="card-header">Win Probability</div>
                <MonteCarloDistribution drivers={adaptedDrivers} teamColors={teamColors} metric="win_pct" label="Win %" />
              </div>
            </>
          )}

          {/* Full probability matrix */}
          <div className="card animate-in">
            <div className="card-header">Full Probability Matrix</div>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Driver</th><th>Team</th><th>Avg Pos</th><th>Win %</th>
                  <th>Podium %</th><th>Top 5 %</th><th>DNF %</th>
                </tr>
              </thead>
              <tbody>
                {activeResults.map((d) => (
                  <tr key={d.driver_name}>
                    <td style={{ fontWeight: 600 }}>
                      <span className="team-color-bar" style={{ backgroundColor: teamColors[d.team] || "#444" }} />
                      {d.driver_name}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>{d.team}</td>
                    <td style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 800 }}>{d.predicted_position.toFixed(1)}</td>
                    <td style={{ color: "var(--f1-red)", fontWeight: 600 }}>{d.win_pct.toFixed(1)}</td>
                    <td>{d.podium_pct.toFixed(1)}</td>
                    <td>{d.top5_pct.toFixed(1)}</td>
                    <td style={{ color: d.dnf_pct > 5 ? "var(--f1-red)" : "var(--text-secondary)" }}>{d.dnf_pct.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Empty state */}
      {!activeResults && !running && (
        <div className="card animate-in" style={{ textAlign: "center", padding: 60 }}>
          <div className="empty-state">
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No predictions yet. Click "Run Prediction" to start.</p>
          </div>
        </div>
      )}
    </div>
  );
}

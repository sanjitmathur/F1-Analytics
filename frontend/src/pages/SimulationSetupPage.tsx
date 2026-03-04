import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listTracks,
  getPresetDrivers,
  getTeamColors,
  getSeasonDrivers,
  startSimulation,
} from "../services/api";
import type { Track, PresetDriver, DriverConfig, PitStopPlan, TeamColors } from "../types";

const COMPOUNDS = ["SOFT", "MEDIUM", "HARD"];
const COMPOUND_COLORS: Record<string, string> = { SOFT: "#e10600", MEDIUM: "#ffd600", HARD: "#e0e0e0" };

export default function SimulationSetupPage() {
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [presetDrivers, setPresetDrivers] = useState<PresetDriver[]>([]);
  const [teamColors, setTeamColors] = useState<TeamColors>({});
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [drivers, setDrivers] = useState<DriverConfig[]>([]);
  const [simName, setSimName] = useState("");
  const [simType, setSimType] = useState<"single" | "monte_carlo">("single");
  const [numSims, setNumSims] = useState(500);
  const [weather, setWeather] = useState("dry");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([listTracks(), getPresetDrivers(), getTeamColors()]).then(
      ([t, d, c]) => {
        setTracks(t);
        setPresetDrivers(d);
        setTeamColors(c);
        if (t.length > 0) setSelectedTrackId(t[0].id);
      }
    );
  }, []);

  const selectedTrack = tracks.find(t => t.id === selectedTrackId);

  const addAllPresetDrivers = () => {
    const totalLaps = selectedTrack?.total_laps || 50;
    const newDrivers: DriverConfig[] = presetDrivers.map((d, i) => ({
      name: d.name,
      team: d.team,
      skill: d.skill,
      grid_position: i + 1,
      starting_compound: "MEDIUM",
      pit_stops: [{ lap: Math.round(totalLaps * 0.5), compound: "HARD" }],
      dnf_chance_per_lap: 0.001,
    }));
    setDrivers(newDrivers);
  };

  const addDriver = () => {
    setDrivers([...drivers, {
      name: "New Driver", team: "Team", skill: 0, grid_position: drivers.length + 1,
      starting_compound: "MEDIUM", pit_stops: [], dnf_chance_per_lap: 0.001,
    }]);
  };

  const updateDriver = (index: number, updates: Partial<DriverConfig>) => {
    setDrivers(prev => prev.map((d, i) => (i === index ? { ...d, ...updates } : d)));
  };

  const removeDriver = (index: number) => {
    setDrivers(prev => prev.filter((_, i) => i !== index));
  };

  const addPitStop = (di: number) => {
    const totalLaps = selectedTrack?.total_laps || 50;
    setDrivers(prev => prev.map((d, i) => i === di ? { ...d, pit_stops: [...d.pit_stops, { lap: Math.round(totalLaps * 0.5), compound: "HARD" }] } : d));
  };

  const updatePitStop = (di: number, si: number, updates: Partial<PitStopPlan>) => {
    setDrivers(prev => prev.map((d, i) => i === di ? { ...d, pit_stops: d.pit_stops.map((ps, j) => j === si ? { ...ps, ...updates } : ps) } : d));
  };

  const removePitStop = (di: number, si: number) => {
    setDrivers(prev => prev.map((d, i) => i === di ? { ...d, pit_stops: d.pit_stops.filter((_, j) => j !== si) } : d));
  };

  const handleSubmit = async () => {
    if (!selectedTrackId || drivers.length < 2) return;
    setSubmitting(true);
    try {
      const resp = await startSimulation({
        name: simName || undefined,
        track_id: selectedTrackId,
        drivers,
        sim_type: simType,
        num_simulations: simType === "monte_carlo" ? numSims : 1,
        weather,
      });
      navigate(simType === "monte_carlo" ? `/monte-carlo/${resp.id}` : `/results/${resp.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="section-label">Configuration</div>
          <h1>Race Setup</h1>
        </div>
      </div>

      {/* Track + Sim Config */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card animate-in">
          <div className="card-header">Race Configuration</div>
          <div className="form-group">
            <label>Simulation Name</label>
            <input value={simName} onChange={e => setSimName(e.target.value)} placeholder="e.g., Monaco Strategy Test" />
          </div>
          <div className="form-group">
            <label>Circuit</label>
            <select value={selectedTrackId ?? ""} onChange={e => setSelectedTrackId(Number(e.target.value))}>
              {tracks.map(t => (
                <option key={t.id} value={t.id}>{t.name} — {t.country}</option>
              ))}
            </select>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Mode</label>
              <select value={simType} onChange={e => setSimType(e.target.value as "single" | "monte_carlo")}>
                <option value="single">Single Race</option>
                <option value="monte_carlo">Monte Carlo</option>
              </select>
            </div>
            {simType === "monte_carlo" && (
              <div className="form-group">
                <label>Iterations</label>
                <input type="number" min={10} max={10000} value={numSims} onChange={e => setNumSims(Number(e.target.value))} />
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Weather Conditions</label>
            <select value={weather} onChange={e => setWeather(e.target.value)}>
              <option value="dry">Dry</option>
              <option value="wet">Wet</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
        </div>

        {/* Track stats preview */}
        {selectedTrack && (
          <div className="card animate-in">
            <div className="card-header">{selectedTrack.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Laps", value: selectedTrack.total_laps },
                { label: "Base Lap", value: `${selectedTrack.base_lap_time}s` },
                { label: "Pit Loss", value: `${selectedTrack.pit_loss_time}s` },
                { label: "DRS Zones", value: selectedTrack.drs_zones },
                { label: "Overtake", value: `${selectedTrack.overtake_difficulty}x` },
                { label: "SC Chance", value: `${(selectedTrack.safety_car_probability * 100).toFixed(0)}%` },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 20, fontWeight: 800 }}>{item.value}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1.5, marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drivers */}
      <div className="card animate-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div className="card-header" style={{ marginBottom: 0 }}>
            Grid — {drivers.length} Driver{drivers.length !== 1 ? "s" : ""}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={addAllPresetDrivers}>Load 2024 Grid</button>
            <button className="btn btn-secondary btn-sm" onClick={async () => {
              try {
                const d2026 = await getSeasonDrivers(2026);
                const totalLaps = selectedTrack?.total_laps || 50;
                setDrivers(d2026.map((d, i) => ({
                  name: d.name, team: d.team, skill: d.skill,
                  grid_position: i + 1, starting_compound: "MEDIUM",
                  pit_stops: [{ lap: Math.round(totalLaps * 0.5), compound: "HARD" }],
                  dnf_chance_per_lap: 0.001,
                })));
              } catch { /* ignore */ }
            }}>Load 2026 Grid</button>
            <button className="btn btn-ghost btn-sm" onClick={addDriver}>+ Custom</button>
          </div>
        </div>

        {drivers.length === 0 ? (
          <div className="empty-state" style={{ padding: "40px 20px" }}>
            <p style={{ color: "var(--text-muted)" }}>No drivers on the grid. Load the 2024 preset or add custom drivers.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {drivers.map((driver, di) => (
              <div key={di} style={{
                display: "flex", alignItems: "center", gap: 16, padding: "14px 16px",
                borderRadius: "var(--radius-sm)", background: "var(--bg-glass)",
                border: "1px solid var(--border-color)",
                borderLeft: `3px solid ${teamColors[driver.team] || "#333"}`,
              }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 800, color: "var(--text-muted)", width: 28, textAlign: "center" }}>
                  P{driver.grid_position}
                </span>
                <input value={driver.name} onChange={e => updateDriver(di, { name: e.target.value })} style={{ flex: 2, minWidth: 120, padding: "8px 12px", fontSize: 13 }} />
                <input value={driver.team} onChange={e => updateDriver(di, { team: e.target.value })} style={{ flex: 1.5, minWidth: 100, padding: "8px 12px", fontSize: 13 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>SKL</span>
                  <input type="number" step={0.1} value={driver.skill} onChange={e => updateDriver(di, { skill: Number(e.target.value) })} style={{ width: 60, padding: "8px", fontSize: 13, textAlign: "center" }} />
                </div>
                <select value={driver.starting_compound} onChange={e => updateDriver(di, { starting_compound: e.target.value })} style={{ width: 90, padding: "8px", fontSize: 12, borderLeft: `3px solid ${COMPOUND_COLORS[driver.starting_compound]}` }}>
                  {COMPOUNDS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {/* Pit stops inline */}
                <div style={{ display: "flex", gap: 4, alignItems: "center", flex: 1 }}>
                  {driver.pit_stops.map((ps, si) => (
                    <div key={si} style={{ display: "flex", alignItems: "center", gap: 2, background: "var(--bg-glass)", borderRadius: 6, padding: "4px 8px", fontSize: 11 }}>
                      <span style={{ color: "var(--text-muted)" }}>L</span>
                      <input type="number" min={1} value={ps.lap} onChange={e => updatePitStop(di, si, { lap: Number(e.target.value) })} style={{ width: 40, padding: "4px", fontSize: 11, textAlign: "center", background: "transparent", border: "none" }} />
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: COMPOUND_COLORS[ps.compound] }} title={ps.compound} />
                      <select value={ps.compound} onChange={e => updatePitStop(di, si, { compound: e.target.value })} style={{ width: 44, padding: "2px", fontSize: 10, background: "transparent", border: "none", color: "var(--text-secondary)" }}>
                        {COMPOUNDS.map(c => <option key={c} value={c}>{c.charAt(0)}</option>)}
                      </select>
                      <button onClick={() => removePitStop(di, si)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer", padding: 0 }}>x</button>
                    </div>
                  ))}
                  <button onClick={() => addPitStop(di)} style={{ background: "none", border: "1px dashed var(--border-color)", borderRadius: 6, color: "var(--text-muted)", fontSize: 10, padding: "4px 8px", cursor: "pointer" }}>+PIT</button>
                </div>

                <button onClick={() => removeDriver(di)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: "4px 8px" }}>x</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }} className="animate-in">
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || drivers.length < 2 || !selectedTrackId}
          style={{ padding: "16px 40px", fontSize: 14 }}
        >
          {submitting ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Running...
            </span>
          ) : (
            `Launch ${simType === "monte_carlo" ? "Monte Carlo" : "Race"}`
          )}
        </button>
      </div>
    </div>
  );
}

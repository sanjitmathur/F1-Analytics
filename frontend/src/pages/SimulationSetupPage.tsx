import { useEffect, useState, useRef } from "react";
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
  const [showCreator, setShowCreator] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customTeam, setCustomTeam] = useState("");
  const [customPace, setCustomPace] = useState(7.5);
  const [customRacecraft, setCustomRacecraft] = useState(7);
  const [customConsistency, setCustomConsistency] = useState(7);
  const creatorRef = useRef<HTMLDivElement>(null);

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
    setCustomName("");
    setCustomTeam("");
    setCustomPace(7.5);
    setCustomRacecraft(7);
    setCustomConsistency(7);
    setShowCreator(true);
  };

  const confirmCustomDriver = () => {
    const skill = Math.round(((customPace + customRacecraft + customConsistency) / 3) * 10) / 10;
    const totalLaps = selectedTrack?.total_laps || 50;
    setDrivers([...drivers, {
      name: customName || "Custom Driver",
      team: customTeam || "Independent",
      skill,
      grid_position: drivers.length + 1,
      starting_compound: "MEDIUM",
      pit_stops: [{ lap: Math.round(totalLaps * 0.5), compound: "HARD" }],
      dnf_chance_per_lap: 0.001,
    }]);
    setShowCreator(false);
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

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedTrackId || drivers.length < 2) return;
    setSubmitting(true);
    setSubmitError(null);
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
    } catch {
      setSubmitError("Failed to start simulation. Please check your configuration and try again.");
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

      {/* Sim Name */}
      <div className="card animate-in" style={{ marginBottom: 20 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Simulation Name</label>
          <input value={simName} onChange={e => setSimName(e.target.value)} placeholder="e.g., Monaco Strategy Test" />
        </div>
      </div>

      {/* Mode + Weather + Iterations */}
      <div className="card animate-in" style={{ marginBottom: 20 }}>
        <div className="grid-2" style={{ marginBottom: simType === "monte_carlo" ? 20 : 0 }}>
          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 8 }}>Mode</div>
            <div style={{ display: "flex", gap: 8 }}>
              {([["single", "Single Race"], ["monte_carlo", "Monte Carlo"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  className={simType === val ? "btn btn-primary" : "btn btn-ghost"}
                  style={{ flex: 1, padding: "10px 16px", fontSize: 12 }}
                  onClick={() => setSimType(val)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 8 }}>Weather</div>
            <div style={{ display: "flex", gap: 8 }}>
              {([["dry", "Dry"], ["wet", "Wet"], ["mixed", "Mixed"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  className={weather === val ? "btn btn-primary" : "btn btn-ghost"}
                  style={{ flex: 1, padding: "10px 16px", fontSize: 12 }}
                  onClick={() => setWeather(val)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {simType === "monte_carlo" && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Iterations</label>
            <input type="number" min={10} max={10000} value={numSims} onChange={e => setNumSims(Number(e.target.value))} />
          </div>
        )}
      </div>

      {/* Circuit Picker */}
      <div className="card animate-in" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 12 }}>Circuit</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: selectedTrack ? 20 : 0 }}>
          {tracks.map(t => {
            const active = selectedTrackId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTrackId(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: active ? "rgba(225, 6, 0, 0.1)" : "var(--bg-glass)",
                  border: `2px solid ${active ? "var(--f1-red)" : "var(--border-color)"}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  color: "var(--text-primary)",
                  transition: "all 0.2s ease",
                  boxShadow: active ? "0 0 12px rgba(225, 6, 0, 0.25)" : "none",
                }}
              >
                <div style={{
                  width: 4, height: 28, borderRadius: 2, flexShrink: 0,
                  background: active ? "var(--f1-red)" : "var(--border-color)",
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700,
                    color: active ? "var(--f1-red)" : "var(--text-primary)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{t.country}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Track stats */}
        {selectedTrack && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16, padding: "16px 0 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {[
              { label: "Laps", value: selectedTrack.total_laps },
              { label: "Base Lap", value: `${selectedTrack.base_lap_time}s` },
              { label: "Pit Loss", value: `${selectedTrack.pit_loss_time}s` },
              { label: "DRS Zones", value: selectedTrack.drs_zones },
              { label: "Overtake", value: `${selectedTrack.overtake_difficulty}x` },
              { label: "SC Chance", value: `${(selectedTrack.safety_car_probability * 100).toFixed(0)}%` },
            ].map(item => (
              <div key={item.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, fontWeight: 800 }}>{item.value}</div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1.5, marginTop: 2 }}>{item.label}</div>
              </div>
            ))}
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
              <div key={`${driver.name}-${driver.team}-${di}`} style={{
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
      {submitError && (
        <div style={{ color: "var(--f1-red)", fontSize: 13, textAlign: "right", marginTop: 8 }}>{submitError}</div>
      )}
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
      {/* ═══ CUSTOM DRIVER CREATOR MODAL ═══ */}
      {showCreator && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(10px)", zIndex: 500,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreator(false); }}
        >
          <div ref={creatorRef} style={{
            background: "rgba(10,10,15,0.95)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20, padding: 36, width: 420, maxWidth: "90vw",
            animation: "fadeInUp 0.3s ease",
          }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 800, color: "var(--f1-red)", letterSpacing: 2, marginBottom: 24 }}>
              CREATE DRIVER
            </div>

            <div className="form-group">
              <label>Driver Name</label>
              <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Enter driver name" />
            </div>

            <div className="form-group">
              <label>Team</label>
              <input value={customTeam} onChange={(e) => setCustomTeam(e.target.value)} placeholder="Enter team name" />
            </div>

            <div className="form-group">
              <label>Pace — {customPace.toFixed(1)}</label>
              <input type="range" min="1" max="10" step="0.1" value={customPace} onChange={(e) => setCustomPace(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "var(--f1-red)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
                <span>Slow</span><span>Fast</span>
              </div>
            </div>

            <div className="form-group">
              <label>Racecraft — {customRacecraft.toFixed(1)}</label>
              <input type="range" min="1" max="10" step="0.1" value={customRacecraft} onChange={(e) => setCustomRacecraft(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#448aff" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
                <span>Rookie</span><span>Expert</span>
              </div>
            </div>

            <div className="form-group">
              <label>Consistency — {customConsistency.toFixed(1)}</label>
              <input type="range" min="1" max="10" step="0.1" value={customConsistency} onChange={(e) => setCustomConsistency(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#00e676" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
                <span>Erratic</span><span>Consistent</span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: "var(--text-muted)" }}>
                Skill: <span style={{ color: "var(--text-primary)", fontWeight: 800 }}>{(((customPace + customRacecraft + customConsistency) / 3)).toFixed(1)}</span> / 10
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowCreator(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={confirmCustomDriver}>Add to Grid</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { listSimulations, getSimulationResults, getTeamColors } from "../services/api";
import type { SimulationRun, SimulationResult, TeamColors } from "../types";

export default function ComparisonPage() {
  const [sims, setSims] = useState<SimulationRun[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [resultsMap, setResultsMap] = useState<Record<number, SimulationResult[]>>({});
  const [teamColors, setTeamColors] = useState<TeamColors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([listSimulations(), getTeamColors()]).then(([s, c]) => {
      setSims(s.filter(sim => sim.status === "completed" && sim.sim_type === "single"));
      setTeamColors(c);
    });
  }, []);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  useEffect(() => {
    if (selectedIds.length < 2) return;
    setLoading(true);
    Promise.all(selectedIds.map(async id => {
      const results = await getSimulationResults(id);
      return [id, results] as [number, SimulationResult[]];
    })).then(entries => { setResultsMap(Object.fromEntries(entries)); setLoading(false); });
  }, [selectedIds]);

  const allDrivers = [...new Set(selectedIds.flatMap(id => (resultsMap[id] || []).map(r => r.driver_name)))];

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="section-label">Analysis</div>
          <h1>Compare Races</h1>
          <div className="subtitle">Select two or more completed simulations to compare side-by-side</div>
        </div>
      </div>

      <div className="card animate-in">
        <div className="card-header">Select Simulations</div>
        {sims.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No completed single-race simulations to compare.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {sims.map(sim => (
              <button
                key={sim.id}
                className={`btn ${selectedIds.includes(sim.id) ? "btn-primary" : "btn-secondary"} btn-sm`}
                onClick={() => toggleSelect(sim.id)}
              >
                {sim.name || `#${sim.id}`} — {sim.track_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedIds.length >= 2 && !loading && (
        <div className="card animate-in">
          <div className="card-header">Side-by-Side Classification</div>
          <div style={{ overflowX: "auto" }}>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  {selectedIds.map(id => {
                    const sim = sims.find(s => s.id === id);
                    return (
                      <th key={id} colSpan={2} style={{ textAlign: "center" }}>
                        <div>{sim?.name || `Sim #${id}`}</div>
                        <div style={{ fontSize: 9, fontWeight: 400, fontFamily: "Inter, sans-serif", letterSpacing: 0, textTransform: "none" }}>{sim?.track_name}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {allDrivers.map(name => (
                  <tr key={name}>
                    <td style={{ fontWeight: 600 }}>
                      <span className="team-color-bar" style={{ backgroundColor: teamColors[resultsMap[selectedIds[0]]?.find(r => r.driver_name === name)?.team || ""] || "#444" }} />
                      {name}
                    </td>
                    {selectedIds.map(id => {
                      const r = resultsMap[id]?.find(r => r.driver_name === name);
                      return (
                        <React.Fragment key={id}>
                          <td style={{ textAlign: "center", fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 800 }}>
                            {r ? (r.is_dnf ? <span style={{ color: "var(--f1-red)" }}>DNF</span> : <span className={`position-${r.position}`}>P{r.position}</span>) : "—"}
                          </td>
                          <td style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>
                            {r ? (r.position === 1 ? "Leader" : r.is_dnf ? "" : `+${r.gap_to_leader.toFixed(1)}s`) : ""}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <span className="spinner" />
        </div>
      )}
    </div>
  );
}

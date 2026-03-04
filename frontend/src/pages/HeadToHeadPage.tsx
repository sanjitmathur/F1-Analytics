import { useEffect, useState } from "react";
import { getSeasonDrivers, getSeasonTeamColors, getHeadToHead } from "../services/api";
import type { Driver2026, HeadToHeadResult, TeamColors } from "../types";
import DriverComparison from "../components/DriverComparison";

export default function HeadToHeadPage() {
  const [drivers, setDrivers] = useState<Driver2026[]>([]);
  const [teamColors, setTeamColors] = useState<TeamColors>({});
  const [driver1, setDriver1] = useState("");
  const [driver2, setDriver2] = useState("");
  const [result, setResult] = useState<HeadToHeadResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      getSeasonDrivers(2026),
      getSeasonTeamColors(2026).catch(() => ({})),
    ]).then(([d, tc]) => {
      setDrivers(d);
      setTeamColors(tc);
      if (d.length >= 2) {
        setDriver1(d[0].name);
        setDriver2(d[2]?.name || d[1].name);
      }
    });
  }, []);

  const handleCompare = async () => {
    if (!driver1 || !driver2 || driver1 === driver2) return;
    setLoading(true);
    try {
      const data = await getHeadToHead(driver1, driver2);
      setResult(data);
    } catch {
      setResult(null);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="section-label">Analysis</div>
          <h1>Head-to-Head</h1>
        </div>
      </div>

      <div className="card animate-in">
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Driver 1</label>
            <select value={driver1} onChange={e => setDriver1(e.target.value)}>
              {drivers.map(d => <option key={d.name} value={d.name}>{d.name} ({d.team})</option>)}
            </select>
          </div>
          <div style={{
            fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 800,
            color: "var(--text-muted)", padding: "0 8px 12px",
          }}>VS</div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Driver 2</label>
            <select value={driver2} onChange={e => setDriver2(e.target.value)}>
              {drivers.map(d => <option key={d.name} value={d.name}>{d.name} ({d.team})</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleCompare} disabled={loading} style={{ marginBottom: 8 }}>
            {loading ? "Loading..." : "Compare"}
          </button>
        </div>
      </div>

      {result && (
        <div className="card animate-in">
          <DriverComparison data={result} teamColors={teamColors} />
        </div>
      )}

      {!result && !loading && (
        <div className="card animate-in" style={{ textAlign: "center", padding: 60 }}>
          <p style={{ color: "var(--text-muted)" }}>
            Select two drivers and click Compare. Run race predictions first for meaningful data.
          </p>
        </div>
      )}
    </div>
  );
}

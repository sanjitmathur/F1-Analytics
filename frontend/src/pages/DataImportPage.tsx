import { useEffect, useState } from "react";
import { listImports, importRace } from "../services/api";
import type { ImportedRace } from "../types";

const RECENT_YEARS = [2024, 2023, 2022, 2021, 2020];

export default function DataImportPage() {
  const [imports, setImports] = useState<ImportedRace[]>([]);
  const [year, setYear] = useState(2024);
  const [gp, setGp] = useState("Bahrain");
  const [sessionType, setSessionType] = useState("Race");
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  const load = () => { listImports().then(setImports); };
  useEffect(() => { load(); }, []);

  const handleImport = async () => {
    setImporting(true); setMessage("");
    try {
      const resp = await importRace(year, gp, sessionType);
      setMessage(`Import started (ID: ${resp.id}). Running in background.`);
      setTimeout(load, 3000);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setMessage(err.response?.data?.detail || "Import failed. Ensure FastF1 is installed.");
    } finally { setImporting(false); }
  };

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="section-label">Historical Data</div>
          <h1>FastF1 Import</h1>
          <div className="subtitle">Import real F1 race data to validate your simulations</div>
        </div>
      </div>

      <div className="card animate-in">
        <div className="card-header">Import Session</div>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20, lineHeight: 1.7 }}>
          Requires <code style={{ background: "var(--bg-glass)", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>pip install fastf1</code> on the backend.
        </p>
        <div className="grid-3">
          <div className="form-group">
            <label>Season</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))}>
              {RECENT_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Grand Prix</label>
            <input value={gp} onChange={e => setGp(e.target.value)} placeholder="e.g., Bahrain" />
          </div>
          <div className="form-group">
            <label>Session</label>
            <select value={sessionType} onChange={e => setSessionType(e.target.value)}>
              <option value="Race">Race</option>
              <option value="Qualifying">Qualifying</option>
              <option value="FP1">FP1</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleImport} disabled={importing || !gp}>
          {importing ? "Importing..." : "Import Session"}
        </button>
        {message && <p style={{ marginTop: 16, color: "var(--accent-green)", fontSize: 13 }}>{message}</p>}
      </div>

      {imports.length > 0 && (
        <div className="card animate-in" style={{ marginTop: 20 }}>
          <div className="card-header">Import History</div>
          <table className="results-table">
            <thead>
              <tr><th>Year</th><th>Grand Prix</th><th>Session</th><th>Drivers</th><th>Laps</th><th>Date</th></tr>
            </thead>
            <tbody>
              {imports.map(imp => (
                <tr key={imp.id}>
                  <td style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700 }}>{imp.year}</td>
                  <td style={{ fontWeight: 600 }}>{imp.grand_prix}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{imp.session_type}</td>
                  <td>{imp.driver_count}</td>
                  <td>{imp.total_laps}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{new Date(imp.imported_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

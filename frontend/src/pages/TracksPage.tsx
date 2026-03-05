import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listTracks, createTrack, deleteTrack } from "../services/api";
import type { Track } from "../types";

export default function TracksPage() {
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", country: "", total_laps: 50, base_lap_time: 90,
    pit_loss_time: 22, drs_zones: 1, overtake_difficulty: 1.0, safety_car_probability: 0.03,
  });

  const load = () => { listTracks().then(setTracks); };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    await createTrack(form);
    setShowForm(false);
    setForm({ name: "", country: "", total_laps: 50, base_lap_time: 90, pit_loss_time: 22, drs_zones: 1, overtake_difficulty: 1.0, safety_car_probability: 0.03 });
    load();
  };

  const handleDelete = async (id: number) => { await deleteTrack(id); load(); };

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="section-label">Circuits</div>
          <h1>Track Library</h1>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Circuit"}
        </button>
      </div>

      {showForm && (
        <div className="card animate-in" style={{ marginBottom: 32 }}>
          <div className="card-header">Create Circuit</div>
          <div className="grid-2">
            <div className="form-group"><label>Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Circuit name" /></div>
            <div className="form-group"><label>Country</label><input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="Country" /></div>
            <div className="form-group"><label>Total Laps</label><input type="number" value={form.total_laps} onChange={e => setForm({ ...form, total_laps: Number(e.target.value) })} /></div>
            <div className="form-group"><label>Base Lap Time (s)</label><input type="number" step={0.1} value={form.base_lap_time} onChange={e => setForm({ ...form, base_lap_time: Number(e.target.value) })} /></div>
            <div className="form-group"><label>Pit Loss (s)</label><input type="number" step={0.1} value={form.pit_loss_time} onChange={e => setForm({ ...form, pit_loss_time: Number(e.target.value) })} /></div>
            <div className="form-group"><label>DRS Zones</label><input type="number" min={0} max={4} value={form.drs_zones} onChange={e => setForm({ ...form, drs_zones: Number(e.target.value) })} /></div>
            <div className="form-group"><label>Overtake Difficulty</label><input type="number" step={0.1} value={form.overtake_difficulty} onChange={e => setForm({ ...form, overtake_difficulty: Number(e.target.value) })} /></div>
            <div className="form-group"><label>SC Probability</label><input type="number" step={0.01} value={form.safety_car_probability} onChange={e => setForm({ ...form, safety_car_probability: Number(e.target.value) })} /></div>
          </div>
          <button className="btn btn-primary" onClick={handleCreate} disabled={!form.name || !form.country}>Create</button>
        </div>
      )}

      <div className="grid-3">
        {tracks.map((t, i) => (
          <div
            className="card animate-in"
            key={t.id}
            style={{ animationDelay: `${i * 0.04}s`, cursor: "pointer", transition: "transform 0.2s" }}
            onClick={() => navigate(`/tracks/${t.id}`)}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: 0.5 }}>{t.name}</div>
                <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>{t.country}</div>
              </div>
              {t.is_preset && (
                <span style={{ fontSize: 9, color: "var(--accent-green)", background: "rgba(0,230,118,0.1)", padding: "3px 10px", borderRadius: 100, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Preset</span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { v: t.total_laps, l: "Laps" },
                { v: `${t.base_lap_time}s`, l: "Lap" },
                { v: `${t.pit_loss_time}s`, l: "Pit" },
                { v: t.drs_zones, l: "DRS" },
                { v: `${t.overtake_difficulty}x`, l: "OT" },
                { v: `${(t.safety_car_probability * 100).toFixed(0)}%`, l: "SC" },
              ].map(item => (
                <div key={item.l}>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 800 }}>{item.v}</div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>{item.l}</div>
                </div>
              ))}
            </div>
            {!t.is_preset && (
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 16, color: "var(--f1-red)", fontSize: 10 }} onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}>
                Delete Circuit
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

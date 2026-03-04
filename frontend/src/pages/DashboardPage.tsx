import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listSimulations, deleteSimulation } from "../services/api";
import type { SimulationRun } from "../types";

export default function DashboardPage() {
  const [sims, setSims] = useState<SimulationRun[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    listSimulations()
      .then(setSims)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteSimulation(id);
    load();
  };

  const completedCount = sims.filter(s => s.status === "completed").length;
  const totalDrivers = sims.reduce((acc, s) => acc + s.driver_config.length, 0);
  const mcCount = sims.filter(s => s.sim_type === "monte_carlo").length;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <span className="spinner" style={{ width: 48, height: 48 }} />
          <p style={{ marginTop: 20, color: "var(--text-muted)", fontSize: 13, letterSpacing: 2, textTransform: "uppercase" }}>Loading simulations</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div style={{ marginBottom: 56 }} className="animate-in">
        <div className="section-label">Race Strategy</div>
        <h1 style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 52,
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: -1,
          marginBottom: 16,
          background: "linear-gradient(180deg, #ffffff 20%, rgba(255,255,255,0.4) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          AI Simulator
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 16, maxWidth: 500, lineHeight: 1.7 }}>
          Model F1 races lap-by-lap with tire degradation, overtakes, pit strategies, safety cars, and Monte Carlo predictions.
        </p>
        <div style={{ marginTop: 32, display: "flex", gap: 12 }}>
          <Link to="/simulate" className="btn btn-primary">
            New Simulation
          </Link>
          <Link to="/tracks" className="btn btn-secondary">
            Browse Circuits
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      {sims.length > 0 && (
        <div className="grid-4 animate-in" style={{ marginBottom: 40 }}>
          <div className="stat-card">
            <div className="stat-value">{sims.length}</div>
            <div className="stat-label">Total Sims</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--accent-green)" }}>{completedCount}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--accent-blue)" }}>{mcCount}</div>
            <div className="stat-label">Monte Carlo</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--accent-yellow)" }}>{totalDrivers}</div>
            <div className="stat-label">Drivers Simulated</div>
          </div>
        </div>
      )}

      <div className="glow-divider" />

      {/* Simulation list */}
      {sims.length === 0 ? (
        <div className="empty-state animate-in">
          <h3>No Simulations Yet</h3>
          <p>Create your first race strategy simulation and watch AI predict the outcome.</p>
          <Link to="/simulate" className="btn btn-primary">
            Create Simulation
          </Link>
        </div>
      ) : (
        <div>
          <div className="section-label" style={{ marginBottom: 20 }}>Recent Simulations</div>
          {sims.map((sim, i) => (
            <Link
              to={sim.status === "completed"
                ? (sim.sim_type === "monte_carlo" ? `/monte-carlo/${sim.id}` : `/results/${sim.id}`)
                : "#"
              }
              key={sim.id}
              className="animate-in"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "20px 24px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-glass)",
                border: "1px solid var(--border-color)",
                marginBottom: 12,
                textDecoration: "none",
                color: "inherit",
                transition: "all 0.3s ease",
                animationDelay: `${i * 0.05}s`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "var(--bg-glass-hover)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "var(--bg-glass)";
                e.currentTarget.style.borderColor = "var(--border-color)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "var(--radius-sm)",
                  background: sim.sim_type === "monte_carlo" ? "rgba(68,138,255,0.1)" : "var(--f1-red-subtle)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 800,
                  color: sim.sim_type === "monte_carlo" ? "var(--accent-blue)" : "var(--f1-red)",
                }}>
                  {sim.sim_type === "monte_carlo" ? "MC" : "SR"}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {sim.name || `Simulation #${sim.id}`}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2, display: "flex", gap: 16, alignItems: "center" }}>
                    <span>{sim.track_name}</span>
                    <span style={{ opacity: 0.3 }}>|</span>
                    <span>{sim.driver_config.length} drivers</span>
                    {sim.sim_type === "monte_carlo" && (
                      <>
                        <span style={{ opacity: 0.3 }}>|</span>
                        <span>{sim.num_simulations.toLocaleString()} runs</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  {new Date(sim.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <span className={`status-badge status-${sim.status}`}>
                  {sim.status}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => handleDelete(sim.id, e)}
                  style={{ color: "var(--text-muted)", fontSize: 11 }}
                >
                  Delete
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

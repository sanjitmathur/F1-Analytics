import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listSimulations, deleteSimulation } from "../services/api";
import type { SimulationRun } from "../types";
import CircuitMap from "../components/CircuitMap";

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
      {/* Hero Section with Circuit Map background */}
      <div className="dashboard-hero animate-in">
        <div className="dashboard-hero-circuit">
          <CircuitMap trackName="Silverstone" color="var(--f1-red)" opacity={0.06} size={480} />
        </div>
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
      </div>

      {/* Action Cards */}
      <div className="dashboard-actions animate-in">
        <Link to="/simulate" className="action-card action-card-primary">
          <div className="action-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <div className="action-card-content">
            <div className="action-card-title">New Simulation</div>
            <div className="action-card-desc">Configure drivers, strategies and run a race</div>
          </div>
          <div className="action-card-arrow">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" />
            </svg>
          </div>
        </Link>

        <Link to="/tracks" className="action-card">
          <div className="action-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="action-card-content">
            <div className="action-card-title">Browse Circuits</div>
            <div className="action-card-desc">Explore 10+ F1 circuits with track data</div>
          </div>
          <div className="action-card-arrow">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" />
            </svg>
          </div>
        </Link>

        <Link to="/season/2026" className="action-card">
          <div className="action-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="action-card-content">
            <div className="action-card-title">2026 Season</div>
            <div className="action-card-desc">Full calendar with race predictions</div>
          </div>
          <div className="action-card-arrow">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" />
            </svg>
          </div>
        </Link>
      </div>

      {/* Stats Row */}
      {sims.length > 0 && (
        <div className="grid-4 animate-in" style={{ marginBottom: 40 }}>
          <div className="stat-card stat-card-red">
            <div className="stat-value">{sims.length}</div>
            <div className="stat-label">Total Sims</div>
          </div>
          <div className="stat-card stat-card-green">
            <div className="stat-value" style={{ color: "var(--accent-green)" }}>{completedCount}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card stat-card-blue">
            <div className="stat-value" style={{ color: "var(--accent-blue)" }}>{mcCount}</div>
            <div className="stat-label">Monte Carlo</div>
          </div>
          <div className="stat-card stat-card-yellow">
            <div className="stat-value" style={{ color: "var(--accent-yellow)" }}>{totalDrivers}</div>
            <div className="stat-label">Drivers Simulated</div>
          </div>
        </div>
      )}

      <div className="glow-divider" />

      {/* Simulation list or empty state */}
      {sims.length === 0 ? (
        <div className="empty-state-enhanced animate-in">
          <div className="empty-state-circuit">
            <CircuitMap trackName="Monaco" color="var(--f1-red)" opacity={0.1} size={200} />
            <div className="empty-state-pulse" />
          </div>
          <h3>No Simulations Yet</h3>
          <p>Create your first race strategy simulation and watch AI predict the outcome.</p>
          <div className="feature-tags">
            <span className="feature-tag">Tire Strategy</span>
            <span className="feature-tag">Overtake Model</span>
            <span className="feature-tag">Safety Cars</span>
            <span className="feature-tag">Monte Carlo</span>
          </div>
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

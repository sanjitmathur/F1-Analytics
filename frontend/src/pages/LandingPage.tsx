import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import CircuitMap from "../components/CircuitMap";

/* ─── Particle system for floating data points ─── */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; color: string;
    }

    const particles: Particle[] = [];
    const colors = ["rgba(225,6,0,", "rgba(255,255,255,", "rgba(68,138,255,", "rgba(255,214,0,"];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.4 + 0.05,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Draw connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255,255,255,${0.03 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = window.innerWidth;
        if (p.x > window.innerWidth) p.x = 0;
        if (p.y < 0) p.y = window.innerHeight;
        if (p.y > window.innerHeight) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.opacity})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0 }} />;
}

/* ─── Animated racing line SVG ─── */
function RacingLine() {
  return (
    <svg
      className="landing-racing-line"
      viewBox="0 0 1200 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M-50 350 C100 350, 150 150, 300 150 S500 350, 600 200 S750 50, 900 200 S1050 350, 1200 250 L1300 250"
        stroke="url(#lineGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        className="racing-path"
      />
      <path
        d="M-50 400 C150 400, 200 250, 350 200 S550 380, 650 280 S800 100, 950 250 S1100 400, 1300 300"
        stroke="url(#lineGrad2)"
        strokeWidth="1"
        strokeLinecap="round"
        className="racing-path-2"
        opacity="0.3"
      />
      <defs>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="30%" stopColor="#e10600" stopOpacity="0.6" />
          <stop offset="70%" stopColor="#e10600" stopOpacity="0.8" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        <linearGradient id="lineGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor="#448aff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─── F1 Start Lights ─── */
function StartLights({ phase }: { phase: number }) {
  return (
    <div className="start-lights-container">
      <div className="start-lights">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="light-column">
            <div className={`start-light ${phase > i ? "lit" : ""} ${phase === 6 ? "out" : ""}`} />
            <div className={`start-light ${phase > i ? "lit" : ""} ${phase === 6 ? "out" : ""}`} />
          </div>
        ))}
      </div>
      {phase === 6 && (
        <div className="lights-out-text">LIGHTS OUT</div>
      )}
    </div>
  );
}

/* ─── Pre-computed speed line positions ─── */
const SPEED_LINES = Array.from({ length: 40 }).map((_, i) => ({
  id: i,
  top: `${(i * 2.5 + (i * 37 % 17)) % 100}%`,
  left: `${30 + (i * 13 % 40)}%`,
  delay: `${(i * 7 % 30) / 100}s`,
  opacity: 0.2 + (i * 11 % 60) / 100,
  height: i % 4 === 0 ? 2 : 1,
}));

/* ─── Speed Warp Overlay ─── */
function SpeedWarp({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="speed-warp-overlay">
      {SPEED_LINES.map((line) => (
        <div
          key={line.id}
          className="speed-line"
          style={{
            top: line.top,
            left: line.left,
            animationDelay: line.delay,
            opacity: line.opacity,
            height: line.height,
          }}
        />
      ))}
      <div className="warp-flash" />
    </div>
  );
}

/* ─── F1 Helmet Visual ─── */
function HelmetVisual() {
  return (
    <div className="helmet-visual-container">
      <div className="driver-number-bg">01</div>
      <div className="hero-circuit-bg">
        <CircuitMap trackName="Silverstone" color="#e10600" opacity={0.12} size={420} />
      </div>
      <svg className="helmet-svg" viewBox="0 0 300 280" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="helmetGrad" x1="0" y1="0" x2="300" y2="280" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.04)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
          </linearGradient>
          <linearGradient id="visorGrad" x1="60" y1="130" x2="230" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#e10600" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#e10600" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ff4444" stopOpacity="0.1" />
          </linearGradient>
          <filter id="visorGlow">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Helmet shell */}
        <path
          d="M150 30 C80 30, 30 80, 30 150 C30 200, 50 240, 90 260 L210 260 C250 240, 270 200, 270 150 C270 80, 220 30, 150 30Z"
          fill="url(#helmetGrad)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1.5"
        />
        {/* Visor */}
        <path
          d="M70 135 C70 120, 90 110, 150 110 C210 110, 230 120, 230 135 L220 175 C210 190, 180 195, 150 195 C120 195, 90 190, 80 175 Z"
          fill="url(#visorGrad)"
          filter="url(#visorGlow)"
        />
        {/* Visor reflection line */}
        <path
          d="M85 140 Q150 125, 220 140"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
          fill="none"
        />
      </svg>
      <div className="telemetry-overlay">
        <div className="telemetry-item">
          <span className="telemetry-label">S1</span>
          <span className="telemetry-value">28.341</span>
        </div>
        <div className="telemetry-item">
          <span className="telemetry-label">S2</span>
          <span className="telemetry-value">35.672</span>
        </div>
        <div className="telemetry-item">
          <span className="telemetry-label">SPD</span>
          <span className="telemetry-value">342</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Landing Page ─── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [lightPhase, setLightPhase] = useState(0);
  const [launching, setLaunching] = useState(false);
  const [warpActive, setWarpActive] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const handleLaunch = useCallback(() => {
    if (launching) return;
    setLaunching(true);

    // F1 start lights sequence
    const delays = [0, 400, 400, 400, 400, 400, 600];
    let time = 0;
    for (let i = 1; i <= 6; i++) {
      time += delays[i - 1];
      setTimeout(() => setLightPhase(i), time);
    }

    // After lights out → speed warp → navigate
    setTimeout(() => {
      setWarpActive(true);
    }, time + 200);

    setTimeout(() => {
      navigate("/dashboard");
    }, time + 900);
  }, [launching, navigate]);

  return (
    <div className={`landing-page ${mounted ? "mounted" : ""} ${launching ? "launching" : ""}`}>
      <ParticleField />
      <RacingLine />

      {/* Gradient orbs */}
      <div className="landing-orb landing-orb-1" />
      <div className="landing-orb landing-orb-2" />
      <div className="landing-orb landing-orb-3" />

      {/* Grid overlay */}
      <div className="landing-grid" />

      {/* Start lights overlay */}
      {lightPhase > 0 && <StartLights phase={lightPhase} />}

      {/* Speed warp */}
      <SpeedWarp active={warpActive} />

      {/* Content */}
      <div className="landing-content">
        {/* Top bar */}
        <div className="landing-topbar">
          <div className="landing-logo">
            <span className="landing-logo-bar" />
            F1 STRATEGY
          </div>
          <div className="landing-topbar-right">
            <span className="landing-version">v2.0</span>
          </div>
        </div>

        {/* Hero — 2 column grid */}
        <div className="landing-hero">
          <div className="hero-left">
            <div className="landing-tag">
              <span className="tag-dot" />
              AI-Powered Race Simulation Engine
            </div>

            <h1 className="landing-title">
              <span className="title-line title-line-1">PREDICT</span>
              <span className="title-line title-line-2">THE RACE<span className="title-dot">.</span></span>
            </h1>

            <p className="landing-subtitle">
              Lap-by-lap simulation with tire degradation, pit strategies,
              overtake modeling, safety cars, and Monte Carlo probability predictions.
            </p>

            {/* CTA — now above stats so button is more centered */}
            <div className="landing-cta">
              <button className="launch-btn" onClick={handleLaunch} disabled={launching}>
                <span className="launch-btn-bg" />
                <span className="launch-btn-text">
                  {launching ? "STARTING..." : "ENTER SIMULATOR"}
                </span>
                <span className="launch-btn-arrow">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </button>
              <span className="landing-cta-hint">Press Enter or click to launch</span>
            </div>

            {/* Stats — now below CTA */}
            <div className="landing-stats">
              <div className="landing-stat">
                <span className="landing-stat-value">22</span>
                <span className="landing-stat-label">F1 Drivers</span>
              </div>
              <div className="landing-stat-divider" />
              <div className="landing-stat">
                <span className="landing-stat-value">24</span>
                <span className="landing-stat-label">Race Weekends</span>
              </div>
              <div className="landing-stat-divider" />
              <div className="landing-stat">
                <span className="landing-stat-value">2026</span>
                <span className="landing-stat-label">Season Predictor</span>
              </div>
            </div>
          </div>

          <div className="hero-right">
            <HelmetVisual />
          </div>
        </div>

        {/* Bottom info strip */}
        <div className="landing-bottom">
          <div className="landing-bottom-item">
            <span className="bottom-label">ENGINE</span>
            <span className="bottom-value">Python + FastAPI</span>
          </div>
          <div className="landing-bottom-item">
            <span className="bottom-label">FRONTEND</span>
            <span className="bottom-value">React + TypeScript</span>
          </div>
          <div className="landing-bottom-item">
            <span className="bottom-label">DATA</span>
            <span className="bottom-value">FastF1 Integration</span>
          </div>
        </div>
      </div>
    </div>
  );
}

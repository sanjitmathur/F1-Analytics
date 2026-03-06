import { useEffect, useState, useCallback, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import CircuitMap from "../components/CircuitMap";
// CircuitMap still used in hero section, how-it-works, and CTA

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


/* ─── 3D Tilt Card wrapper ─── */
function TiltCard({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale(1.03)`;
    // shine effect
    const shine = el.querySelector(".tilt-shine") as HTMLElement;
    if (shine) {
      shine.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,0.08), transparent 60%)`;
    }
  };

  const handleLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)";
    const shine = el.querySelector(".tilt-shine") as HTMLElement;
    if (shine) shine.style.background = "transparent";
  };

  return (
    <div
      ref={cardRef}
      className={className}
      style={{ ...style, transition: "transform 0.2s ease-out", transformStyle: "preserve-3d" }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <div className="tilt-shine" style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none", zIndex: 2 }} />
      {children}
    </div>
  );
}

/* ─── Animated racing line SVG ─── */
function RacingLine() {
  return (
    <svg className="landing-racing-line" viewBox="0 0 1200 600" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M-50 350 C100 350, 150 150, 300 150 S500 350, 600 200 S750 50, 900 200 S1050 350, 1200 250 L1300 250" stroke="url(#lineGrad)" strokeWidth="2" strokeLinecap="round" className="racing-path" />
      <path d="M-50 400 C150 400, 200 250, 350 200 S550 380, 650 280 S800 100, 950 250 S1100 400, 1300 300" stroke="url(#lineGrad2)" strokeWidth="1" strokeLinecap="round" className="racing-path-2" opacity="0.3" />
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

/* ─── Simple launch transition overlay ─── */
function LaunchOverlay({ phase }: { phase: "idle" | "loading" | "exit" }) {
  if (phase === "idle") return null;

  return (
    <div className={`f1-launch-simple f1-simple-${phase}`}>
      <div className="f1-launch-simple-content">
        <div className="f1-launch-simple-bar" />
        <div className="f1-launch-simple-logo">
          <span className="f1-launch-simple-accent" />
          F1 STRATEGY
        </div>
        <div className="f1-launch-simple-text">INITIALIZING SIMULATOR</div>
        <div className="f1-launch-simple-loader">
          <div className="f1-launch-simple-loader-fill" />
        </div>
      </div>
    </div>
  );
}

/* ─── Animated RPM Tachometer ─── */
function Tachometer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rpmRef = useRef(0);
  const targetRpm = useRef(14800);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const size = 260;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    let animId: number;
    const cx = size / 2, cy = size / 2, r = 100;

    const draw = () => {
      const wobble = Math.sin(Date.now() / 300) * 200;
      rpmRef.current += (targetRpm.current + wobble - rpmRef.current) * 0.04;
      const rpm = rpmRef.current;
      ctx.clearRect(0, 0, size, size);

      const startAngle = 0.75 * Math.PI;
      const endAngle = 2.25 * Math.PI;

      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.stroke();

      const pct = Math.min(rpm / 18000, 1);
      const fillEnd = startAngle + pct * (endAngle - startAngle);
      const gradient = ctx.createLinearGradient(0, size, size, 0);
      gradient.addColorStop(0, "#448aff");
      gradient.addColorStop(0.6, "#e10600");
      gradient.addColorStop(1, "#ff4444");
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, fillEnd);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, fillEnd);
      ctx.strokeStyle = pct > 0.75 ? "rgba(225,6,0,0.35)" : "rgba(68,138,255,0.25)";
      ctx.lineWidth = 24;
      ctx.filter = "blur(14px)";
      ctx.stroke();
      ctx.filter = "none";

      for (let i = 0; i <= 18; i++) {
        const angle = startAngle + (i / 18) * (endAngle - startAngle);
        const isMajor = i % 2 === 0;
        const innerR = isMajor ? r - 22 : r - 14;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
        ctx.lineTo(cx + Math.cos(angle) * (r - 5), cy + Math.sin(angle) * (r - 5));
        ctx.strokeStyle = i > 14 ? "rgba(225,6,0,0.6)" : "rgba(255,255,255,0.15)";
        ctx.lineWidth = isMajor ? 2 : 1;
        ctx.stroke();
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 42px 'Orbitron', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(Math.round(rpm).toLocaleString(), cx, cy - 8);

      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.font = "700 10px 'Orbitron', sans-serif";
      ctx.fillText("RPM", cx, cy + 26);

      const dotX = cx + Math.cos(fillEnd) * r;
      const dotY = cy + Math.sin(fillEnd) * r;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
      ctx.fillStyle = pct > 0.75 ? "#e10600" : "#448aff";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dotX, dotY, 14, 0, Math.PI * 2);
      ctx.fillStyle = pct > 0.75 ? "rgba(225,6,0,0.2)" : "rgba(68,138,255,0.2)";
      ctx.fill();

      animId = requestAnimationFrame(draw);
    };
    draw();

    const interval = setInterval(() => {
      targetRpm.current = 11000 + Math.random() * 7000;
    }, 2500);

    return () => { cancelAnimationFrame(animId); clearInterval(interval); };
  }, []);

  return <canvas ref={canvasRef} className="landing-tachometer" />;
}

/* ─── Live Telemetry HUD ─── */
function TelemetryHUD() {
  const [speed, setSpeed] = useState(312);
  const [gear, setGear] = useState(8);
  const [throttle, setThrottle] = useState(98);
  const [drs, setDrs] = useState(true);
  const [delta, setDelta] = useState(-0.142);

  useEffect(() => {
    const iv = setInterval(() => {
      setSpeed(Math.round(280 + Math.random() * 65));
      setGear(Math.floor(6 + Math.random() * 3));
      setThrottle(Math.round(75 + Math.random() * 25));
      setDrs(Math.random() > 0.3);
      setDelta(parseFloat((-0.5 + Math.random() * 0.8).toFixed(3)));
    }, 2200);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="landing-telemetry-hud">
      <div className="ltelem-row">
        <div className="ltelem-item">
          <span className="ltelem-label">SPD</span>
          <span className="ltelem-value">{speed}</span>
          <span className="ltelem-unit">km/h</span>
        </div>
        <div className="ltelem-divider" />
        <div className="ltelem-item">
          <span className="ltelem-label">GEAR</span>
          <span className="ltelem-value ltelem-gear">{gear}</span>
        </div>
        <div className="ltelem-divider" />
        <div className="ltelem-item">
          <span className="ltelem-label">THR</span>
          <div className="ltelem-bar-track">
            <div className="ltelem-bar-fill" style={{ width: `${throttle}%` }} />
          </div>
          <span className="ltelem-pct">{throttle}%</span>
        </div>
        <div className="ltelem-divider" />
        <div className={`ltelem-drs ${drs ? "drs-on" : ""}`}>DRS</div>
        <div className="ltelem-divider" />
        <div className="ltelem-item">
          <span className="ltelem-label">DELTA</span>
          <span className={`ltelem-delta ${delta < 0 ? "delta-green" : "delta-red"}`}>
            {delta > 0 ? "+" : ""}{delta.toFixed(3)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Race Position Ticker ─── */
const TICKER_DATA = [
  { pos: 1, name: "VER", team: "#3671C6", gap: "LEADER" },
  { pos: 2, name: "NOR", team: "#FF8000", gap: "+1.832" },
  { pos: 3, name: "LEC", team: "#E8002D", gap: "+4.217" },
  { pos: 4, name: "PIA", team: "#FF8000", gap: "+6.553" },
  { pos: 5, name: "HAM", team: "#E8002D", gap: "+9.881" },
  { pos: 6, name: "RUS", team: "#27F4D2", gap: "+12.194" },
];

function RacePositionTicker() {
  return (
    <div className="landing-position-ticker">
      <div className="lpt-header">
        <span className="lpt-live-dot" />
        <span className="lpt-title">LIVE STANDINGS</span>
        <span className="lpt-lap">LAP 47/57</span>
      </div>
      {TICKER_DATA.map((d, i) => (
        <div key={d.pos} className="lpt-row" style={{ animationDelay: `${1.4 + i * 0.1}s` }}>
          <div className="lpt-pos-col">
            <span className={`lpt-pos ${d.pos <= 3 ? `lpt-pos-${d.pos}` : ""}`}>{d.pos}</span>
          </div>
          <div className="lpt-team-bar" style={{ background: d.team }} />
          <span className="lpt-name">{d.name}</span>
          <span className="lpt-gap">{d.gap}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Scroll indicator ─── */
function ScrollIndicator() {
  return (
    <div className="landing-scroll-hint">
      <span className="scroll-hint-text">SCROLL TO EXPLORE</span>
      <div className="scroll-hint-line">
        <div className="scroll-hint-dot" />
      </div>
    </div>
  );
}

/* ─── Scroll progress tracker (0-1 as element traverses viewport) ─── */
function useScrollProgress() {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!el) return;
    const wrapper = el.closest(".landing-scroll-wrapper");
    if (!wrapper) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when bottom of el enters viewport, 1 when top leaves
      const p = Math.min(Math.max((vh - rect.top) / (vh + rect.height), 0), 1);
      setProgress(p);
    };
    wrapper.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => wrapper.removeEventListener("scroll", onScroll);
  }, [el]);

  return { callbackRef: setEl, progress };
}

/* ─── Intersection Observer hook for scroll animations ─── */
function useReveal(threshold = 0.15) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { setVisible(entry.isIntersecting); },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [el, threshold]);

  return { callbackRef: setEl, visible };
}

/* ─── Animated counter ─── */
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const animating = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animating.current) {
        animating.current = true;
        setCount(0);
        const duration = 1800;
        const startTime = performance.now();
        const animate = (now: number) => {
          const elapsed = now - startTime;
          const p = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setCount(Math.round(eased * target));
          if (p < 1) requestAnimationFrame(animate);
          else animating.current = false;
        };
        requestAnimationFrame(animate);
      } else if (!entry.isIntersecting) {
        animating.current = false;
        setCount(0);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ═══════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [launchPhase, setLaunchPhase] = useState<"idle" | "loading" | "exit">("idle");

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const handleLaunch = useCallback(() => {
    if (launching) return;
    setLaunching(true);
    setLaunchPhase("loading");

    // Fade out after brief loading
    setTimeout(() => setLaunchPhase("exit"), 1200);

    // Navigate after fade
    setTimeout(() => navigate("/season/2026"), 1700);
  }, [launching, navigate]);

  /* Section reveals */
  const { callbackRef: featuresRef, visible: featuresVis } = useReveal(0.1);
  const { callbackRef: howItWorksRef, visible: howItWorksVis } = useReveal(0.1);
  const { callbackRef: techStackRef, visible: techStackVis } = useReveal(0.1);
  const { callbackRef: cta2Ref, visible: cta2Vis } = useReveal(0.1);

  /* Parallax on background elements */
  const { callbackRef: parallaxRef, progress: parallaxProgress } = useScrollProgress();
  const parallaxY = (parallaxProgress - 0.5) * -80;

  return (
    <div className={`landing-page ${mounted ? "mounted" : ""} ${launching ? "launching" : ""}`}>
      <ParticleField />
      <RacingLine />

      <div className="landing-orb landing-orb-1" style={{ transform: `translate(0, ${parallaxY * 0.5}px)` }} />
      <div className="landing-orb landing-orb-2" style={{ transform: `translate(0, ${parallaxY * -0.3}px)` }} />
      <div className="landing-orb landing-orb-3" style={{ transform: `translate(0, ${parallaxY * 0.7}px)` }} />
      <div className="landing-grid" ref={parallaxRef} />

      <LaunchOverlay phase={launchPhase} />

      {/* ═══ SCROLLABLE CONTENT ═══ */}
      <div className="landing-scroll-wrapper">

        {/* ─── SECTION 1: Hero (full viewport) ─── */}
        <section className="landing-hero-section">
          <div className="landing-content">
            <div className="landing-topbar">
              <div className="landing-logo">
                <span className="landing-logo-bar" />
                F1 STRATEGY
              </div>
              <div className="landing-topbar-right">
                <span className="landing-version">v2.0</span>
              </div>
            </div>

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
              </div>

              <div className="hero-right">
                <div className="hero-visual-stack">
                  <div className="hero-circuit-bg">
                    <CircuitMap trackName="Silverstone" color="#e10600" opacity={0.08} size={420} />
                  </div>
                  <div className="driver-number-bg">01</div>
                  <Tachometer />
                  <TelemetryHUD />
                  <RacePositionTicker />
                </div>
              </div>
            </div>

            <ScrollIndicator />
          </div>
        </section>

        {/* ─── SECTION 2: What is this platform ─── */}
        <section className="landing-section" ref={featuresRef}>
          <div className={`landing-section-inner ${featuresVis ? "revealed" : ""}`}>
            <div className="ls-label">
              <span className="ls-label-dot" />
              WHAT WE SIMULATE
            </div>
            <h2 className="ls-title">Every variable. Every lap. Every outcome.</h2>
            <p className="ls-subtitle">
              This isn't just a calculator — it's a full-blown race simulation engine that models
              the chaotic, unpredictable nature of Formula 1. From tire compound choices to safety
              car timing, every factor affects the final result.
            </p>

            <div className="ls-features-grid">
              {[
                { icon: "red", svg: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>, title: "Tire Degradation", desc: "Realistic compound modeling — Soft, Medium, Hard — each with unique degradation curves that affect lap times progressively." },
                { icon: "blue", svg: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />, title: "Overtake Engine", desc: "Gap-based probabilistic overtaking using a sigmoid curve. A 0.3s gap gives ~70% chance — just like real DRS zones." },
                { icon: "yellow", svg: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>, title: "Safety Cars", desc: "Random safety car events (~3% per lap, configurable per track) that compress the field and reshape pit strategy windows." },
                { icon: "green", svg: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />, title: "Monte Carlo", desc: "Run 1,000+ simulations to generate win probability, podium chances, and full position distributions for every driver." },
                { icon: "purple", svg: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></>, title: "Pit Strategy", desc: "Configure multi-stop strategies per driver. The engine evaluates 20-25s pit losses, tire resets, and optimal undercut timing." },
                { icon: "red", svg: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />, title: "2026 Season", desc: "Full 24-race calendar with AI predictions for every Grand Prix, championship standings, and head-to-head driver comparisons." },
              ].map((feat, i) => (
                <TiltCard key={feat.title} className={`ls-feature-card scroll-stagger ${featuresVis ? "stagger-in" : ""}`} style={{ transitionDelay: `${i * 0.1}s` }}>
                  <div className={`ls-feature-icon ls-icon-${feat.icon}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{feat.svg}</svg>
                  </div>
                  <h3>{feat.title}</h3>
                  <p>{feat.desc}</p>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SECTION 3: How It Works ─── */}
        <section className="landing-section" ref={howItWorksRef}>
          <div className={`landing-section-inner ${howItWorksVis ? "revealed" : ""}`}>
            <div className="ls-label">
              <span className="ls-label-dot" />
              HOW IT WORKS
            </div>
            <h2 className="ls-title">From setup to results in seconds.</h2>
            <p className="ls-subtitle">
              Three steps to simulate an entire Grand Prix with full telemetry data.
            </p>

            <div className="ls-vboxes">
              <TiltCard className={`ls-vbox scroll-stagger-up ${howItWorksVis ? "stagger-in" : ""}`} style={{ transitionDelay: "0s" }}>
                <div className="ls-vbox-top">
                  <span className="ls-vbox-num">01</span>
                  <div className="ls-vbox-icon ls-icon-red">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="8 12 12 16 16 12" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                    </svg>
                  </div>
                </div>
                <h3>Configure the Race</h3>
                <p>Pick a circuit from 10+ real F1 tracks. Add up to 20 drivers with skill ratings, team assignments, grid positions, and custom tire strategies.</p>
                <div className="ls-vbox-visual">
                  <CircuitMap trackName="Monaco" color="#e10600" opacity={0.12} size={160} />
                </div>
              </TiltCard>

              <TiltCard className={`ls-vbox scroll-stagger-up ${howItWorksVis ? "stagger-in" : ""}`} style={{ transitionDelay: "0.15s" }}>
                <div className="ls-vbox-top">
                  <span className="ls-vbox-num">02</span>
                  <div className="ls-vbox-icon ls-icon-blue">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                </div>
                <h3>Run the Simulation</h3>
                <p>The engine processes every lap: tire degradation, gap calculations, overtake attempts, pit stops, and safety car events. Monte Carlo mode runs 1,000+ iterations.</p>
                <div className="ls-vbox-visual">
                  <div className="ls-vbox-bars">
                    {[85, 60, 45, 72, 55, 90, 65, 48].map((h, i) => (
                      <div key={i} className="ls-vbox-bar" style={{ height: `${h}%`, animationDelay: `${i * 0.12}s` }} />
                    ))}
                  </div>
                </div>
              </TiltCard>

              <TiltCard className={`ls-vbox scroll-stagger-up ${howItWorksVis ? "stagger-in" : ""}`} style={{ transitionDelay: "0.3s" }}>
                <div className="ls-vbox-top">
                  <span className="ls-vbox-num">03</span>
                  <div className="ls-vbox-icon ls-icon-green">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  </div>
                </div>
                <h3>Analyze Results</h3>
                <p>Interactive charts show position changes, lap times, strategy timelines, win probabilities, and head-to-head driver comparisons.</p>
                <div className="ls-vbox-visual">
                  <svg className="ls-vbox-chart" viewBox="0 0 200 80" fill="none">
                    <path d="M0 65 Q25 60, 40 45 T80 35 T120 20 T160 15 T200 10" stroke="#e10600" strokeWidth="2" fill="none" />
                    <path d="M0 70 Q25 65, 40 55 T80 48 T120 40 T160 35 T200 30" stroke="#448aff" strokeWidth="1.5" fill="none" opacity="0.6" />
                    <path d="M0 60 Q25 62, 40 58 T80 52 T120 48 T160 42 T200 38" stroke="#00e676" strokeWidth="1.5" fill="none" opacity="0.5" />
                    <path d="M0 55 Q30 58, 50 60 T100 55 T150 50 T200 48" stroke="#ffd600" strokeWidth="1" fill="none" opacity="0.3" />
                  </svg>
                </div>
              </TiltCard>
            </div>
          </div>
        </section>

        {/* ─── SECTION 4: Tech Stack ─── */}
        <section className="landing-section" ref={techStackRef}>
          <div className={`landing-section-inner ${techStackVis ? "revealed" : ""}`}>
            <div className="ls-label">
              <span className="ls-label-dot" />
              UNDER THE HOOD
            </div>
            <h2 className="ls-title">Built for speed. Engineered for accuracy.</h2>
            <p className="ls-subtitle">
              A modern full-stack architecture designed for real-time simulation processing and beautiful data visualization.
            </p>

            <div className="ls-tech-grid">
              {[
                { label: "BACKEND", name: "Python + FastAPI", desc: "Async API with SQLAlchemy 2.0, background thread simulation, and SQLite with WAL mode for concurrent reads.", dir: "left" },
                { label: "FRONTEND", name: "React + TypeScript", desc: "React 19 with Vite 7, React Router 7, and Recharts for interactive position charts, lap time graphs, and probability distributions.", dir: "right" },
                { label: "SIMULATION", name: "Pure Python Engine", desc: "Zero framework dependencies. Lap model, overtake model, pit strategy optimizer, safety car module, and Monte Carlo aggregator.", dir: "left" },
                { label: "DATA", name: "FastF1 Integration", desc: "Import real historical race data from 2020-2025. Compare simulation predictions against actual results for validation.", dir: "right" },
              ].map((tech, i) => (
                <div key={tech.label} className={`ls-tech-card scroll-stagger-${tech.dir} ${techStackVis ? "stagger-in" : ""}`} style={{ transitionDelay: `${i * 0.12}s` }}>
                  <div className="ls-tech-label">{tech.label}</div>
                  <div className="ls-tech-name">{tech.name}</div>
                  <p>{tech.desc}</p>
                </div>
              ))}
            </div>

            <div className={`ls-stats-strip scroll-stagger-up ${techStackVis ? "stagger-in" : ""}`} style={{ transitionDelay: "0.5s" }}>
              <div className="ls-stat-item">
                <span className="ls-stat-num"><AnimatedCounter target={10} suffix="+" /></span>
                <span className="ls-stat-desc">Real F1 Circuits</span>
              </div>
              <div className="ls-stat-divider" />
              <div className="ls-stat-item">
                <span className="ls-stat-num"><AnimatedCounter target={20} /></span>
                <span className="ls-stat-desc">Preset Drivers</span>
              </div>
              <div className="ls-stat-divider" />
              <div className="ls-stat-item">
                <span className="ls-stat-num"><AnimatedCounter target={1000} suffix="+" /></span>
                <span className="ls-stat-desc">MC Simulations</span>
              </div>
              <div className="ls-stat-divider" />
              <div className="ls-stat-item">
                <span className="ls-stat-num"><AnimatedCounter target={57} /></span>
                <span className="ls-stat-desc">Laps Per Race</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 5: Final CTA ─── */}
        <section className="landing-section landing-section-cta" ref={cta2Ref}>
          <div className={`landing-section-inner scroll-zoom ${cta2Vis ? "revealed zoom-in" : ""}`}>
            <div className="ls-cta-circuit">
              <CircuitMap trackName="Monza" color="#e10600" opacity={0.06} size={500} />
            </div>
            <div className="ls-label">
              <span className="ls-label-dot" />
              READY?
            </div>
            <h2 className="ls-title ls-title-large">Lights out and away we go.</h2>
            <p className="ls-subtitle">
              Configure your first race, run the simulation, and watch the AI predict every overtake, pit stop, and safety car.
            </p>
            <button className="launch-btn" onClick={handleLaunch} disabled={launching} style={{ marginTop: 8 }}>
              <span className="launch-btn-bg" />
              <span className="launch-btn-text">
                {launching ? "STARTING..." : "LAUNCH SIMULATOR"}
              </span>
              <span className="launch-btn-arrow">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </button>

            <div className="ls-footer">
              <div className="ls-footer-item">
                <span className="ls-footer-label">ENGINE</span>
                <span className="ls-footer-value">Python + FastAPI</span>
              </div>
              <div className="ls-footer-item">
                <span className="ls-footer-label">FRONTEND</span>
                <span className="ls-footer-value">React + TypeScript</span>
              </div>
              <div className="ls-footer-item">
                <span className="ls-footer-label">DATA</span>
                <span className="ls-footer-value">FastF1 Integration</span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

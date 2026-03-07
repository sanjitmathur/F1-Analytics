import { useState, useRef, useEffect, useCallback } from "react";
import CircuitMap from "../components/CircuitMap";
import "./DriversPage.css";

const F1_IMG = "https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000000/common/f1/2026";

interface Driver {
  firstName: string;
  lastName: string;
  number: number;
  team: string;
  teamColor: string;
  img: string;
  wins: number;
  podiums: number;
  poles: number;
  points: number;
  championships: number;
  country: string;
  dob: string;
  grandsPrix: number;
  quote: string;
}

/* All data from formula1.com/en/drivers — career stats through end of 2025 */
const DRIVERS: Driver[] = [
  // Red Bull Racing
  { firstName: "Max", lastName: "Verstappen", number: 3, team: "RED BULL RACING", teamColor: "#3671C6", img: `${F1_IMG}/redbullracing/maxver01/2026redbullracingmaxver01right.webp`, wins: 71, podiums: 127, poles: 48, points: 3445, championships: 4, country: "Netherlands", dob: "30/09/1997", grandsPrix: 233, quote: "Every millisecond defines the difference between risk and victory. I drive where others hesitate." },
  { firstName: "Isack", lastName: "Hadjar", number: 6, team: "RED BULL RACING", teamColor: "#3671C6", img: `${F1_IMG}/redbullracing/isahad01/2026redbullracingisahad01right.webp`, wins: 0, podiums: 1, poles: 0, points: 51, championships: 0, country: "France", dob: "28/09/2004", grandsPrix: 23, quote: "I fought my way to F1 the hard way. Now the real race begins." },

  // Ferrari
  { firstName: "Charles", lastName: "Leclerc", number: 16, team: "FERRARI", teamColor: "#E8002D", img: `${F1_IMG}/ferrari/chalec01/2026ferrarichalec01right.webp`, wins: 8, podiums: 50, poles: 27, points: 1672, championships: 0, country: "Monaco", dob: "16/10/1997", grandsPrix: 171, quote: "We race not to escape life, but so that life does not escape us. The track is where I belong." },
  { firstName: "Lewis", lastName: "Hamilton", number: 44, team: "FERRARI", teamColor: "#E8002D", img: `${F1_IMG}/ferrari/lewham01/2026ferrarilewham01right.webp`, wins: 105, podiums: 202, poles: 104, points: 5019, championships: 7, country: "United Kingdom", dob: "07/01/1985", grandsPrix: 380, quote: "Still I rise. The fire inside burns brighter than the fire around. This is just the beginning." },

  // McLaren
  { firstName: "Lando", lastName: "Norris", number: 1, team: "MCLAREN", teamColor: "#FF8000", img: `${F1_IMG}/mclaren/lannor01/2026mclarenlannor01right.webp`, wins: 11, podiums: 44, poles: 16, points: 1430, championships: 1, country: "United Kingdom", dob: "13/11/1999", grandsPrix: 152, quote: "Speed is nothing without precision. Every corner is a chance to prove everyone wrong." },
  { firstName: "Oscar", lastName: "Piastri", number: 81, team: "MCLAREN", teamColor: "#FF8000", img: `${F1_IMG}/mclaren/oscpia01/2026mclarenoscpia01right.webp`, wins: 9, podiums: 26, poles: 6, points: 799, championships: 0, country: "Australia", dob: "06/04/2001", grandsPrix: 70, quote: "Patience and speed aren't opposites. The best overtakes are the ones nobody sees coming." },

  // Mercedes
  { firstName: "George", lastName: "Russell", number: 63, team: "MERCEDES", teamColor: "#27F4D2", img: `${F1_IMG}/mercedes/georus01/2026mercedesgeorus01right.webp`, wins: 5, podiums: 24, poles: 7, points: 1033, championships: 0, country: "United Kingdom", dob: "15/02/1998", grandsPrix: 152, quote: "If in doubt, go flat out. Consistency wins championships." },
  { firstName: "Kimi", lastName: "Antonelli", number: 12, team: "MERCEDES", teamColor: "#27F4D2", img: `${F1_IMG}/mercedes/kimant01/2026mercedeskimant01right.webp`, wins: 0, podiums: 3, poles: 0, points: 150, championships: 0, country: "Italy", dob: "25/08/2006", grandsPrix: 24, quote: "Age is just a number. When the visor goes down, only the stopwatch matters." },

  // Aston Martin
  { firstName: "Fernando", lastName: "Alonso", number: 14, team: "ASTON MARTIN", teamColor: "#229971", img: `${F1_IMG}/astonmartin/feralo01/2026astonmartinferalo01right.webp`, wins: 32, podiums: 106, poles: 22, points: 2393, championships: 2, country: "Spain", dob: "29/07/1981", grandsPrix: 427, quote: "Experience is the ultimate weapon. Where others see corners, I see opportunities." },
  { firstName: "Lance", lastName: "Stroll", number: 18, team: "ASTON MARTIN", teamColor: "#229971", img: `${F1_IMG}/astonmartin/lanstr01/2026astonmartinlanstr01right.webp`, wins: 0, podiums: 3, poles: 1, points: 325, championships: 0, country: "Canada", dob: "29/10/1998", grandsPrix: 190, quote: "Silence the doubters with results. The track never lies." },

  // Williams
  { firstName: "Carlos", lastName: "Sainz", number: 55, team: "WILLIAMS", teamColor: "#64C4FF", img: `${F1_IMG}/williams/carsai01/2026williamscarsai01right.webp`, wins: 4, podiums: 29, poles: 6, points: 1337, championships: 0, country: "Spain", dob: "01/09/1994", grandsPrix: 230, quote: "A smooth operator never stops evolving. The best is yet to come." },
  { firstName: "Alexander", lastName: "Albon", number: 23, team: "WILLIAMS", teamColor: "#64C4FF", img: `${F1_IMG}/williams/alealb01/2026williamsalealb01right.webp`, wins: 0, podiums: 2, poles: 0, points: 313, championships: 0, country: "Thailand", dob: "23/03/1996", grandsPrix: 128, quote: "The comeback is always stronger than the setback. I race with nothing to lose." },

  // Alpine
  { firstName: "Pierre", lastName: "Gasly", number: 10, team: "ALPINE", teamColor: "#FF87BC", img: `${F1_IMG}/alpine/piegas01/2026alpinepiegas01right.webp`, wins: 1, podiums: 5, poles: 0, points: 458, championships: 0, country: "France", dob: "07/02/1996", grandsPrix: 177, quote: "Pressure makes diamonds. Every setback is fuel for the comeback." },
  { firstName: "Franco", lastName: "Colapinto", number: 43, team: "ALPINE", teamColor: "#FF87BC", img: `${F1_IMG}/alpine/fracol01/2026alpinefracol01right.webp`, wins: 0, podiums: 0, poles: 0, points: 5, championships: 0, country: "Argentina", dob: "27/05/2003", grandsPrix: 27, quote: "The first Argentine in F1 in 23 years. I carry a nation's passion on every lap." },

  // Audi
  { firstName: "Nico", lastName: "Hulkenberg", number: 27, team: "AUDI", teamColor: "#52E252", img: `${F1_IMG}/audi/nichul01/2026audinichul01right.webp`, wins: 0, podiums: 1, poles: 1, points: 622, championships: 0, country: "Germany", dob: "19/08/1987", grandsPrix: 251, quote: "The Hulk doesn't quit. Every lap is another chance to rewrite the story." },
  { firstName: "Gabriel", lastName: "Bortoleto", number: 5, team: "AUDI", teamColor: "#52E252", img: `${F1_IMG}/audi/gabbor01/2026audigabbor01right.webp`, wins: 0, podiums: 0, poles: 0, points: 19, championships: 0, country: "Brazil", dob: "14/10/2004", grandsPrix: 24, quote: "Back-to-back F3 and F2 champion. From karting dreams to F1 reality." },

  // Racing Bulls
  { firstName: "Liam", lastName: "Lawson", number: 30, team: "RACING BULLS", teamColor: "#6692FF", img: `${F1_IMG}/racingbulls/lialaw01/2026racingbullslialaw01right.webp`, wins: 0, podiums: 0, poles: 0, points: 44, championships: 0, country: "New Zealand", dob: "11/02/2002", grandsPrix: 35, quote: "Opportunities don't wait. When the call comes, you answer with everything." },
  { firstName: "Arvid", lastName: "Lindblad", number: 41, team: "RACING BULLS", teamColor: "#6692FF", img: `${F1_IMG}/racingbulls/arvlin01/2026racingbullsarvlin01right.webp`, wins: 0, podiums: 0, poles: 0, points: 0, championships: 0, country: "United Kingdom", dob: "08/08/2007", grandsPrix: 0, quote: "Youngest-ever F3 and F2 race winner. The sole rookie on the 2026 grid." },

  // Haas
  { firstName: "Esteban", lastName: "Ocon", number: 31, team: "HAAS", teamColor: "#B6BABD", img: `${F1_IMG}/haas/estoco01/2026haasestoco01right.webp`, wins: 1, podiums: 4, poles: 0, points: 483, championships: 0, country: "France", dob: "17/09/1996", grandsPrix: 180, quote: "Resilience is my superpower. You can't break someone who refuses to stop." },
  { firstName: "Oliver", lastName: "Bearman", number: 87, team: "HAAS", teamColor: "#B6BABD", img: `${F1_IMG}/haas/olibea01/2026haasolibea01right.webp`, wins: 0, podiums: 0, poles: 0, points: 48, championships: 0, country: "United Kingdom", dob: "08/05/2005", grandsPrix: 27, quote: "Thrown into the deep end and I swam. That's what racing is about." },

  // Cadillac
  { firstName: "Sergio", lastName: "Perez", number: 11, team: "CADILLAC", teamColor: "#FFD700", img: `${F1_IMG}/cadillac/serper01/2026cadillacserper01right.webp`, wins: 6, podiums: 39, poles: 3, points: 1638, championships: 0, country: "Mexico", dob: "26/01/1990", grandsPrix: 281, quote: "The fighter with a gentle touch. Tire management is an art, and I'm the artist." },
  { firstName: "Valtteri", lastName: "Bottas", number: 77, team: "CADILLAC", teamColor: "#FFD700", img: `${F1_IMG}/cadillac/valbot01/2026cadillacvalbot01right.webp`, wins: 10, podiums: 67, poles: 20, points: 1797, championships: 0, country: "Finland", dob: "28/08/1989", grandsPrix: 246, quote: "To whom it may concern, I'm back. The best is yet to come." },
];

/* 2026 Calendar — next upcoming race */
const NEXT_RACE = { name: "Australian Grand Prix", circuit: "Albert Park", date: "8 MAR" };

function getAge(dob: string) {
  const [d, m, y] = dob.split("/").map(Number);
  const birth = new Date(y, m - 1, d);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function DriversPage() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [imgError, setImgError] = useState(false);
  const driver = DRIVERS[selectedIdx];
  const listRef = useRef<HTMLDivElement>(null);

  const switchDriver = useCallback((idx: number) => {
    if (idx === selectedIdx || transitioning) return;
    setTransitioning(true);
    setImgError(false);
    setTimeout(() => {
      setSelectedIdx(idx);
      setTransitioning(false);
    }, 300);
  }, [selectedIdx, transitioning]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        switchDriver(Math.min(selectedIdx + 1, DRIVERS.length - 1));
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        switchDriver(Math.max(selectedIdx - 1, 0));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIdx, switchDriver]);

  useEffect(() => {
    const el = listRef.current?.querySelector(".dp-sidebar-item.active");
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedIdx]);

  const age = getAge(driver.dob);

  return (
    <div className="drivers-page">
      {/* Background glow that matches team color */}
      <div className="dp-bg-glow" style={{ background: `radial-gradient(ellipse at 70% 50%, ${driver.teamColor}15, transparent 70%)` }} />
      <div className="dp-bg-glow dp-bg-glow-2" style={{ background: `radial-gradient(ellipse at 30% 80%, ${driver.teamColor}08, transparent 50%)` }} />

      {/* Sidebar */}
      <div className="dp-sidebar">
        <div className="dp-sidebar-header">
          <span className="dp-sidebar-dot" />
          <span className="dp-sidebar-title">2026 GRID</span>
          <span className="dp-sidebar-count">{DRIVERS.length}</span>
        </div>
        <div className="dp-sidebar-list" ref={listRef}>
          {DRIVERS.map((d, i) => (
            <button
              key={`${d.number}-${d.lastName}`}
              className={`dp-sidebar-item ${i === selectedIdx ? "active" : ""}`}
              onClick={() => switchDriver(i)}
            >
              <div className="dp-sidebar-color" style={{ background: i === selectedIdx ? d.teamColor : d.teamColor + "80" }} />
              <div className="dp-sidebar-info">
                <span className="dp-sidebar-num">{String(d.number).padStart(2, "0")}</span>
                <span className="dp-sidebar-name">{d.lastName.toUpperCase()}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Hero area */}
      <div className={`dp-hero ${transitioning ? "dp-hero-out" : "dp-hero-in"}`}>
        {/* Driver photo */}
        <div className="dp-photo-container">
          {!imgError ? (
            <img
              src={driver.img}
              alt={`${driver.firstName} ${driver.lastName}`}
              className="dp-photo"
              draggable={false}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="dp-photo-fallback">
              <span className="dp-photo-fallback-num">{driver.number}</span>
            </div>
          )}
          <div className="dp-photo-fade" />
        </div>

        {/* Giant number */}
        <div className="dp-number" style={{ color: `${driver.teamColor}18` }}>
          {String(driver.number).padStart(2, "0")}
        </div>

        {/* Stats panel */}
        <div className="dp-stats-panel">
          <div className="dp-stats-header">
            <div className="dp-stats-header-line" style={{ background: driver.teamColor }} />
            <span>CAREER STATS</span>
          </div>
          <div className="dp-stats-grid">
            {[
              { val: driver.wins, label: "WINS" },
              { val: driver.podiums, label: "PODIUMS" },
              { val: driver.poles, label: "POLES" },
              { val: driver.points.toLocaleString(), label: "POINTS" },
              { val: driver.championships, label: "TITLES" },
              { val: driver.grandsPrix, label: "RACES" },
            ].map((s) => (
              <div key={s.label} className="dp-stat">
                <span className="dp-stat-val">{s.val}</span>
                <span className="dp-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right meta info */}
        <div className="dp-meta">
          <div className="dp-meta-item">
            <span className="dp-meta-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </span>
            <div>
              <span className="dp-meta-val">{driver.country}</span>
            </div>
          </div>
          <div className="dp-meta-item">
            <span className="dp-meta-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </span>
            <div>
              <span className="dp-meta-val">{age} years old</span>
            </div>
          </div>
          <div className="dp-meta-item">
            <span className="dp-meta-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </span>
            <div>
              <span className="dp-meta-val">{driver.dob}</span>
              <span className="dp-meta-label">DATE OF BIRTH</span>
            </div>
          </div>
        </div>

        {/* Team badge */}
        <div className="dp-team-badge" style={{ borderColor: driver.teamColor + "40" }}>
          <div className="dp-team-dot" style={{ background: driver.teamColor, boxShadow: `0 0 10px ${driver.teamColor}60` }} />
          <span>{driver.team}</span>
        </div>

        {/* Driver name */}
        <div className="dp-name">
          <span className="dp-first-name">{driver.firstName}</span>
          <span className="dp-last-name">{driver.lastName}</span>
        </div>

        {/* Quote */}
        <div className="dp-quote">
          <span className="dp-quote-mark" style={{ color: driver.teamColor }}>&ldquo;</span>
          {driver.quote}
        </div>

        {/* Next Race card */}
        <div className="dp-next-race">
          <div className="dp-next-card">
            <div className="dp-next-card-top">
              <span className="dp-next-label">NEXT RACE</span>
              <span className="dp-next-date">{NEXT_RACE.date}</span>
            </div>
            <span className="dp-next-name">{NEXT_RACE.circuit}</span>
            <span className="dp-next-gp">{NEXT_RACE.name}</span>
            <div className="dp-next-map">
              <CircuitMap trackName="Albert Park" color="rgba(255,255,255,0.3)" opacity={0.5} size={50} />
            </div>
          </div>
        </div>

        {/* Team accent line */}
        <div className="dp-accent-line" style={{ background: `linear-gradient(to bottom, ${driver.teamColor}, transparent)` }} />

        {/* Navigation */}
        <div className="dp-nav">
          <button
            className="dp-nav-btn"
            disabled={selectedIdx === 0}
            onClick={() => switchDriver(selectedIdx - 1)}
            aria-label="Previous driver"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span className="dp-nav-counter">
            <span className="dp-nav-current" style={{ color: driver.teamColor }}>{String(selectedIdx + 1).padStart(2, "0")}</span>
            <span className="dp-nav-sep">/</span>
            <span>{String(DRIVERS.length).padStart(2, "0")}</span>
          </span>
          <button
            className="dp-nav-btn"
            disabled={selectedIdx === DRIVERS.length - 1}
            onClick={() => switchDriver(selectedIdx + 1)}
            aria-label="Next driver"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M8 5L13 10L8 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

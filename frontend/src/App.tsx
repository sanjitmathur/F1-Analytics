import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import SimulationSetupPage from "./pages/SimulationSetupPage";
import SimulationResultsPage from "./pages/SimulationResultsPage";
import MonteCarloResultsPage from "./pages/MonteCarloResultsPage";
import TracksPage from "./pages/TracksPage";
import DataImportPage from "./pages/DataImportPage";
import ComparisonPage from "./pages/ComparisonPage";
import SeasonCalendarPage from "./pages/SeasonCalendarPage";
import RacePredictionPage from "./pages/RacePredictionPage";
import HeadToHeadPage from "./pages/HeadToHeadPage";
import ChampionshipPage from "./pages/ChampionshipPage";
import WeatherAnalysisPage from "./pages/WeatherAnalysisPage";
import TrackDetailPage from "./pages/TrackDetailPage";
import ThemePicker from "./components/ThemePicker";
import "./Landing.css";
import "./App.css";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== "/dashboard" && location.pathname.startsWith(to));
  return (
    <Link
      to={to}
      style={{
        color: isActive ? "var(--text-primary)" : undefined,
        background: isActive ? "var(--bg-glass)" : undefined,
      }}
    >
      {children}
    </Link>
  );
}

/* Redirect Enter key on landing page */
function LandingKeyHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== "/") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const btn = document.querySelector(".launch-btn") as HTMLButtonElement;
        if (btn && !btn.disabled) btn.click();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, location.pathname]);

  return null;
}

/* Page transition wrapper */
function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState("enter");
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;
      setTransitionStage("exit");
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage("enter");
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [location]);

  return (
    <div className={`page-transition page-transition-${transitionStage}`}>
      <Routes location={displayLocation}>
        {children as any}
      </Routes>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const isLanding = location.pathname === "/";

  return (
    <>
      <LandingKeyHandler />
      {isLanding ? (
        <Routes>
          <Route path="/" element={<LandingPage />} />
        </Routes>
      ) : (
        <div className="app">
          <nav className="navbar">
            <Link to="/" className="nav-brand">F1 Simulator</Link>
            <div className="nav-links">
              <NavLink to="/season/2026">2026 Season</NavLink>
              <NavLink to="/championship/2026">Championship</NavLink>
              <NavLink to="/head-to-head">Head-to-Head</NavLink>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/simulate">Simulate</NavLink>
              <NavLink to="/tracks">Circuits</NavLink>
              <NavLink to="/compare">Compare</NavLink>
              <ThemePicker />
            </div>
          </nav>
          <main className="container">
            <PageTransition>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/simulate" element={<SimulationSetupPage />} />
              <Route path="/results/:id" element={<SimulationResultsPage />} />
              <Route path="/monte-carlo/:id" element={<MonteCarloResultsPage />} />
              <Route path="/tracks" element={<TracksPage />} />
              <Route path="/tracks/:id" element={<TrackDetailPage />} />
              <Route path="/import" element={<DataImportPage />} />
              <Route path="/compare" element={<ComparisonPage />} />
              <Route path="/season/2026" element={<SeasonCalendarPage />} />
              <Route path="/season/2026/race/:round" element={<RacePredictionPage />} />
              <Route path="/head-to-head" element={<HeadToHeadPage />} />
              <Route path="/championship/2026" element={<ChampionshipPage />} />
              <Route path="/weather-analysis" element={<WeatherAnalysisPage />} />
            </PageTransition>
          </main>
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;

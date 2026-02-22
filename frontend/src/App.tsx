import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import AnalysisPage from "./pages/AnalysisPage";
import FrameExtractionPage from "./pages/FrameExtractionPage";
import AnnotationPage from "./pages/AnnotationPage";
import DatasetPage from "./pages/DatasetPage";
import TrainingPage from "./pages/TrainingPage";
import ComparisonPage from "./pages/ComparisonPage";
import "./App.css";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      style={{
        color: isActive ? "#3b82f6" : undefined,
        fontWeight: isActive ? 700 : undefined,
      }}
    >
      {children}
    </Link>
  );
}

function AppContent() {
  return (
    <div className="app">
      <nav className="navbar">
        <Link to="/" className="nav-brand">F1 Pit Stop Analytics</Link>
        <div className="nav-links">
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/upload">Upload</NavLink>
          <NavLink to="/frames">Frames</NavLink>
          <NavLink to="/datasets">Datasets</NavLink>
          <NavLink to="/training">Training</NavLink>
          <NavLink to="/compare">Compare</NavLink>
        </div>
      </nav>
      <main className="container">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/analysis/:id" element={<AnalysisPage />} />
          <Route path="/frames" element={<FrameExtractionPage />} />
          <Route path="/annotate/:id" element={<AnnotationPage />} />
          <Route path="/datasets" element={<DatasetPage />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/compare" element={<ComparisonPage />} />
        </Routes>
      </main>
    </div>
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

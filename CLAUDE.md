# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

F1 AI Race Strategy Simulator — a full-stack app that models F1 races lap-by-lap with tire degradation, overtakes, pit strategies, safety cars, and Monte Carlo probability predictions. Uses FastAPI + React with a dark F1-themed dashboard.

## Development Commands

### One-click start
```bash
# Windows
start.bat
# Mac/Linux
./start.sh
```

### Manual start

**Backend** (from project root):
```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r backend/requirements.txt
cd backend && python -m uvicorn app.main:app --port 8000
```

**Frontend** (from project root):
```bash
cd frontend && npm install && npm run dev
```

### Build & Lint
```bash
# Frontend build (TypeScript check + Vite build)
cd frontend && npm run build

# Frontend lint
cd frontend && npm run lint

# Backend lint (ruff)
cd backend && ruff check app/
```

### Tests
```bash
# Backend tests (from project root)
cd backend && pip install -r requirements-dev.txt && pytest -v

# Frontend tests
cd frontend && npm run test
```

### Docker
```bash
docker compose build && docker compose up
# Frontend at http://localhost, backend at http://localhost:8000
```

## Architecture

### Tech Stack
- **Backend**: FastAPI 0.115 + SQLAlchemy 2.0 (async) + SQLite (WAL mode) + NumPy/Pandas
- **Frontend**: React 19 + TypeScript 5.9 + Vite 7.3 + React Router 7 + Recharts
- **Optional**: FastF1 for historical race data import

### Backend Structure (`backend/app/`)
- `main.py` — FastAPI app setup, CORS, router registration, preset seeding on startup
- `config.py` — Pydantic settings (reads from `.env`)
- `database.py` — Dual engines: async (`aiosqlite`) for API routes, sync for background threads
- `models.py` — SQLAlchemy ORM: Track, SimulationRun, SimulationResult, LapData, MonteCarloData, ImportedRaceData
- `schemas.py` — Pydantic request/response schemas
- `constants.py` — Preset tracks (10 circuits), preset drivers (20), team colors, HISTORICAL_STATS (real F1 data 2020-2025)
- `routers/` — API route modules: tracks, simulations, monte_carlo, data_import, presets
- `services/` — simulation_runner (background thread), fastf1_loader
- `simulation/` — Pure Python simulation engine (entities, lap_model, overtake_model, pit_strategy, safety_car, race_engine, monte_carlo)

### Simulation Engine (`backend/app/simulation/`)
Pure Python, no FastAPI dependencies:
- `entities.py` — Driver, Tire, Car, Strategy, Track, LapRecord, RaceResult dataclasses
- `lap_model.py` — `lap_time = base + tire_penalty + driver_delta + traffic + noise`
- `overtake_model.py` — Gap-based probabilistic overtakes (sigmoid curve)
- `pit_strategy.py` — Pit stop execution, strategy evaluation
- `safety_car.py` — Random SC events (~3%/lap), field compression
- `race_engine.py` — Lap-by-lap Race class orchestrating everything
- `monte_carlo.py` — Run N simulations, aggregate win/podium/position probabilities

Key formulas:
- Tire degradation: SOFT 0.08s/lap, MEDIUM 0.05s/lap, HARD 0.03s/lap
- Overtake: 0.3s gap→70%, 0.5s→55%, 0.8s→30%
- Pit loss: 20-25s configurable per track, resets tire age
- SC: configurable per track, compresses field to ~0.5s gaps

### Key Backend Patterns
- **Dual DB engines**: Async engine for FastAPI request handlers; sync engine for background simulation threads. Both point at the same SQLite DB with WAL mode.
- **Background processing**: Single-race and Monte Carlo simulations run in Python threads. Frontend polls `/api/simulations/{id}/status` for progress.
- **Preset seeding**: 10 preset tracks are seeded into the DB on startup if they don't exist.

### Frontend Structure (`frontend/src/`)
- `App.tsx` — React Router setup with 12 page routes, navbar with active-link highlighting
- `Landing.css` — Cinematic landing page styles (scrollable, multi-section with scroll-reveal animations)
- `pages/LandingPage.tsx` — Full-screen landing with canvas particle system, animated RPM tachometer, live telemetry HUD, race position ticker, F1 start-lights launch sequence, speed warp transition, and scrollable sections (features, how-it-works vertical cards, tech stack, final CTA)
- `pages/` — DashboardPage, SimulationSetupPage, SimulationResultsPage, MonteCarloResultsPage, TracksPage, DataImportPage, ComparisonPage, HeadToHeadPage, SeasonCalendarPage, RacePredictionPage, ChampionshipPage, WeatherAnalysisPage
- `components/` — PositionChart, LapTimeChart, StrategyTimeline, MonteCarloDistribution, PositionHistogram, CircuitMap, DriverComparison, PodiumSpotlight, ChampionshipChart, AccuracyGauge, RaceCalendarCard, QualifyingBracket, WeatherBadge
- `services/api.ts` — Axios client with all backend API methods
- `types/index.ts` — TypeScript interfaces

### Landing Page (`/`)
Cinematic full-screen experience that serves as the app entry point:
- **Hero section** (100vh): Animated particle field, racing line SVGs, gradient orbs, tachometer with live RPM, telemetry HUD (speed/gear/throttle/X-MODE/delta), race position ticker
- **Scroll sections**: Features grid (6 cards), How It Works (3 vertical Baraka-style cards with visuals), Tech Stack (4 cards + stats strip), Final CTA
- **Launch sequence**: F1 start lights (5 columns, lit sequentially) → "LIGHTS OUT" → speed warp → navigates to `/season/2026`
- All sections use IntersectionObserver for scroll-reveal animations

### Data Flow
1. User lands on `/` (cinematic landing page) → clicks "Enter Simulator" → start lights → navigates to 2026 Season
2. User configures race (track + drivers + strategies) on SimulationSetupPage
3. POST to `/api/simulations` creates run record and launches background thread
4. Frontend polls `/api/simulations/{id}/status` for progress
5. On completion, results/laps/MC data are fetched and visualized with Recharts

### API Proxy
Vite dev server proxies `/api` requests to `http://localhost:8000`.

### Data Directories
All under `data/` (gitignored): `fastf1_cache/`, `csv_exports/`. The SQLite database (`f1_strategy.db`) is created in `backend/` on first run.

## Configuration

Backend settings via `backend/.env` (optional, has defaults):
- `DATABASE_URL` — default `sqlite+aiosqlite:///./f1_strategy.db`
- `FASTF1_CACHE_DIR` — default `data/fastf1_cache`
- `CSV_EXPORT_DIR` — default `data/csv_exports`
- `DEFAULT_MC_SIMULATIONS` — default `1000`

## Key API Endpoints
- `GET /api/tracks` — list all tracks (presets + custom)
- `POST /api/simulations` — start a simulation (single or Monte Carlo)
- `GET /api/simulations/{id}/status` — poll simulation progress
- `GET /api/simulations/{id}/results` — race results
- `GET /api/simulations/{id}/laps` — lap-by-lap data
- `GET /api/monte-carlo/{id}` — Monte Carlo probability distributions
- `GET /api/presets/drivers` — 20 preset F1 drivers with skill ratings
- `GET /api/presets/team-colors` — team hex colors
- `POST /api/import` — import FastF1 historical data

## CORS
Backend allows origins: `localhost:5173`, `localhost:5174`, `localhost:3000`.

# F1 AI Race Strategy Simulator

Full-stack F1 race prediction platform with two modes: **2026 Season Predictor** (qualifying & race predictions for all 24 GPs) and **Custom Simulation** (user-configured races with full control). Lap-by-lap simulation engine with tire degradation, overtakes, pit strategies, safety cars, weather effects, and Monte Carlo probability predictions.

## Features

- **Cinematic Landing Page** — Animated particle field, live RPM tachometer, telemetry HUD, F1 start-lights launch sequence with speed warp transition, scrollable feature showcase
- **2026 Season Predictor** — 22 drivers, 11 teams (including Cadillac), 24 race weekends with real calendar dates
- **Qualifying Simulation** — Q1/Q2/Q3 knockout format with elimination brackets
- **Race Simulation** — Lap-by-lap engine: tire degradation, active aero overtakes, pit stops, safety cars, DNFs
- **Weather Effects** — Dry/wet/mixed conditions affecting lap times, tire choice, and SC probability
- **Monte Carlo Predictions** — Run hundreds of simulations to get win/podium/top-10 probability distributions
- **Championship Tracker** — Driver and constructor standings updated with predicted points
- **Head-to-Head Comparison** — Compare any two drivers across tracks with real historical data (2020-2025)
- **Circuit Map Visualizations** — Accurate SVG circuit outlines for 20+ F1 tracks on results pages
- **Custom Simulation** — Full control over track, drivers, strategies, and weather
- **Weather Forecasting** — Open-Meteo integration for real race weekend forecasts
- **Accuracy Tracking** — Import actual results and measure prediction accuracy (MAE, Kendall tau)

## Quick Start

### Prerequisites
- **Python 3.10+** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)

### Run

**Windows** — double-click `start.bat` or run:
```
start.bat
```

**Mac/Linux:**
```bash
chmod +x start.sh && ./start.sh
```

Then open **http://localhost:5173**.

## Manual Setup

### Backend
```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r backend/requirements.txt
cd backend && python -m uvicorn app.main:app --port 8000
```

### Frontend
```bash
cd frontend && npm install && npm run dev
```

## Docker

```bash
docker compose build && docker compose up
```

Frontend: http://localhost | Backend API: http://localhost:8000

## Testing

```bash
# Backend
cd backend && pip install -r requirements-dev.txt && pytest -v

# Frontend
cd frontend && npm run build && npm run lint
```

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy 2.0 (async), SQLite (WAL mode), NumPy, Pandas, httpx
- **Frontend**: React 19, TypeScript, Vite, React Router, Recharts
- **Optional**: FastF1 for historical data import

## API Endpoints

### Season & Calendar
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/season/2026` | Season overview + all race weekends |
| GET | `/api/season/2026/calendar` | 24-race calendar with status |
| GET | `/api/season/2026/drivers` | 22 drivers with teams + ratings |
| GET | `/api/season/2026/standings/driver` | Driver championship |
| GET | `/api/season/2026/standings/constructor` | Constructor championship |

### Predictions
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/predictions/race/{rw_id}` | Start qualifying + race prediction |
| GET | `/api/predictions/{id}/status` | Poll prediction progress |
| GET | `/api/predictions/{id}/results` | Get prediction results |
| GET | `/api/predictions/race-weekend/{rw_id}` | All predictions for a race |

### Custom Simulations
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/simulations` | Start a custom simulation |
| GET | `/api/simulations/{id}/status` | Poll progress |
| GET | `/api/simulations/{id}/results` | Race results |
| GET | `/api/simulations/{id}/laps` | Lap-by-lap data |
| GET | `/api/monte-carlo/{id}` | Monte Carlo distributions |

### Analysis
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/head-to-head` | Driver vs driver comparison |
| GET | `/api/weather/{rw_id}` | Race weather forecast |
| POST | `/api/accuracy/import/{rw_id}` | Import actual results |
| GET | `/api/accuracy/{rw_id}` | Prediction accuracy metrics |

### General
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/tracks` | List circuits |
| GET | `/api/presets/drivers` | Preset driver list |

## Configuration

Environment variables (in `backend/.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./f1_strategy.db` | Async database connection |
| `SYNC_DATABASE_URL` | `sqlite:///./f1_strategy.db` | Sync database (background threads) |
| `FASTF1_CACHE_DIR` | `data/fastf1_cache` | FastF1 data cache |
| `CSV_EXPORT_DIR` | `data/csv_exports` | CSV export directory |
| `DEFAULT_MC_SIMULATIONS` | `1000` | Default Monte Carlo iterations |

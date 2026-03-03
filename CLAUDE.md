# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

F1 Pit Stop Analytics — a full-stack computer vision app that analyzes F1 pit stop videos using YOLOv8 and displays results in a React dashboard. Phase 1 is the core video analysis pipeline; Phase 2 adds custom YOLO model training with dataset management and annotation UI.

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
```

### Tests
```bash
# Backend tests (from project root)
cd backend && pip install -r requirements-dev.txt && pytest -v

# Frontend tests
cd frontend && npm run test
```

### Lint
```bash
# Backend lint (ruff)
cd backend && ruff check app/

# Frontend lint (eslint)
cd frontend && npm run lint
```

### Docker
```bash
docker compose build && docker compose up
# Frontend at http://localhost, backend at http://localhost:8000
```

## Architecture

### Tech Stack
- **Backend**: FastAPI 0.115 + SQLAlchemy 2.0 (async) + SQLite (WAL mode) + Ultralytics YOLOv8
- **Frontend**: React 19 + TypeScript 5.9 + Vite 7.3 + React Router 7 + Recharts
- **Video downloads**: yt-dlp for YouTube URL support

### Backend Structure (`backend/app/`)
- `main.py` — FastAPI app setup, CORS, router registration, startup/shutdown events
- `config.py` — Pydantic settings (reads from `.env`); all data paths resolve relative to `_PROJECT_ROOT`
- `database.py` — Dual engines: async (`aiosqlite`) for API routes, sync for background threads
- `models.py` — SQLAlchemy ORM: PitStop, Detection, DetectionSummary, ExtractedFrame, Dataset, TrainingRun, and join tables
- `schemas.py` — Pydantic request/response schemas
- `constants.py` — `F1_CLASSES` list (pit_crew, tire, jack, etc.) and COCO class filtering
- `routers/` — API route modules: pit_stops, frames, datasets, training, models
- `services/` — Core logic: video_processor, yolo_detector, trainer, dataset_manager, frame_extractor

### Key Backend Patterns
- **Dual DB engines**: Async engine for FastAPI request handlers; sync engine for background processing threads. Both point at the same SQLite DB with WAL mode for concurrent access.
- **Singleton YOLO detector** (`yolo_detector.py`): Registry pattern supporting multiple loaded models with an "active model" concept. Custom-trained models are loaded from `data/models/`.
- **Background processing**: Video analysis and model training run in Python threads (not Celery/task queue). The frontend polls status endpoints for progress.
- **Frame sampling**: Every Nth frame processed (default N=5, configurable via `FRAME_SAMPLE_RATE`).

### Frontend Structure (`frontend/src/`)
- `App.tsx` — React Router setup with all page routes
- `pages/` — DashboardPage, UploadPage, AnalysisPage, FrameExtractionPage, AnnotationPage, DatasetPage, TrainingPage, ComparisonPage
- `components/` — Reusable UI: BboxCanvas, ConfidenceChart, FrameGrid, TimelineChart, etc.
- `services/api.ts` — Axios client with all backend API methods
- `types/index.ts` — TypeScript interfaces (single source of truth for frontend types)

### Data Flow
1. User uploads video (file or YouTube URL) → saved to `data/uploads/`
2. Background thread samples frames, runs YOLO detection, stores results in SQLite
3. Frontend polls `/api/pit-stops/{id}/status` for progress
4. On completion, analysis page shows detections, summaries, charts

### API Proxy
Vite dev server proxies `/api` requests to `http://localhost:8000`. No `.env` needed for the frontend in development.

### Data Directories
All under `data/` (gitignored): `uploads/`, `extracted_frames/`, `datasets/`, `models/`. The SQLite database (`f1_pitstop.db`) is created in `backend/` on first run.

## Configuration

Backend settings via `backend/.env` (optional, has defaults):
- `DATABASE_URL` — default `sqlite+aiosqlite:///./f1_pitstop.db`
- `UPLOAD_DIR` — default `data/uploads`
- `YOLO_MODEL` — default `yolov8n.pt` (auto-downloads ~6MB on first run)
- `FRAME_SAMPLE_RATE` — default `5`
- `DEFAULT_BASE_MODEL` — default `yolov8s.pt` (for custom training)

### Additional Directories
- `scripts/` — Utility scripts: `auto_annotate.py` (COCO-to-F1 pseudo-labeler), `mark_labeled.py` (sync DB labels)
- `docs/` — `TRAINING_GUIDE.md` for custom model training workflow
- `.github/workflows/ci.yml` — CI pipeline: ruff, pytest, eslint, vite build, vitest (5 jobs)

### Multi-Model Detection
Detections and summaries have a `model_name` column. Reprocessing a video with a different model preserves existing detections (non-destructive). The ComparisonPage shows side-by-side frame previews with per-model bounding boxes.

### Key Endpoints Added in Phase 3
- `GET /api/pit-stops/{id}/models-used` — distinct model names for a video
- `GET /api/pit-stops/{id}/summaries?model_name=` — filtered summaries by model

## CORS
Backend allows origins: `localhost:5173`, `localhost:5174`, `localhost:3000`. If the frontend starts on a different port, update the `allow_origins` list in `backend/app/main.py`.

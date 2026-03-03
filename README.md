# F1 Analytics

Full-stack computer vision platform for analyzing F1 pit stop videos. Upload race footage, detect pit crew and equipment with YOLOv8, train custom models on your own annotated data, and compare model performance — all from a single dashboard.

## Features

- **Video Analysis** — Upload local videos or paste YouTube URLs; YOLOv8 detects pit crew, tires, jacks, and more with frame-by-frame results
- **Interactive Dashboard** — Detection summaries, timeline charts, confidence distributions, and frame previews with bounding boxes
- **Frame Extraction & Annotation** — Extract frames from analyzed videos, draw bounding box annotations in-browser, and export in YOLO format
- **Dataset Management** — Organize annotated frames into datasets with automatic train/val splitting
- **Custom Model Training** — Train YOLOv8 models on your datasets directly from the UI with real-time progress tracking
- **Model Comparison** — Switch between pre-trained and custom models, reprocess videos, and compare detection results side-by-side

## Quick Start

### Prerequisites
- **Python 3.10+** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)

### Run the Dashboard

**Windows** — double-click `start.bat` or run:
```
start.bat
```

**Mac/Linux:**
```bash
chmod +x start.sh
./start.sh
```

This will automatically:
1. Create a Python virtual environment
2. Install all backend dependencies
3. Install all frontend dependencies
4. Start both servers

Then open **http://localhost:5173** in your browser.

## Usage

### Analyze a Video
1. Click **Upload** in the nav bar
2. Choose **Upload File** or **YouTube URL**
3. Wait for YOLO processing to complete (progress shown in real-time)
4. View detection results: summaries, timeline chart, confidence chart

### Train a Custom Model
1. Extract frames from an analyzed video on the **Frame Extraction** page
2. Annotate frames with bounding boxes on the **Annotation** page
3. Create a dataset and add annotated frames on the **Datasets** page
4. Split the dataset into train/val sets, then start training on the **Training** page
5. Load your trained model and reprocess videos to compare results

Supported video formats: mp4, avi, mov, mkv, webm

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy (async), SQLite, Ultralytics YOLOv8, OpenCV
- **Frontend**: React 19 + TypeScript + Vite, Recharts, React Router
- **Video Downloads**: yt-dlp for YouTube URL support
- **Models**: YOLOv8n (nano) pre-trained, auto-downloads on first run (~6MB); custom models trainable from the UI

## Manual Setup

### Backend
```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r backend/requirements.txt

cd backend
python -m uvicorn app.main:app --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Docker Deployment

```bash
docker compose build
docker compose up
```

- Frontend: **http://localhost**
- Backend API: **http://localhost:8000**
- Data persists in the `./data` volume mount

## Testing

```bash
# Backend (pytest)
cd backend
pip install -r requirements-dev.txt
pytest -v

# Frontend (vitest)
cd frontend
npm run test
```

## CI/CD

GitHub Actions runs on every push/PR to main with 5 jobs:
1. **backend-lint** — ruff
2. **backend-test** — pytest
3. **frontend-lint** — eslint
4. **frontend-build** — TypeScript + Vite build
5. **frontend-test** — vitest

## API Endpoints

### Pit Stops

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/pit-stops/upload` | Upload video for analysis |
| POST | `/api/pit-stops/from-youtube` | Submit YouTube URL |
| GET | `/api/pit-stops` | List all pit stops |
| GET | `/api/pit-stops/{id}` | Pit stop detail + summaries |
| GET | `/api/pit-stops/{id}/status` | Processing progress |
| GET | `/api/pit-stops/{id}/detections` | Paginated detections |
| POST | `/api/pit-stops/{id}/reprocess` | Re-run detection with a different model |
| GET | `/api/pit-stops/{id}/preview-frame` | Get frame with detection boxes drawn |
| GET | `/api/pit-stops/{id}/models-used` | List models that have processed this video |
| GET | `/api/pit-stops/{id}/summaries` | Detection summaries (filterable by model_name) |
| DELETE | `/api/pit-stops/{id}` | Delete pit stop |

### Frames & Annotation

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/frames/extract` | Start frame extraction from a video |
| GET | `/api/frames/extract/{job_id}/status` | Extraction job progress |
| GET | `/api/frames` | List frames (filter by pit_stop_id, labeled) |
| GET | `/api/frames/{id}/image` | Get frame image |
| POST | `/api/frames/{id}/annotate` | Save bounding box annotations |
| GET | `/api/frames/{id}/annotations` | Get existing annotations |
| DELETE | `/api/frames/{id}` | Delete a frame |

### Datasets

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/datasets` | Create a dataset |
| GET | `/api/datasets` | List all datasets |
| GET | `/api/datasets/{id}` | Get dataset details |
| POST | `/api/datasets/{id}/add-frames` | Add annotated frames to dataset |
| POST | `/api/datasets/{id}/split` | Split into train/val sets |
| GET | `/api/datasets/{id}/stats` | Dataset statistics |
| DELETE | `/api/datasets/{id}` | Delete dataset |

### Training

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/training/start` | Start a training run |
| GET | `/api/training/{run_id}/status` | Training progress |
| GET | `/api/training` | List all training runs |
| GET | `/api/training/{run_id}` | Training run details |

### Models

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/models` | List all loaded + trained models |
| GET | `/api/models/active` | Get active model |
| POST | `/api/models/active` | Set active model |
| POST | `/api/models/load` | Load a trained model |

### General

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |

## Utility Scripts

| Script | Description |
|--------|-------------|
| `scripts/auto_annotate.py` | Auto-annotate extracted frames using a COCO model with F1 class mapping |
| `scripts/mark_labeled.py` | Sync auto-annotated frames as labeled in the database |

See [docs/TRAINING_GUIDE.md](docs/TRAINING_GUIDE.md) for the full custom model training workflow.

## Configuration

Environment variables (in `backend/.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./f1_pitstop.db` | Database connection |
| `UPLOAD_DIR` | `../data/uploads` | Video upload directory |
| `YOLO_MODEL` | `yolov8n.pt` | Default YOLO model |
| `FRAME_SAMPLE_RATE` | `5` | Analyze every Nth frame |
| `DEFAULT_BASE_MODEL` | `yolov8s.pt` | Base model for custom training |

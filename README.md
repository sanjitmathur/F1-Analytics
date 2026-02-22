# F1 Pit Stop Analytics Dashboard

Computer vision system that analyzes F1 pit stop videos using YOLOv8, with results displayed in a React dashboard.

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy (async), SQLite, Ultralytics YOLOv8, OpenCV
- **Frontend**: React + TypeScript + Vite, Recharts, React Router
- **Model**: YOLOv8n (nano) - pre-trained, auto-downloads on first run (~6MB)

## Setup

### Backend

```bash
# From project root
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate
pip install -r backend/requirements.txt

# Copy env config (optional - defaults work out of the box)
cp backend/.env.example backend/.env

# Start the API server
cd backend
uvicorn app.main:app --reload --port 8000
```

The YOLO model downloads automatically on first startup.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173 with API proxy to backend.

## Usage

1. Start both backend and frontend
2. Navigate to http://localhost:5173
3. Click "Upload" and select a pit stop video (mp4, avi, mov, mkv, webm)
4. Wait for YOLO processing to complete (progress shown in real-time)
5. View detection results: summaries, timeline chart, confidence chart

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/pit-stops/upload` | Upload video for analysis |
| GET | `/api/pit-stops` | List all pit stops |
| GET | `/api/pit-stops/{id}` | Pit stop detail + summaries |
| GET | `/api/pit-stops/{id}/status` | Processing progress |
| GET | `/api/pit-stops/{id}/detections` | Paginated detections |
| DELETE | `/api/pit-stops/{id}` | Delete pit stop |

## Configuration

Environment variables (in `backend/.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./f1_pitstop.db` | Database connection |
| `UPLOAD_DIR` | `../data/uploads` | Video upload directory |
| `YOLO_MODEL` | `yolov8n.pt` | YOLO model file |
| `FRAME_SAMPLE_RATE` | `5` | Analyze every Nth frame |

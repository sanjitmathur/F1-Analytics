# F1 Pit Stop Analytics Dashboard

Computer vision system that analyzes F1 pit stop videos using YOLOv8, with results displayed in a React dashboard.

## Quick Start

### Prerequisites
- **Python 3.10+** - [python.org](https://www.python.org/downloads/)
- **Node.js 18+** - [nodejs.org](https://nodejs.org/)

### Run the Dashboard

**Windows** - double-click `start.bat` or run:
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

1. Click **Upload** in the nav bar
2. Choose **Upload File** to upload a local video, or **YouTube URL** to paste a pit stop link
3. Wait for YOLO processing to complete (progress shown in real-time)
4. View detection results: summaries, timeline chart, confidence chart

Supported formats: mp4, avi, mov, mkv, webm

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy (async), SQLite, Ultralytics YOLOv8, OpenCV
- **Frontend**: React + TypeScript + Vite, Recharts, React Router
- **Model**: YOLOv8n (nano) - pre-trained, auto-downloads on first run (~6MB)

## Manual Setup

If you prefer to set things up manually:

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

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/pit-stops/upload` | Upload video for analysis |
| POST | `/api/pit-stops/from-youtube` | Submit YouTube URL |
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

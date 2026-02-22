#!/usr/bin/env bash
set -e

echo "============================================"
echo "  F1 Pit Stop Analytics Dashboard"
echo "============================================"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 is not installed. Please install Python 3.10+"
    exit 1
fi

# Check Node
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

# Setup backend
echo "[1/4] Setting up Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

echo "[2/4] Installing backend dependencies..."
source venv/bin/activate
pip install -r backend/requirements.txt --quiet

# Setup frontend
echo "[3/4] Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install --silent
fi
cd ..

# Cleanup function
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $BACKEND_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start servers
echo "[4/4] Starting servers..."
echo ""
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo ""
echo "  Open http://localhost:5173 in your browser."
echo "  Press Ctrl+C to stop both servers."
echo "============================================"
echo ""

# Start backend in background
source venv/bin/activate
cd backend
python -m uvicorn app.main:app --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 5

# Start frontend (foreground)
cd frontend
npx vite --host

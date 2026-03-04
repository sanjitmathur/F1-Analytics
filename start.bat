@echo off
title F1 AI Race Strategy Simulator
echo ============================================
echo   F1 AI Race Strategy Simulator
echo ============================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed. Please install Python 3.10+ from python.org
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ from nodejs.org
    pause
    exit /b 1
)

:: Setup backend
echo [1/4] Setting up Python virtual environment...
if not exist "venv" (
    python -m venv venv
)

echo [2/4] Installing backend dependencies...
call venv\Scripts\activate.bat
pip install -r backend\requirements.txt --quiet

:: Setup frontend
echo [3/4] Installing frontend dependencies...
cd frontend
if not exist "node_modules" (
    call npm install --silent
)
cd ..

:: Start servers
echo [4/4] Starting servers...
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo.
echo   Open http://localhost:5173 in your browser.
echo   Press Ctrl+C to stop both servers.
echo ============================================
echo.

:: Start backend in background
start /b cmd /c "call venv\Scripts\activate.bat && cd backend && python -m uvicorn app.main:app --port 8000 2>&1"

:: Wait for backend to start
timeout /t 5 /nobreak >nul

:: Start frontend (foreground so Ctrl+C kills everything)
cd frontend
call npx vite --host

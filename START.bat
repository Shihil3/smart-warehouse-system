@echo off
title Smart Warehouse System — Launcher
color 0A

echo.
echo  ============================================================
echo    SMART WAREHOUSE MANAGEMENT SYSTEM
echo  ============================================================
echo.

REM ── Ask whether to reset demo data ───────────────────────────
set /p RESET="  Reset demo data before starting? (y/n): "
echo.

if /i "%RESET%"=="y" (
    echo  [1/4] Resetting demo data...
    echo  --------------------------------------------------------
    cd /d "%~dp0backend"
    ruby scripts\reset_and_seed_demo.rb
    if %ERRORLEVEL% neq 0 (
        echo.
        echo  ERROR: Seed script failed. Is PostgreSQL running?
        pause
        exit /b 1
    )
    python scripts\generate_qr_codes.py >nul 2>&1
    echo  Demo data ready.
    echo.
) else (
    echo  Skipping demo reset.
    echo.
)

REM ── Kill any old processes on our ports ───────────────────────
echo  Clearing ports 4567 / 8000 / 5173 ...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4567 "  2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 "  2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 "  2^>nul') do taskkill /F /PID %%a >nul 2>&1
echo.

REM ── Start backend ─────────────────────────────────────────────
echo  [2/4] Starting Backend       http://localhost:4567
start "SWMS Backend" cmd /k "cd /d "%~dp0backend" && ruby app.rb"

REM ── Start optimizer ───────────────────────────────────────────
echo  [3/4] Starting Optimizer     http://localhost:8000
if not exist "%~dp0optimizer\venv\Scripts\activate.bat" (
    echo         (first run: creating venv and installing deps...)
    cd /d "%~dp0optimizer"
    python -m venv venv
    venv\Scripts\pip install -r requirements.txt >nul 2>&1
)
start "SWMS Optimizer" cmd /k "cd /d "%~dp0optimizer" && venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000"

REM ── Wait a moment for backend to boot ─────────────────────────
timeout /t 4 /nobreak >nul

REM ── Start frontend ────────────────────────────────────────────
echo  [4/4] Starting Frontend      http://localhost:5173
start "SWMS Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

REM ── Wait for frontend dev server then open browser ────────────
timeout /t 5 /nobreak >nul
echo.
echo  Opening browser...
start "" "http://localhost:5173"

echo.
echo  ============================================================
echo    All services are running.
echo.
echo    Frontend   :  http://localhost:5173
echo    Backend    :  http://localhost:4567
echo    Optimizer  :  http://localhost:8000
echo.
echo    Login credentials:
echo      Manager  ->  manager@warehouse.com  / manager123
echo      Worker   ->  worker@warehouse.com   / worker123
echo      Leadman  ->  worker3@warehouse.com  / worker123
echo.
echo    Close the three terminal windows to stop all services.
echo  ============================================================
echo.
pause

@echo off
cd /d "%~dp0optimizer"
if not exist "venv\Scripts\activate.bat" (
    echo Creating virtual environment...
    python -m venv venv
    echo Installing dependencies...
    venv\Scripts\pip install -r requirements.txt
)
echo Starting optimizer on http://localhost:8000 ...
venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

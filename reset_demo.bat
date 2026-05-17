@echo off
echo.
echo ==============================================
echo   Smart Warehouse — Demo Reset
echo   Run this before each presentation
echo ==============================================
echo.

cd /d "%~dp0backend"

echo [1/3] Running database reset and seed...
ruby scripts\reset_and_seed_demo.rb
if %ERRORLEVEL% neq 0 (
    echo ERROR: Seed script failed. Check PostgreSQL is running.
    pause
    exit /b 1
)

echo.
echo [2/3] Generating QR code PNG files...
python scripts\generate_qr_codes.py
if %ERRORLEVEL% neq 0 (
    echo WARNING: QR generation failed. Check: pip install qrcode[pil] Pillow psycopg2-binary
    echo Continuing without QR PNGs...
)

echo.
echo [3/3] Demo data ready!
echo.
echo   QR code PNGs saved to:  backend\generated_qrs\
echo.
echo   Login credentials:
echo     Manager  -^>  manager@warehouse.com / manager123
echo     Worker   -^>  worker@warehouse.com  / worker123
echo     Leadman  -^>  worker3@warehouse.com / worker123
echo.
echo   Now start the services:
echo     start-backend.bat
echo     start-optimizer.bat
echo     start-frontend.bat
echo.
pause

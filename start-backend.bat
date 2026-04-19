@echo off
cd /d "%~dp0backend"
echo Starting backend on http://localhost:4567 ...
ruby app.rb

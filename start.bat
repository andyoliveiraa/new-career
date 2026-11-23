@echo off
echo ========================================================
echo       Iniciando a Plataforma New Career
echo ========================================================
echo.

echo 1. Iniciando Backend FastAPI em http://localhost:8000 ...
start "New Career - Backend" cmd /k "cd /d %~dp0 && backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

echo 2. Iniciando Frontend React em http://localhost:5173 ...
start "New Career - Frontend" cmd /k "cd /d %~dp0\frontend && npm.cmd run dev"

echo.
echo Tudo pronto! Abra http://localhost:5173 no seu navegador.
echo ========================================================
pause

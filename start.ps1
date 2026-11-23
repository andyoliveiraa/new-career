# Script PowerShell para iniciar a plataforma New Career
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       Iniciando a Plataforma New Career" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot

Write-Host "1. Iniciando Backend FastAPI em http://localhost:8000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; `$env:PYTHONPATH = '.'; .\backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

Write-Host "2. Iniciando Frontend React em http://localhost:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm.cmd run dev"

Write-Host ""
Write-Host "Tudo pronto! Abra http://localhost:5173 no seu navegador." -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

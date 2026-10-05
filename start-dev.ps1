# Bus Management - Dev Startup Script
# Run: powershell -ExecutionPolicy Bypass -File start-dev.ps1

Write-Host "Starting Bus Management Dev Environment..." -ForegroundColor Green

$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = Get-Location }

# Start backend
Write-Host "Starting backend (Python FastAPI)..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$rootDir\backend-python'; .\venv\Scripts\python.exe run.py" -WorkingDirectory "$rootDir\backend-python" -WindowStyle Normal

Start-Sleep 5

# Start frontend
Write-Host "Starting frontend (Vite)..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$rootDir\frontend'; npm run dev" -WorkingDirectory "$rootDir\frontend" -WindowStyle Normal

Start-Sleep 5

# Open browser to application
Start-Process "http://localhost:4173/auth/login"

Write-Host ""
Write-Host "All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:8080" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:4173" -ForegroundColor Cyan
Write-Host "Ngrok:    check http://localhost:4040 for public URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "Payment flow: book ticket -> scan SePay VietQR -> wait for verified webhook confirmation" -ForegroundColor Magenta

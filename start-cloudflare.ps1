# ============================================================================
# XE KHACH PRO — CLOUDFLARE PUBLIC TUNNEL DEPLOY SCRIPT
# Tự động khởi động Backend + Frontend + Tạo đường dẫn công khai Cloudflare
# Cách chạy: powershell -ExecutionPolicy Bypass -File .\start-cloudflare.ps1
# ============================================================================

$Host.UI.RawUI.WindowTitle = "XeKhach Pro - Cloudflare Public Tunnel"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🚌 XE KHACH PRO — KHỞI CHẠY CLOUDFLARE PUBLIC TUNNEL      " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = Get-Location }

# 1. Kiểm tra MySQL Database
Write-Host "[1/3] Kiểm tra kết nối MySQL Database (port 3306)..." -ForegroundColor Yellow
$mysqlRunning = Test-NetConnection -ComputerName 127.0.0.1 -Port 3306 -InformationLevel Quiet
if (-not $mysqlRunning) {
    Write-Host "⚠️  CẢNH BÁO: MySQL chưa mở cổng 3306. Hãy đảm bảo MySQL Server đang chạy!" -ForegroundColor Red
} else {
    Write-Host "✅ MySQL Server đang chạy tốt." -ForegroundColor Green
}

# 2. Khởi động Backend (FastAPI - Port 8080)
Write-Host "[2/3] Kiểm tra Backend Python FastAPI (port 8080)..." -ForegroundColor Yellow
$backendRunning = Test-NetConnection -ComputerName 127.0.0.1 -Port 8080 -InformationLevel Quiet
if (-not $backendRunning) {
    Write-Host "🚀 Đang khởi động Backend FastAPI trong cửa sổ riêng..." -ForegroundColor Cyan
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$rootDir\backend-python'; .\venv\Scripts\python.exe run.py" -WorkingDirectory "$rootDir\backend-python" -WindowStyle Normal
    Start-Sleep -Seconds 4
} else {
    Write-Host "✅ Backend đã chạy sẵn trên http://localhost:8080" -ForegroundColor Green
}

# 3. Khởi động Frontend (Vite - Port 4173)
Write-Host "[3/3] Kiểm tra Frontend Vite React (port 4173)..." -ForegroundColor Yellow
$frontendRunning = Test-NetConnection -ComputerName 127.0.0.1 -Port 4173 -InformationLevel Quiet
if (-not $frontendRunning) {
    Write-Host "🚀 Đang khởi động Frontend Vite trong cửa sổ riêng..." -ForegroundColor Cyan
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$rootDir\frontend'; npm run dev" -WorkingDirectory "$rootDir\frontend" -WindowStyle Normal
    Start-Sleep -Seconds 4
} else {
    Write-Host "✅ Frontend đã chạy sẵn trên http://localhost:4173" -ForegroundColor Green
}

# 4. Kiểm tra công cụ cloudflared
$cfVersion = cloudflared --version 2>$null
if (-not $cfVersion) {
    Write-Host ""
    Write-Host "❌ Chưa tìm thấy công cụ 'cloudflared' trên máy." -ForegroundColor Red
    Write-Host "👉 Bạn có thể tải tại: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " 🌐 ĐANG KẾT NỐI VÀO MẠNG LƯỚI TOÀN CẦU CLOUDFLARE...      " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "👉 Tìm dòng chữ có link https://xxxx.trycloudflare.com bên dưới:" -ForegroundColor Yellow
Write-Host "👉 Copy đường link đó và gửi cho bạn bè hoặc mở trên điện thoại!" -ForegroundColor Cyan
Write-Host "👉 Tính năng định vị GPS chọn trạm xe sẽ hoạt động 100% nhờ có HTTPS!" -ForegroundColor Magenta
Write-Host "👉 Bấm Ctrl + C trong cửa sổ này khi bạn muốn ngưng chia sẻ." -ForegroundColor DarkGray
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""

# Chạy Cloudflare Quick Tunnel trỏ vào Frontend (port 4173 đã proxy sẵn /api sang backend 8080)
cloudflared tunnel --url http://localhost:4173

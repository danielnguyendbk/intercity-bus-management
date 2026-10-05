# E2E Test script cho SePay VietQR (Chạy trên Windows PowerShell)
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   KIỂM THỬ TÍCH HỢP SEPAY VIETQR PAYMENT (E2E)  " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

cd backend-python
.\venv\Scripts\python.exe test_sepay_e2e.py
cd ..

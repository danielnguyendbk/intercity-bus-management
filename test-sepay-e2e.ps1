# Local regression tests only: mocked provider, in-memory database, no money transfer.
$ErrorActionPreference = "Stop"
$backendPath = Join-Path $PSScriptRoot "backend-python"
Push-Location -LiteralPath $backendPath
try {
    Write-Host "SePay local regression tests (not live E2E)" -ForegroundColor Cyan
    & .\venv\Scripts\python.exe -m unittest discover -s tests -v
    $testExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $testExitCode

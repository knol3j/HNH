# Standalone Mining Starter Script
# This script starts the mining agent without requiring a browser

Write-Host "=== HashNHedge Standalone Miner ===" -ForegroundColor Cyan
# cspell:ignore Ravencoin
Write-Host "GPU Mining Enabled (Default: Ravencoin/KawPow)" -ForegroundColor Green
Write-Host ""

# Check if Node.js is available
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host "ERROR: Node.js is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Check if XMRig exists
$minerExecutable = "xmrig.exe"
$xmrigPath = Join-Path $PSScriptRoot "bin\$minerExecutable"
if (-not (Test-Path $xmrigPath)) {
    Write-Host "XMRig not found. Running setup..." -ForegroundColor Yellow
    Write-Host ""
    & "$PSScriptRoot\setup_miner_windows.ps1"
    if (-not $?) {
        Write-Host "Setup failed. Please run setup_miner_windows.ps1 manually." -ForegroundColor Red
        pause
        exit 1
    }
}

# Check if dependencies are installed
if (-not (Test-Path (Join-Path $PSScriptRoot "node_modules"))) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    Set-Location $PSScriptRoot
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install dependencies!" -ForegroundColor Red
        pause
        exit 1
    }
}

# Display configuration
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Default Coin: Ravencoin (RVN)" -ForegroundColor White
Write-Host "  Algorithm: KawPow (GPU)" -ForegroundColor White
Write-Host "  Pool: rvn.2miners.com:6060" -ForegroundColor White
Write-Host "  API Server: http://localhost:4343" -ForegroundColor White
Write-Host ""
Write-Host "To change settings, edit agent/server.js or use the API:" -ForegroundColor Yellow
Write-Host "  POST http://localhost:4343/config" -ForegroundColor Gray
Write-Host ""
Write-Host "Starting mining agent..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start the server
Set-Location $PSScriptRoot
node server.js


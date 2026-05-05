# setup_miner_windows.ps1
# MinerGate-style Windows Setup Script
# Simple, reliable mining setup with SHA256 verification

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$BIN_DIR = Join-Path $PSScriptRoot "bin"
$SCRIPT_DIR = $PSScriptRoot

# --- CHECK DEPENDENCIES ---
try {
    Get-Command node -ErrorAction Stop | Out-Null
    Write-Host "Node.js is installed." -ForegroundColor Green
}
catch {
    Write-Host "Node.js is NOT installed." -ForegroundColor Yellow
    Write-Host "Attempting to install Node.js (LTS) via winget..." -ForegroundColor Cyan
    try {
        winget install -e --id OpenJS.NodeJS
        Start-Sleep -Seconds 15
        Get-Command node -ErrorAction Stop | Out-Null
        Write-Host "Node.js successfully installed." -ForegroundColor Green
    }
    catch {
        Write-Host "CRITICAL ERROR: Could not auto-install Node.js." -ForegroundColor Red
        Write-Host "Please manually download and install Node.js (LTS) from: https://nodejs.org/" -ForegroundColor Yellow
        Write-Host "After installing, please RESTART your terminal and run this script again." -ForegroundColor Red
        pause
        exit 1
    }
}

# Create bin directory
if (!(Test-Path -Path $BIN_DIR)) {
    New-Item -ItemType Directory -Path $BIN_DIR | Out-Null
}

# --- MINER VERSIONS ---
$XMRIG_VERSION = "6.22.1"
$TREX_VERSION = "0.26.9"
$LOLMINER_VERSION = "1.76"

Write-Host "=== HashNHedge Miner Setup ===" -ForegroundColor Cyan
Write-Host ""

# --- XMRIG (CPU Miner) ---
$XMRIG_URL = "https://github.com/xmrig/xmrig/releases/download/v${XMRIG_VERSION}/xmrig-${XMRIG_VERSION}-msvc-win64.zip"
$XMRIG_HASH = "1d8060ce86b65e0eb489ead196660ba8064f711beca612551d40e94a46d8e628"
$ZIP_PATH = Join-Path $BIN_DIR "xmrig.zip"

Write-Host "Downloading XMRig ${XMRIG_VERSION}..." -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri $XMRIG_URL -OutFile $ZIP_PATH -UseBasicParsing
}
catch {
    Write-Error "Download failed: $_"
    Write-Host "Please manually download from: $XMRIG_URL" -ForegroundColor Yellow
    exit 1
}

Write-Host "Verifying SHA256 checksum..." -ForegroundColor Cyan
$actualHash = (Get-FileHash -Path $ZIP_PATH -Algorithm SHA256).Hash

if ($actualHash -ne $XMRIG_HASH) {
    Write-Host "SHA256 verification FAILED!" -ForegroundColor Red
    Write-Host "   Expected: $XMRIG_HASH" -ForegroundColor Red
    Write-Host "   Got:      $actualHash" -ForegroundColor Red
    Remove-Item -Path $ZIP_PATH -Force
    exit 1
}
Write-Host "Checksum verified" -ForegroundColor Green

Write-Host "Extracting XMRig..." -ForegroundColor Cyan
Expand-Archive -Path $ZIP_PATH -DestinationPath $BIN_DIR -Force

# Flatten extracted files
$extractedExe = Get-ChildItem -Path $BIN_DIR -Recurse -Filter "xmrig.exe" | Select-Object -First 1
if ($extractedExe) {
    $xmrigRoot = Split-Path $extractedExe.FullName -Parent
    if ($xmrigRoot -ne $BIN_DIR) {
        Get-ChildItem -Path $xmrigRoot -File | ForEach-Object {
            Move-Item -Path $_.FullName -Destination $BIN_DIR -Force
        }
        Remove-Item -Path $xmrigRoot -Recurse -Force
    }
}
Remove-Item -Path $ZIP_PATH -Force

# --- T-REX (GPU Miner - Optional) ---
$TREX_URL = "https://github.com/trexminer/T-Rex/releases/download/${TREX_VERSION}/t-rex-${TREX_VERSION}-win.zip"
$TREX_ZIP = Join-Path $BIN_DIR "trex.zip"

Write-Host "Downloading T-Rex ${TREX_VERSION} (GPU)..." -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri $TREX_URL -OutFile $TREX_ZIP -UseBasicParsing
    Expand-Archive -Path $TREX_ZIP -DestinationPath $BIN_DIR -Force
    Remove-Item -Path $TREX_ZIP -Force
}
catch {
    Write-Host "T-Rex download failed (GPU mining will be unavailable)" -ForegroundColor Yellow
}

# --- LOLMINER (GPU Miner - Optional) ---
$LOL_URL = "https://github.com/Lolliedieb/lolMiner-releases/releases/download/${LOLMINER_VERSION}/lolMiner_v${LOLMINER_VERSION}_Win64.zip"
$LOL_ZIP = Join-Path $BIN_DIR "lolminer.zip"

Write-Host "Downloading lolMiner ${LOLMINER_VERSION} (GPU)..." -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri $LOL_URL -OutFile $LOL_ZIP -UseBasicParsing
    Expand-Archive -Path $LOL_ZIP -DestinationPath $BIN_DIR -Force
    $lolDir = Join-Path $BIN_DIR "1.76"
    if (Test-Path $lolDir) {
        Get-ChildItem -Path $lolDir -Recurse -Filter "lolMiner.exe" | ForEach-Object { 
            Move-Item -Path $_.FullName -Destination $BIN_DIR -Force 
        }
        Remove-Item -Path $lolDir -Recurse -Force
    }
    Remove-Item -Path $LOL_ZIP -Force
}
catch {
    Write-Host "lolMiner download failed (GPU mining will be unavailable)" -ForegroundColor Yellow
}

# NOTE: Mining software is often flagged by Antivirus.
Write-Host "NOTE: Mining software is often flagged by Antivirus." -ForegroundColor Yellow
Write-Host "If you see 'Threat Detected', please add an EXCLUSION for the 'agent\bin' folder." -ForegroundColor Yellow
Write-Host "Hardware ID (ZKP) support is built-in for marketplace verification." -ForegroundColor Cyan
Start-Sleep -Seconds 2

# --- NODE DEPENDENCIES ---
Write-Host "Installing Agent dependencies..." -ForegroundColor Cyan
npm install

# --- CONFIGURATION ---
Write-Host "---------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "CONFIGURATION SETUP" -ForegroundColor Cyan
Write-Host "---------------------------------------------------------------" -ForegroundColor Cyan

$wallets = @{}
$coins = @("XMR", "ZEPH", "RVN", "ETC", "ERG", "KAS")

foreach ($coin in $coins) {
    $userInput = Read-Host "Enter your $coin Wallet Address (Leave empty to skip)"
    if (-not [string]::IsNullOrWhiteSpace($userInput)) {
        $wallets[$coin] = $userInput.Trim()
    }
}

$gpuMining = "false"
$gpuInput = Read-Host "Enable GPU Mining? (Y/N)"
if ($gpuInput -match "^[Yy]") {
    $gpuMining = "true"
}

# Save configuration
$DATA_FILE = Join-Path $SCRIPT_DIR "data.json"
$configData = @{
    wallets     = $wallets
    miningMode  = if ($gpuMining -eq "true") { "gpu" } else { "cpu" }
    totalShares = 0
    feeShares   = 0
    password    = "x"
}

$jsonPayload = $configData | ConvertTo-Json -Depth 5
Set-Content -Path $DATA_FILE -Value $jsonPayload -Encoding UTF8
Write-Host "Configuration saved to $DATA_FILE" -ForegroundColor Green

# --- CREATE STARTUP SCRIPT ---
$BATCH_CONTENT = "@echo off`r`ncd /d `"%~dp0`"`r`nnode server.js`r`n`r`n# MinerGate-style: simple startup with logging"
$BATCH_PATH = Join-Path $SCRIPT_DIR "start_miner.bat"
Set-Content -Path $BATCH_PATH -Value $BATCH_CONTENT

Write-Host ""
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "Double-click 'start_miner.bat' to start the native miner agent." -ForegroundColor Yellow
# setup_miner_windows.ps1
# PowerShell Setup Script for Native Miner Agent (Windows)

$ErrorActionPreference = "Stop"

$BIN_DIR = Join-Path $PSScriptRoot "bin"

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
        Write-Host "Node.js installation initiated. Please wait..." -ForegroundColor Green
        Start-Sleep -Seconds 10
        # Check again
        try {
            Get-Command node -ErrorAction Stop | Out-Null
            Write-Host "Node.js successfully installed." -ForegroundColor Green
        }
        catch {
            throw "Installation check failed."
        }
    }
    catch {
        Write-Host "CRITICAL ERROR: Could not auto-install Node.js." -ForegroundColor Red
        Write-Host "Please manually download and install Node.js (LTS) from: https://nodejs.org/" -ForegroundColor Yellow
        Write-Host "After installing, please RESTART your terminal and run this script again." -ForegroundColor Red
        pause
        exit 1
    }
}

if (!(Test-Path -Path $BIN_DIR)) {
    New-Item -ItemType Directory -Path $BIN_DIR | Out-Null
}

$XMRIG_URL = "https://github.com/xmrig/xmrig/releases/download/v6.21.0/xmrig-6.21.0-msvc-win64.zip"
$XMRIG_HASH = "4cf4198354abfee7e502c85f38e62dbb90fec976e4df38d0ecbfd811937c1981"
$ZIP_NAME = "xmrig.zip"
$ZIP_PATH = Join-Path $BIN_DIR $ZIP_NAME

Write-Host "=== HashNHedge Miner Setup ==="
Write-Host ""

if (Test-Path $ZIP_PATH) {
    Write-Host "Found existing $ZIP_NAME. Skipping download." -ForegroundColor Yellow
}
else {
    Write-Host "Downloading XMRig for Windows..." -ForegroundColor Cyan
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $XMRIG_URL -OutFile $ZIP_PATH
    }
    catch {
        Write-Error "Download failed: $_"
        Write-Host "---------------------------------------------------------------" -ForegroundColor Red
        Write-Host "Please manually download the file from:" -ForegroundColor Yellow
        Write-Host $XMRIG_URL -ForegroundColor White
        Write-Host "and save it to:" -ForegroundColor Yellow
        Write-Host $ZIP_PATH -ForegroundColor White
        Write-Host "Then run this script again." -ForegroundColor Red
        Write-Host "---------------------------------------------------------------" -ForegroundColor Red
        exit 1
    }
}

# SHA256 Verification
Write-Host "Verifying SHA256 checksum..." -ForegroundColor Cyan
$actualHash = (Get-FileHash -Path $ZIP_PATH -Algorithm SHA256).Hash

if ($actualHash -ne $XMRIG_HASH) {
    Write-Host "SHA256 verification FAILED!" -ForegroundColor Red
    Write-Host "   Expected: $XMRIG_HASH" -ForegroundColor Red
    Write-Host "   Got:      $actualHash" -ForegroundColor Red
    Write-Host ""
    Write-Host "This could indicate a corrupted download or tampered binary." -ForegroundColor Yellow
    Write-Host "Please check your network and try again." -ForegroundColor Yellow
    Remove-Item -Path $ZIP_PATH -Force
    pause
    exit 1
}
Write-Host "Checksum verified" -ForegroundColor Green
Write-Host ""

Write-Host "Extracting..." -ForegroundColor Cyan
Expand-Archive -Path $ZIP_PATH -DestinationPath $BIN_DIR -Force

# Locate the extracted XMRig directory and flatten all files into bin root.
# XMRig bundles WinRing0x64.sys for MSR tweaks on Windows, so we must preserve it.
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
else {
    Write-Error "Could not find xmrig.exe after extraction"
}

# Cleanup Zip
Remove-Item -Path $ZIP_PATH -Force

# --- T-REX MINER (GPU) ---
$TREX_URL = "https://github.com/trexminer/T-Rex/releases/download/0.26.8/t-rex-0.26.8-win.zip"
$TREX_HASH = "207bfa95050e2ac1f16ceecd5891b93eda7bada2730b4e7172283d72f5ad2309"
$TREX_ZIP = Join-Path $BIN_DIR "trex.zip"

Write-Host "Downloading T-Rex for Windows..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $TREX_URL -OutFile $TREX_ZIP
$actualTrexHash = (Get-FileHash -Path $TREX_ZIP -Algorithm SHA256).Hash
if ($actualTrexHash -ne $TREX_HASH) {
    Write-Host "T-Rex SHA256 verification FAILED!" -ForegroundColor Red
    Remove-Item -Path $TREX_ZIP -Force
    exit 1
}
Write-Host "T-Rex Checksum verified" -ForegroundColor Green
Expand-Archive -Path $TREX_ZIP -DestinationPath $BIN_DIR -Force
Remove-Item -Path $TREX_ZIP -Force

# --- LOLMINER (GPU) ---
$LOL_URL = "https://github.com/Lolliedieb/lolMiner-releases/releases/download/1.76/lolMiner_v1.76_Win64.zip"
$LOL_HASH = "2daf2ef818439c520a81182da2c8349fdac715ad3778e31aefed027015130edc"
$LOL_ZIP = Join-Path $BIN_DIR "lolminer.zip"

Write-Host "Downloading lolMiner for Windows..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $LOL_URL -OutFile $LOL_ZIP
$actualLolHash = (Get-FileHash -Path $LOL_ZIP -Algorithm SHA256).Hash
if ($actualLolHash -ne $LOL_HASH) {
    Write-Host "lolMiner SHA256 verification FAILED!" -ForegroundColor Red
    Remove-Item -Path $LOL_ZIP -Force
    exit 1
}
Write-Host "lolMiner Checksum verified" -ForegroundColor Green
Expand-Archive -Path $LOL_ZIP -DestinationPath $BIN_DIR -Force
$lolDir = Join-Path $BIN_DIR "1.76"
if (Test-Path $lolDir) {
    Get-ChildItem -Path $lolDir -Recurse -Filter "lolMiner.exe" | ForEach-Object { Move-Item -Path $_.FullName -Destination $BIN_DIR -Force }
    Remove-Item -Path $lolDir -Recurse -Force
}
Remove-Item -Path $LOL_ZIP -Force

# --- CUDA PLUGIN ---
# --- ANTIVIRUS WARNING ---
Write-Host "NOTE: Mining software is often flagged by Antivirus/Windows Defender." -ForegroundColor Yellow
Write-Host "If you see 'Threat Detected' or files disappearing, please add an EXCLUSION for the 'agent' folder." -ForegroundColor Yellow
Start-Sleep -Seconds 2

$CUDA_URL = "https://github.com/xmrig/xmrig-cuda/releases/download/v6.22.1/xmrig-cuda-6.22.1-cuda12_9-win64.zip"
$CUDA_ZIP_NAME = "xmrig-cuda-6.22.1-cuda12_9-win64.zip"
$CUDA_ZIP_PATH = Join-Path $BIN_DIR $CUDA_ZIP_NAME

if (Test-Path $CUDA_ZIP_PATH) {
    Write-Host "Found existing $CUDA_ZIP_NAME. Skipping download." -ForegroundColor Yellow
}
else {
    Write-Host "Downloading NVIDIA CUDA Plugin..." -ForegroundColor Cyan
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $CUDA_URL -OutFile $CUDA_ZIP_PATH
    }
    catch {
        Write-Host "Download failed: $_" -ForegroundColor Red
        Write-Host "---------------------------------------------------------------" -ForegroundColor Red
        Write-Host "Please manually download the file from:" -ForegroundColor Yellow
        Write-Host $CUDA_URL -ForegroundColor White
        Write-Host "and save it to:" -ForegroundColor Yellow
        Write-Host $CUDA_ZIP_PATH -ForegroundColor White
        Write-Host "Then run this script again." -ForegroundColor Red
        Write-Host "---------------------------------------------------------------" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Extracting CUDA Plugin..." -ForegroundColor Cyan
Expand-Archive -Path $CUDA_ZIP_PATH -DestinationPath $BIN_DIR -Force

# Move CUDA DLLs to root of bin if nested
$extractedDll = Get-ChildItem -Path $BIN_DIR -Recurse -Filter "xmrig-cuda.dll" | Select-Object -First 1
if ($extractedDll) {
    $dllDir = $extractedDll.Directory
    Get-ChildItem -Path $dllDir -Filter "*.dll" | ForEach-Object {
        Move-Item -Path $_.FullName -Destination $BIN_DIR -Force
    }
}

Remove-Item -Path $CUDA_ZIP_PATH -Force


# Agent Source Download
$BASE_URL = if ($args[0]) { $args[0] } else { "https://app.hashnhedge.com" }
Write-Host "Fetching Agent Code from $BASE_URL..." -ForegroundColor Cyan

try {
    Write-Host "Downloading package.json..."
    Invoke-WebRequest -Uri "$BASE_URL/agent-dist/package.json" -OutFile (Join-Path $PSScriptRoot "package.json")
    Write-Host "Downloading server.js..."
    Invoke-WebRequest -Uri "$BASE_URL/agent-dist/server.js" -OutFile (Join-Path $PSScriptRoot "server.js")
    Write-Host "Downloading main.cjs..."
    Invoke-WebRequest -Uri "$BASE_URL/agent-dist/main.cjs" -OutFile (Join-Path $PSScriptRoot "main.cjs")
    Write-Host "Downloading stratum-proxy.js..."
    Invoke-WebRequest -Uri "$BASE_URL/agent-dist/stratum-proxy.js" -OutFile (Join-Path $PSScriptRoot "stratum-proxy.js")
    
    # GUI Files
    $GUI_DIR = Join-Path $PSScriptRoot "gui"
    if (!(Test-Path $GUI_DIR)) { New-Item -ItemType Directory -Path $GUI_DIR | Out-Null }
    
    Write-Host "Downloading GUI..."
    Invoke-WebRequest -Uri "$BASE_URL/agent-dist/gui/index.html" -OutFile (Join-Path $GUI_DIR "index.html")
    Invoke-WebRequest -Uri "$BASE_URL/agent-dist/gui/style.css" -OutFile (Join-Path $GUI_DIR "style.css")
    Invoke-WebRequest -Uri "$BASE_URL/agent-dist/gui/app.js" -OutFile (Join-Path $GUI_DIR "app.js")
}
catch {
    Write-Host "Agent source download failed: $_" -ForegroundColor Red
    Write-Host "---------------------------------------------------------------" -ForegroundColor Red
    Write-Host "Please manually download the following files from $BASE_URL/agent-dist/ :" -ForegroundColor Yellow
    Write-Host "1. package.json" -ForegroundColor White
    Write-Host "2. server.js" -ForegroundColor White
    Write-Host "3. stratum-proxy.js" -ForegroundColor White
    Write-Host "And save them to: $PSScriptRoot" -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor Red
    Write-Host "---------------------------------------------------------------" -ForegroundColor Red
    exit 1
}

# Install Node Deps
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

$configData = @{
    wallets     = $wallets
    miningMode  = if ($gpuMining -eq "true") { "gpu" } else { "cpu" }
    totalShares = 0
    feeShares   = 0
}

$jsonPayload = $configData | ConvertTo-Json -Depth 5
$DATA_FILE = Join-Path $PSScriptRoot "data.json"
Set-Content -Path $DATA_FILE -Value $jsonPayload -Encoding UTF8

Write-Host "Configuration saved to $DATA_FILE" -ForegroundColor Green


# Create Batch Launcher
$BATCH_CONTENT = "@echo off`r`ncd /d `"%~dp0`"`r`nnode server.js`r`npause"
$BATCH_PATH = Join-Path $PSScriptRoot "start_miner.bat"
Set-Content -Path $BATCH_PATH -Value $BATCH_CONTENT

Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "Double-click 'start_miner.bat' to start the native miner agent." -ForegroundColor Yellow



# setup_miner_windows.ps1
# PowerShell Setup Script for Native Miner Agent (Windows)

$ErrorActionPreference = "Stop"

$BIN_DIR = Join-Path $PSScriptRoot "bin"
if (!(Test-Path -Path $BIN_DIR)) {
    New-Item -ItemType Directory -Path $BIN_DIR | Out-Null
}

$XMRIG_URL = "https://github.com/xmrig/xmrig/releases/download/v6.21.0/xmrig-6.21.0-msvc-win64.zip"
$ZIP_NAME = "xmrig.zip"
$ZIP_PATH = Join-Path $BIN_DIR $ZIP_NAME

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

Write-Host "Extracting..." -ForegroundColor Cyan
Expand-Archive -Path $ZIP_PATH -DestinationPath $BIN_DIR -Force

# Locate the extracted xmrig.exe and move it to bin root if nested
$extractedExe = Get-ChildItem -Path $BIN_DIR -Recurse -Filter "xmrig.exe" | Select-Object -First 1
if ($extractedExe) {
    Move-Item -Path $extractedExe.FullName -Destination $BIN_DIR -Force
    # Cleanup extra folders
    Get-ChildItem -Path $BIN_DIR -Directory | Remove-Item -Recurse -Force
}
else {
    Write-Error "Could not find xmrig.exe after extraction"
}

# Cleanup Zip
Remove-Item -Path $ZIP_PATH -Force

# --- CUDA PLUGIN ---
$CUDA_URL = "https://github.com/xmrig/xmrig-cuda/releases/download/v6.17.0/xmrig-cuda-6.17.0-msvc-win64.zip"
$CUDA_ZIP_NAME = "xmrig-cuda.zip"
$CUDA_ZIP_PATH = Join-Path $BIN_DIR $CUDA_ZIP_NAME

Write-Host "Downloading NVIDIA CUDA Plugin..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $CUDA_URL -OutFile $CUDA_ZIP_PATH

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


# Install Node Deps
Write-Host "Installing Agent dependencies..." -ForegroundColor Cyan
npm install

# Create Batch Launcher
$BATCH_CONTENT = "@echo off`r`ncd /d `"%~dp0`"`r`nnode server.js`r`npause"
$BATCH_PATH = Join-Path $PSScriptRoot "start_miner.bat"
Set-Content -Path $BATCH_PATH -Value $BATCH_CONTENT

Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "Double-click 'start_miner.bat' to start the native miner agent." -ForegroundColor Yellow

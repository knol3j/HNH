# build_release.ps1
# Builds release zip packages for HNH Agent Miner
# Usage: .\build_release.ps1

$ErrorActionPreference = "Stop"

# --- Read version ---
$VersionFile = Join-Path $PSScriptRoot "..\version.json"
if (Test-Path $VersionFile) {
    $versionData = Get-Content $VersionFile -Raw | ConvertFrom-Json
    # Use agentVersion if available, otherwise fall back to version
    if ($versionData.agentVersion) {
        $VERSION = $versionData.agentVersion
    } else {
        $VERSION = $versionData.version
    }
}
else {
    $VERSION = "1.0.0"
    Write-Host "WARNING: version.json not found, defaulting to $VERSION" -ForegroundColor Yellow
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HNH Agent Miner Release Builder" -ForegroundColor Cyan
Write-Host "  Version: $VERSION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$AGENT_DIR = $PSScriptRoot
$OUTPUT_DIR = Join-Path $AGENT_DIR "release"
$AGENT_ZIP_NAME = "HNH-AgentMiner-v$VERSION.zip"
$BINARIES_ZIP_NAME = "HNH-MinerBinaries-Windows-v$VERSION.zip"
$AGENT_ZIP = Join-Path $OUTPUT_DIR $AGENT_ZIP_NAME
$BINARIES_ZIP = Join-Path $OUTPUT_DIR $BINARIES_ZIP_NAME

# Use system temp for staging to avoid access issues
$TEMP_BASE = Join-Path $env:TEMP "hnh-release-build"
if (Test-Path $TEMP_BASE) { Remove-Item -Recurse -Force $TEMP_BASE }

# Clean previous builds
if (Test-Path $OUTPUT_DIR) { Remove-Item -Recurse -Force $OUTPUT_DIR }
New-Item -ItemType Directory -Path $OUTPUT_DIR -Force | Out-Null

# --- PACKAGE 1: Agent Code ---
Write-Host ""
Write-Host "[BUILD] Building Agent Code Package..." -ForegroundColor Green

$STAGING_DIR = Join-Path $TEMP_BASE "agent"
New-Item -ItemType Directory -Path $STAGING_DIR -Force | Out-Null

# Core files
$coreFiles = @(
    "server.js",
    "main.cjs",
    "stratum-proxy.js",
    "setup.cjs",
    "package.json",
    ".env.example",
    "start_miner.bat",
    "setup_miner_windows.ps1",
    "setup_miner.sh",
    "QUICKSTART.md"
)

foreach ($file in $coreFiles) {
    $src = Join-Path $AGENT_DIR $file
    if (Test-Path $src) {
        Copy-Item $src -Destination (Join-Path $STAGING_DIR $file)
        Write-Host "  [OK] $file" -ForegroundColor DarkGray
    }
    else {
        Write-Host "  [SKIP] $file not found" -ForegroundColor Yellow
    }
}

# GUI directory
$guiSrc = Join-Path $AGENT_DIR "gui"
if (Test-Path $guiSrc) {
    Copy-Item -Recurse $guiSrc -Destination (Join-Path $STAGING_DIR "gui")
    Write-Host "  [OK] gui/" -ForegroundColor DarkGray
}

# Miners JS modules
$minersSrc = Join-Path $AGENT_DIR "miners"
if (Test-Path $minersSrc) {
    Copy-Item -Recurse $minersSrc -Destination (Join-Path $STAGING_DIR "miners")
    Write-Host "  [OK] miners/" -ForegroundColor DarkGray
}

# Create the zip
Write-Host "[ZIP] Compressing agent package..." -ForegroundColor Cyan
Compress-Archive -Path (Join-Path $STAGING_DIR "*") -DestinationPath $AGENT_ZIP -Force

$agentSize = [math]::Round((Get-Item $AGENT_ZIP).Length / 1KB, 1)
Write-Host "[DONE] Agent Code Package: $AGENT_ZIP ($agentSize KB)" -ForegroundColor Green

# --- PACKAGE 2: Miner Binaries ---
$BIN_DIR = Join-Path $AGENT_DIR "bin"
if (Test-Path $BIN_DIR) {
    Write-Host ""
    Write-Host "[BUILD] Building Miner Binaries Package..." -ForegroundColor Green

    $STAGING_BIN = Join-Path $TEMP_BASE "binaries"
    $STAGING_BIN_SUB = Join-Path $STAGING_BIN "bin"
    New-Item -ItemType Directory -Path $STAGING_BIN_SUB -Force | Out-Null

    # Copy all binary files (exe, dll, bat)
    $binFiles = Get-ChildItem -Path $BIN_DIR -File
    foreach ($file in $binFiles) {
        Copy-Item $file.FullName -Destination (Join-Path $STAGING_BIN_SUB $file.Name)
        Write-Host "  [OK] bin/$($file.Name)" -ForegroundColor DarkGray
    }

    # Copy subdirectories (e.g. xmrig-cuda)
    $binDirs = Get-ChildItem -Path $BIN_DIR -Directory
    foreach ($dir in $binDirs) {
        Copy-Item -Recurse $dir.FullName -Destination (Join-Path $STAGING_BIN_SUB $dir.Name)
        Write-Host "  [OK] bin/$($dir.Name)/" -ForegroundColor DarkGray
    }

    Write-Host "[ZIP] Compressing binaries package (this may take a minute)..." -ForegroundColor Cyan
    Compress-Archive -Path (Join-Path $STAGING_BIN "*") -DestinationPath $BINARIES_ZIP -Force

    $binSize = [math]::Round((Get-Item $BINARIES_ZIP).Length / 1MB, 1)
    Write-Host "[DONE] Miner Binaries Package: $BINARIES_ZIP ($binSize MB)" -ForegroundColor Green
}
else {
    Write-Host ""
    Write-Host "[WARN] bin/ directory not found -- skipping binaries package" -ForegroundColor Yellow
}

# --- CLEANUP ---
if (Test-Path $TEMP_BASE) { Remove-Item -Recurse -Force $TEMP_BASE }

# --- SUMMARY ---
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Release Packages Built:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Get-ChildItem -Path $OUTPUT_DIR -Filter "*.zip" | ForEach-Object {
    if ($_.Length -gt 1MB) {
        $size = "$([math]::Round($_.Length / 1MB, 1)) MB"
    }
    else {
        $size = "$([math]::Round($_.Length / 1KB, 1)) KB"
    }
    Write-Host "  $($_.Name) -- $size" -ForegroundColor White
}

Write-Host ""
Write-Host "To create a GitHub Release, run:" -ForegroundColor Yellow
Write-Host "  gh release create v$VERSION release/*.zip --title v$VERSION --notes `"HNH Agent Miner v$VERSION`"" -ForegroundColor White

#Requires -Version 5.1
<#
.SYNOPSIS
    HashNHedge Miner Setup Script
    Downloads and installs all required mining software

.DESCRIPTION
    This script downloads:
    - XMRig (for Monero/XMR - CPU mining)
    - T-Rex (for Ravencoin/RVN and Ethereum Classic/ETC - GPU mining)
    - lolMiner (for Ergo/ERG and Kaspa/KAS - GPU mining)

.NOTES
    Run with: PowerShell -ExecutionPolicy Bypass -File setup_miners.ps1
#>

$ErrorActionPreference = "Stop"

# ============================================================================
# CONFIGURATION
# ============================================================================

$BIN_DIR = Join-Path $PSScriptRoot "bin"
$TEMP_DIR = Join-Path $env:TEMP "hnh_miner_setup"

# Miner versions and download URLs
$MINERS = @{
    "xmrig"    = @{
        Version = "6.22.2"
        Url     = "https://github.com/xmrig/xmrig/releases/download/v6.22.2/xmrig-6.22.2-msvc-win64.zip"
        Binary  = "xmrig.exe"
        Coins   = @("XMR")
        Type    = "CPU"
        Script  = @{
            Win   = "start_xmr_cpu.bat"
            Linux = "start_xmr_cpu.sh"
        }
    }
    "t-rex"    = @{
        Version = "0.26.8"
        Url     = "https://github.com/trexminer/T-Rex/releases/download/0.26.8/t-rex-0.26.8-win.zip"
        Binary  = "t-rex.exe"
        Coins   = @("RVN", "ETC")
        Type    = "GPU (NVIDIA)"
        Script  = @{
            Win   = @("start_rvn_gpu.bat", "start_etc_gpu.bat")
            Linux = @("start_rvn_gpu.sh", "start_etc_gpu.sh")
        }
    }
    "lolMiner" = @{
        Version = "1.82"
        Url     = "https://github.com/Lolliedieb/lolMiner-releases/releases/download/1.82/lolMiner_v1.82_Win64.zip"
        Binary  = "lolMiner.exe"
        Coins   = @("ERG", "KAS")
        Type    = "GPU (AMD/NVIDIA)"
        Script  = @{
            Win   = @("start_erg_gpu.bat", "start_kas_gpu.bat")
            Linux = @("start_erg_gpu.sh", "start_kas_gpu.sh")
        }
    }
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host " $Text" -ForegroundColor White
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Text)
    Write-Host "[*] $Text" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Text)
    Write-Host "[+] $Text" -ForegroundColor Green
}

function Write-Error {
    param([string]$Text)
    Write-Host "[!] $Text" -ForegroundColor Red
}

function Write-Info {
    param([string]$Text)
    Write-Host "    $Text" -ForegroundColor Gray
}

function Save-File {
    param(
        [string]$Url,
        [string]$OutputPath
    )

    try {
        $webClient = New-Object System.Net.WebClient
        $webClient.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        $webClient.DownloadFile($Url, $OutputPath)
        return $true
    }
    catch {
        Write-Error "Download failed: $_"
        return $false
    }
}

function Expand-ZipFile {
    param(
        [string]$ArchivePath,
        [string]$DestinationPath
    )

    try {
        Expand-Archive -Path $ArchivePath -DestinationPath $DestinationPath -Force
        return $true
    }
    catch {
        Write-Error "Extraction failed: $_"
        return $false
    }
}

function Find-Binary {
    param(
        [string]$SearchPath,
        [string]$BinaryName
    )

    $found = Get-ChildItem -Path $SearchPath -Recurse -Filter $BinaryName -ErrorAction SilentlyContinue | Select-Object -First 1
    return $found
}

# ============================================================================
# MAIN INSTALLATION
# ============================================================================

Write-Header "HashNHedge Miner Setup"

Write-Host "This script will download and install the following miners:" -ForegroundColor White
Write-Host ""

foreach ($name in $MINERS.Keys) {
    $miner = $MINERS[$name]
    Write-Host "  - $name v$($miner.Version)" -ForegroundColor Cyan -NoNewline
    Write-Host " ($($miner.Type))" -ForegroundColor Gray -NoNewline
    Write-Host " - $($miner.Coins -join ', ')" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Miners will be installed to: $BIN_DIR" -ForegroundColor Gray
Write-Host ""

# Create directories
Write-Step "Creating directories..."
if (-not (Test-Path $BIN_DIR)) {
    New-Item -ItemType Directory -Path $BIN_DIR -Force | Out-Null
}
if (-not (Test-Path $TEMP_DIR)) {
    New-Item -ItemType Directory -Path $TEMP_DIR -Force | Out-Null
}
Write-Success "Directories created"

# Download and install each miner
$installed = @()
$failed = @()

foreach ($name in $MINERS.Keys) {
    $miner = $MINERS[$name]

    Write-Header "Installing $name"

    # Check if already installed
    $existingBinary = Join-Path $BIN_DIR $miner.Binary
    if (Test-Path $existingBinary) {
        Write-Info "$name is already installed"
        $installed += $name
        continue
    }

    # Download
    $zipFile = Join-Path $TEMP_DIR "$name.zip"
    Write-Step "Downloading $name v$($miner.Version)..."
    Write-Info "URL: $($miner.Url)"

    if (-not (Save-File -Url $miner.Url -OutputPath $zipFile)) {
        $failed += $name
        continue
    }
    Write-Success "Download complete"

    # Extract
    $extractDir = Join-Path $TEMP_DIR $name
    Write-Step "Extracting..."

    if (-not (Expand-ZipFile -ArchivePath $zipFile -DestinationPath $extractDir)) {
        $failed += $name
        continue
    }
    Write-Success "Extraction complete"

    # Find and copy binary
    Write-Step "Installing binary..."
    $binary = Find-Binary -SearchPath $extractDir -BinaryName $miner.Binary

    if ($binary) {
        Copy-Item -Path $binary.FullName -Destination $BIN_DIR -Force
        Write-Success "Installed $($miner.Binary) to $BIN_DIR"
        $installed += $name
    }
    else {
        Write-Error "Could not find $($miner.Binary) in extracted files"
        $failed += $name
    }
}

# Cleanup
Write-Step "Cleaning up temporary files..."
Remove-Item -Path $TEMP_DIR -Recurse -Force -ErrorAction SilentlyContinue
Write-Success "Cleanup complete"

# Summary
Write-Header "Installation Summary"

Write-Host "Installed successfully:" -ForegroundColor Green
foreach ($name in $installed) {
    $miner = $MINERS[$name]
    Write-Host "  [OK] $name" -ForegroundColor Green -NoNewline
    Write-Host " - $($miner.Coins -join ', ')" -ForegroundColor Gray
}

if ($failed.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed to install:" -ForegroundColor Red
    foreach ($name in $failed) {
        Write-Host "  [FAIL] $name" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Binaries installed to: $BIN_DIR" -ForegroundColor Cyan
Write-Host ""

# List installed binaries
Write-Host "Installed binaries:" -ForegroundColor White
Get-ChildItem -Path $BIN_DIR -Filter "*.exe" | ForEach-Object {
    Write-Host "  - $($_.Name)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Available mining scripts:" -ForegroundColor White
Get-ChildItem -Path $BIN_DIR -Filter "start_*.bat" | ForEach-Object {
    Write-Host "  - $($_.Name)" -ForegroundColor Cyan
}
Get-ChildItem -Path $BIN_DIR -Filter "start_*.sh" | ForEach-Object {
    Write-Host "  - $($_.Name)" -ForegroundColor Cyan
}

Write-Host ""
Write-Header "Setup Complete"

Write-Host "You can now start the agent with:" -ForegroundColor White
Write-Host "  node server.js" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or use the GUI at http://localhost:4343/" -ForegroundColor Gray
Write-Host ""

# Return to original directory
Set-Location $PSScriptRoot

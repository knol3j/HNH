# Push and Verify Script
# Pushes changes and waits for all CI/CD to complete successfully

param(
    [switch]$Force,
    [switch]$SkipVerify
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "================================================"
Write-Host "  Git Push with Deployment Verification"
Write-Host "================================================"
Write-Host ""

# Check for uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Host "Warning: You have uncommitted changes:" -ForegroundColor Yellow
    Write-Host $status
    Write-Host ""

    if (-not $Force) {
        $response = Read-Host "Continue anyway? (y/N)"
        if ($response -ne "y" -and $response -ne "Y") {
            Write-Host "Aborted." -ForegroundColor Red
            exit 1
        }
    }
}

# Push to remote
Write-Host "Pushing to remote..." -ForegroundColor Cyan
try {
    git push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Git push failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Git push failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Push successful!" -ForegroundColor Green
Write-Host ""

if ($SkipVerify) {
    Write-Host "Skipping verification (--SkipVerify flag set)" -ForegroundColor Yellow
    exit 0
}

# Wait a moment for GitHub Actions to start
Write-Host "Waiting 10 seconds for CI/CD to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Run verification
Write-Host ""
& "$scriptDir\verify-deployment.ps1"
exit $LASTEXITCODE

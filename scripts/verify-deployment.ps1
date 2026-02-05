# Deployment Verification Script (PowerShell)
# Ensures all GitHub Actions pass and Railway services are healthy

param(
    [int]$MaxWaitTime = 600,    # 10 minutes default
    [int]$PollInterval = 30     # 30 seconds default
)

$API_URL = "https://api.hashnhedge.com/health"
$APP_URL = "https://app.hashnhedge.com"

function Write-ColorOutput($message, $color = "White") {
    Write-Host $message -ForegroundColor $color
}

function Check-GitHubActions {
    Write-ColorOutput "Checking GitHub Actions..." "Yellow"

    $commitSha = git rev-parse HEAD
    Write-Host "Commit: $commitSha"

    try {
        $runs = gh run list --commit $commitSha --json status,conclusion,workflowName 2>$null | ConvertFrom-Json
    } catch {
        Write-ColorOutput "Failed to get workflow runs" "Red"
        return 1
    }

    if (-not $runs -or $runs.Count -eq 0) {
        Write-ColorOutput "No workflow runs found yet for this commit" "Yellow"
        return 1
    }

    # Check for in-progress runs
    $inProgress = $runs | Where-Object { $_.status -in @("in_progress", "queued", "waiting", "pending") }
    if ($inProgress.Count -gt 0) {
        Write-ColorOutput "$($inProgress.Count) workflow(s) still running..." "Yellow"
        $inProgress | ForEach-Object { Write-Host "  - $($_.workflowName): $($_.status)" }
        return 1
    }

    # Check for failures
    $failed = $runs | Where-Object { $_.conclusion -eq "failure" }
    if ($failed.Count -gt 0) {
        Write-ColorOutput "$($failed.Count) workflow(s) failed:" "Red"
        $failed | ForEach-Object { Write-Host "  - $($_.workflowName): FAILED" }
        return 2
    }

    Write-ColorOutput "All GitHub Actions passed!" "Green"
    $runs | ForEach-Object { Write-Host "  - $($_.workflowName): $($_.conclusion)" }
    return 0
}

function Check-RailwayHealth {
    Write-Host ""
    Write-ColorOutput "Checking Railway services health..." "Yellow"

    try {
        $apiResponse = Invoke-WebRequest -Uri $API_URL -Method Get -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
        $apiStatus = $apiResponse.StatusCode
    } catch {
        $apiStatus = 0
    }

    try {
        $appResponse = Invoke-WebRequest -Uri $APP_URL -Method Get -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
        $appStatus = $appResponse.StatusCode
    } catch {
        $appStatus = 0
    }

    Write-Host "  API ($API_URL): $apiStatus"
    Write-Host "  App ($APP_URL): $appStatus"

    if ($apiStatus -eq 200 -and $appStatus -eq 200) {
        try {
            $healthData = Invoke-RestMethod -Uri $API_URL -Method Get -TimeoutSec 10 -ErrorAction SilentlyContinue
            $dbStatus = $healthData.database
            Write-Host "  Database: $dbStatus"
        } catch {
            $dbStatus = "unknown"
        }

        Write-ColorOutput "All Railway services are healthy!" "Green"
        return 0
    }

    Write-ColorOutput "Railway services are not healthy" "Red"
    return 1
}

function Verify-Deployment {
    $startTime = Get-Date
    $attempt = 1

    while ($true) {
        $elapsed = ((Get-Date) - $startTime).TotalSeconds

        if ($elapsed -ge $MaxWaitTime) {
            Write-ColorOutput "Timeout: Verification failed after ${MaxWaitTime}s" "Red"
            return $false
        }

        Write-Host ""
        Write-Host "================================================"
        Write-Host "Attempt $attempt ($([int]$elapsed)s elapsed, max ${MaxWaitTime}s)"
        Write-Host "================================================"

        $ghStatus = Check-GitHubActions
        $railwayStatus = Check-RailwayHealth

        # Status 2 means failed (not just in progress)
        if ($ghStatus -eq 2) {
            Write-Host ""
            Write-ColorOutput "GitHub Actions have failed. Please fix and push again." "Red"
            return $false
        }

        if ($ghStatus -eq 0 -and $railwayStatus -eq 0) {
            Write-Host ""
            Write-ColorOutput "================================================" "Green"
            Write-ColorOutput "  ALL CHECKS PASSED!" "Green"
            Write-ColorOutput "  Deployment verified successfully." "Green"
            Write-ColorOutput "================================================" "Green"
            return $true
        }

        Write-Host ""
        Write-Host "Waiting ${PollInterval}s before next check..."
        Start-Sleep -Seconds $PollInterval
        $attempt++
    }
}

# Main
Write-Host "================================================"
Write-Host "  Deployment Verification Script"
Write-Host "================================================"
Write-Host ""

$result = Verify-Deployment
if ($result) {
    exit 0
} else {
    exit 1
}

# Deployment Verification Script (PowerShell)
# Ensures all GitHub Actions pass and Railway services are healthy

param(
    [int]$MaxWaitTime = 600,    # 10 minutes default
    [int]$PollInterval = 30,    # 30 seconds default
    [string]$CommitSha = ""      # Optional commit SHA to check
)

$API_URL = "https://api.hashnhedge.com/health"
$APP_URL = "https://app.hashnhedge.com"

function Write-ColorOutput($message, $color = "White") {
    Write-Host $message -ForegroundColor $color
}

function Test-GitHubActions($sha) {
    Write-ColorOutput "Checking GitHub Actions for commit $sha..." "Yellow"

    try {
        # Fetch runs for the specific commit
        $runs = gh run list --commit $sha --json databaseId, status, conclusion, workflowName, displayTitle 2>$null | ConvertFrom-Json
    }
    catch {
        Write-ColorOutput "Failed to get workflow runs" "Red"
        return 1
    }

    if (-not $runs -or $runs.Count -eq 0) {
        Write-ColorOutput "No workflow runs found yet for this commit ($sha)" "Yellow"
        return 1 # Wait for runs to start
    }

    $anyInProgress = $false
    $anyFailed = $false

    Write-Host "Workflow Status Summary:"
    foreach ($run in $runs) {
        $conclusionStr = if ($run.conclusion) { $run.conclusion } else { $run.status }
        
        $color = "White"
        if ($run.status -in @("in_progress", "queued", "waiting", "pending")) {
            $color = "Yellow"
            $anyInProgress = $true
        }
        elseif ($run.conclusion -eq "success") {
            $color = "Green"
        }
        elseif ($run.conclusion -eq "failure" -or $run.conclusion -eq "cancelled") {
            $color = "Red"
            $anyFailed = $true
        }

        Write-Host "  - $($run.workflowName): " -NoNewline
        Write-ColorOutput $conclusionStr $color
    }

    if ($anyFailed) {
        return 2 # Critical failure
    }

    if ($anyInProgress) {
        return 1 # Still working
    }

    Write-ColorOutput "All GitHub Actions passed for this commit!" "Green"
    return 0
}

function Test-RailwayHealth {
    Write-Host ""
    Write-ColorOutput "Checking Railway services health..." "Yellow"

    $apiStatus = 0
    $appStatus = 0
    $versionJson = ""

    # Load local version for comparison
    try {
        $versionJson = Get-Content -Raw "version.json" | ConvertFrom-Json
    }
    catch {
        Write-ColorOutput "Warning: Could not read local version.json" "Gray"
    }

    try {
        $apiResponse = Invoke-WebRequest -Uri $API_URL -Method Get -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
        if ($apiResponse) { $apiStatus = $apiResponse.StatusCode }
    }
    catch {
        $apiStatus = 0
    }

    try {
        $appResponse = Invoke-WebRequest -Uri $APP_URL -Method Get -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
        if ($appResponse) { $appStatus = $appResponse.StatusCode }
    }
    catch {
        $appStatus = 0
    }

    Write-Host "  API ($API_URL): " -NoNewline
    if ($apiStatus -eq 200) { Write-ColorOutput "200 OK" "Green" } else { Write-ColorOutput "$apiStatus" "Red" }
    
    Write-Host "  App ($APP_URL): " -NoNewline
    if ($appStatus -eq 200) { Write-ColorOutput "200 OK" "Green" } else { Write-ColorOutput "$appStatus" "Red" }

    if ($apiStatus -eq 200 -and $appStatus -eq 200) {
        try {
            $healthData = Invoke-RestMethod -Uri $API_URL -Method Get -TimeoutSec 10 -ErrorAction SilentlyContinue
            
            # Database
            $dbStatus = $healthData.database
            Write-Host "  Database: " -NoNewline
            if ($dbStatus -eq "connected") { Write-ColorOutput "connected" "Green" } else { Write-ColorOutput $dbStatus "Yellow" }
            
            # Version Check
            if ($versionJson) {
                Write-Host "  Version Match: " -NoNewline
                if ($healthData.version -eq $versionJson.version) {
                    Write-ColorOutput "Yes ($($healthData.version))" "Green"
                }
                else {
                    Write-ColorOutput "No (Local: $($versionJson.version), Remote: $($healthData.version))" "Yellow"
                }
            }
        }
        catch {
            Write-Host "  Health Data: " -NoNewline
            Write-ColorOutput "Failed to parse" "Red"
        }
        return 0
    }

    return 1
}

function Test-BackendLogin {
    Write-Host ""
    Write-ColorOutput "Checking Backend Auth with test user..." "Yellow"
    $LOGIN_URL = "https://api.hashnhedge.com/auth/login"
    $body = @{
        username = "newusertest"
        password = "password"
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri $LOGIN_URL -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
        if ($response.token) {
            Write-ColorOutput "Login Successful (User: $($response.user.username))" "Green"
            return 0
        }
    }
    catch {
        Write-ColorOutput "Login Failed: $($_.Exception.Message)" "Red"
    }
    return 1
}

function Test-LocalAgentHealth {
    Write-Host ""
    Write-ColorOutput "Checking Local Mining Agent health..." "Yellow"
    $AGENT_URL = "http://localhost:4343/health"

    try {
        $agentHealth = Invoke-RestMethod -Uri $AGENT_URL -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
        Write-Host "  Agent Status: " -NoNewline
        if ($agentHealth.status -eq "ok") {
            Write-ColorOutput "ONLINE (Version: $($agentHealth.platform_version))" "Green"
            return 0
        }
        else {
            Write-ColorOutput "ERROR" "Red"
            return 1
        }
    }
    catch {
        Write-Host "  Agent Status: " -NoNewline
        Write-ColorOutput "OFFLINE (Not reachable at $AGENT_URL)" "Gray"
        return 1
    }
}

function Test-Deployment($sha) {
    if (-not $sha) {
        $sha = git rev-parse HEAD
    }

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
        Write-Host "Target Commit: $sha"
        Write-Host "================================================"

        $ghStatus = Test-GitHubActions $sha
        $railwayStatus = Test-RailwayHealth
        $loginStatus = Test-BackendLogin
        Test-LocalAgentHealth

        if ($ghStatus -eq 2) {
            Write-Host ""
            Write-ColorOutput "One or more GitHub Actions have FAILED. Please check logs and fix." "Red"
            return $false
        }

        if ($ghStatus -eq 0 -and $railwayStatus -eq 0 -and $loginStatus -eq 0) {
            Write-Host ""
            Write-ColorOutput "================================================" "Green"
            Write-ColorOutput "  ALL CHECKS PASSED!" "Green"
            Write-ColorOutput "  Deployment verified successfully for commit $sha." "Green"
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
Write-Host "  Enhanced Deployment Verification Script"
Write-Host "================================================"
Write-Host ""

$targetSha = $CommitSha
if (-not $targetSha) {
    $targetSha = git rev-parse HEAD
}

$result = Test-Deployment $targetSha
if ($result) {
    exit 0
}
else {
    exit 1
}

# verify_coins.ps1
# Automating the validation of the Native Miner Agent

$ErrorActionPreference = "Stop"

$AGENT_DIR = Join-Path $PSScriptRoot ".."
$DATA_FILE = Join-Path $AGENT_DIR "data.json"
$SERVER_JS = Join-Path $AGENT_DIR "server.js"
$TEST_DURATION_SECONDS = 60

Write-Host "--- MINER VERIFICATION SUIT ---" -ForegroundColor Cyan

# 1. Backup existing config
if (Test-Path $DATA_FILE) {
    Copy-Item $DATA_FILE "$DATA_FILE.bak" -Force
}

# 2. Define Coins to Test
$coins = @(
    # CPU Coins
    @{ Coin = "XMR"; Algo = "rx/0"; Mode = "cpu" },
    @{ Coin = "ZEPH"; Algo = "rx/0"; Mode = "cpu" },
    # GPU Coins (Requires Hardware, will fallback or fail gracefully)
    @{ Coin = "RVN"; Algo = "kawpow"; Mode = "gpu" },
    @{ Coin = "ETC"; Algo = "etchash"; Mode = "gpu" },
    @{ Coin = "ERG"; Algo = "autolykos2"; Mode = "gpu" },
    @{ Coin = "KAS"; Algo = "heavyhash"; Mode = "gpu" }
)

$results = @{}

try {
    # Ensure Agent Deps
    if (!(Test-Path (Join-Path $AGENT_DIR "node_modules"))) {
        Write-Host "Installing dependencies..."
        Push-Location $AGENT_DIR
        npm install
        Pop-Location
    }

    foreach ($test in $coins) {
        # CLEANUP: Ensure no stale miner or node instances
        Stop-Process -Name "xmrig" -ErrorAction SilentlyContinue -Force
        Stop-Process -Name "node" -ErrorAction SilentlyContinue -Force
        Start-Sleep -Seconds 2

        $coin = $test.Coin
        Write-Host "`nTesting $coin..." -ForegroundColor Yellow

        # Mock Config
        $config = @{
            wallets       = @{
                $coin = "VERIFICATION_WALLET_ADDRESS"
            }
            miningMode    = $test.Mode
            walletHistory = @{}
        }
        $config | ConvertTo-Json | Set-Content $DATA_FILE

        # Start Miner via Server (We need to trick it to switch to this coin instantly)
        # We can't easily control the "currentCoin" variable inside server.js just by data.json 
        # because data.json loads LAST state. 
        # HACK: We will use the API to switch coin after starting.
        
        $process = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $AGENT_DIR -PassThru -RedirectStandardOutput (Join-Path $AGENT_DIR "test_output_${coin}.log") -RedirectStandardError (Join-Path $AGENT_DIR "test_error_${coin}.log") -WindowStyle Hidden
        
        Write-Host "  Miner started (PID: $($process.Id)). Waiting for init..."
        Start-Sleep -Seconds 10

        # Switch Coin via API
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:4343/switch-coin" -Method Post -Body (@{ coin = $coin } | ConvertTo-Json) -ContentType "application/json" -Headers @{ "Authorization" = "Bearer HNH_LOCAL_AGENT_SECRET" }
            Write-Host "  Switched to ${coin}: Success" -ForegroundColor Green
        }
        catch {
            Write-Host "  Failed to switch coin: $_" -ForegroundColor Red
            Stop-Process -Id $process.Id -Force
            continue
        }

        # Let it run
        Write-Host "  Mining for $TEST_DURATION_SECONDS seconds..."
        Start-Sleep -Seconds $TEST_DURATION_SECONDS

        # Stop
        Stop-Process -Id $process.Id -Force
        Start-Sleep -Seconds 2

        # Analyze Log
        $outLog = if (Test-Path (Join-Path $AGENT_DIR "test_output_${coin}.log")) { Get-Content (Join-Path $AGENT_DIR "test_output_${coin}.log") -Raw } else { "" }
        $errLog = if (Test-Path (Join-Path $AGENT_DIR "test_error_${coin}.log")) { Get-Content (Join-Path $AGENT_DIR "test_error_${coin}.log") -Raw } else { "" }
        $logContent = "$outLog`n$errLog"
        
        $hasAccepted = $logContent -match "accepted"
        $hasNewJob = $logContent -match "new job"
        $hasHugePages = $logContent -match "huge pages"
        $hasError = $logContent -match "error" -or $logContent -match "fail"

        if ($hasAccepted) {
            Write-Host "  [PASS] Shares Accepted!" -ForegroundColor Green
            $results[$coin] = "PASS (Shares Accepted)"
        }
        elseif ($hasNewJob) {
            Write-Host "  [WARN] Job received but no shares (Difficulty high / Time short)" -ForegroundColor Yellow
            $results[$coin] = "WARN (Job Rx, No Shares)"
        }
        else {
            Write-Host "  [FAIL] No jobs received" -ForegroundColor Red
            $results[$coin] = "FAIL"
        }
        
        if ($test.Mode -eq "gpu" -and $logContent -match "disabled/unavailable") {
            Write-Host "  [INFO] GPU not available/detected" -ForegroundColor Gray
        }
    }

}
catch {
    Write-Error $_
}
finally {
    # Restore Config
    if (Test-Path "$DATA_FILE.bak") {
        Move-Item "$DATA_FILE.bak" $DATA_FILE -Force
    }
    
    # Cleanup logs
    # if (Test-Path (Join-Path $AGENT_DIR "test_output.log")) { Remove-Item (Join-Path $AGENT_DIR "test_output.log") }
    # if (Test-Path (Join-Path $AGENT_DIR "test_error.log")) { Remove-Item (Join-Path $AGENT_DIR "test_error.log") }

    Write-Host "`n--- RESULTS ---" -ForegroundColor Cyan
    $results | Format-Table -AutoSize
}

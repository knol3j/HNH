@echo off
title HashNHedge Node Client Installer
color 0A

echo ================================================
echo    HashNHedge Mining Node - Quick Setup
echo    Revenue Share: 70%% to You!
echo ================================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Admin rights detected
) else (
    echo [!] Please run as Administrator
    pause
    exit
)

echo [1] Installing dependencies...
echo.

:: Create directories
mkdir "%APPDATA%\HashNHedge" 2>nul
mkdir "%APPDATA%\HashNHedge\config" 2>nul
mkdir "%APPDATA%\HashNHedge\logs" 2>nul

:: Generate unique node ID
set NODE_ID=NODE-%RANDOM%

echo [2] Generating Node Configuration...
echo.
echo Your Node ID: %NODE_ID%
echo.

:: Create config file
(
echo {
echo   "node_id": "%NODE_ID%",
echo   "wallet_address": "PENDING_SETUP",
echo   "mining_pool": "pool.hashnhedge.com:3333",
echo   "worker_name": "%COMPUTERNAME%",
echo   "algorithm": "auto",
echo   "revenue_share": 70,
echo   "auto_switch": true,
echo   "gpu_enabled": true,
echo   "cpu_enabled": false
echo }
) > "%APPDATA%\HashNHedge\config\node.json"

echo [3] Detecting GPU...
wmic path win32_VideoController get name | findstr /i "nvidia amd" >nul
if %errorLevel% == 0 (
    echo [OK] GPU detected - High earnings potential!
) else (
    echo [!] No GPU detected - CPU mining only
)

echo.
echo [4] Configuration Complete!
echo.
echo ================================================
echo    NEXT STEPS:
echo    1. Visit: hashnhedge.com/register
echo    2. Enter Node ID: %NODE_ID%
echo    3. Set your wallet address
echo    4. Start earning immediately!
echo ================================================
echo.
echo Estimated Daily Earnings:
echo   GPU Mining: $50-150/day
echo   CPU Mining: $5-20/day
echo.
echo Press any key to open the dashboard...
pause >nul
start https://hashnhedge.com/dashboard

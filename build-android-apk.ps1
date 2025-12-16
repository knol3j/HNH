# Build Android APK Script for HashNHedge
# This script builds the web assets and then creates the Android APK

Write-Host "=== Building HashNHedge Android APK ===" -ForegroundColor Cyan

# Step 1: Check if Node.js is installed
Write-Host "`n[1/4] Checking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Node.js is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "After installation, restart your terminal and run this script again." -ForegroundColor Yellow
    exit 1
}
Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green

# Step 2: Install dependencies if needed
Write-Host "`n[2/4] Installing/updating dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install dependencies!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Dependencies already installed, skipping..." -ForegroundColor Green
}

# Step 3: Build web assets
Write-Host "`n[3/4] Building web assets with Vite..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to build web assets!" -ForegroundColor Red
    exit 1
}
Write-Host "Web assets built successfully!" -ForegroundColor Green

# Step 4: Sync Capacitor
Write-Host "`n[4/4] Syncing Capacitor with Android project..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to sync Capacitor!" -ForegroundColor Red
    exit 1
}
Write-Host "Capacitor synced successfully!" -ForegroundColor Green

# Step 5: Build APK with Gradle
Write-Host "`n[5/5] Building Android APK with Gradle..." -ForegroundColor Yellow
Set-Location android
if (Test-Path "gradlew.bat") {
    .\gradlew.bat assembleRelease
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to build APK!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    
    $apkPath = "app\build\outputs\apk\release\app-release.apk"
    if (Test-Path $apkPath) {
        Write-Host "`n=== SUCCESS ===" -ForegroundColor Green
        Write-Host "APK built successfully!" -ForegroundColor Green
        $fullPath = (Resolve-Path $apkPath).Path
        Write-Host "APK location: $fullPath" -ForegroundColor Cyan
        Write-Host "`nYou can install this APK on your Android device." -ForegroundColor Yellow
    } else {
        Write-Host "WARNING: APK file not found at expected location!" -ForegroundColor Yellow
        Write-Host "Check android\app\build\outputs\apk\ for the APK file." -ForegroundColor Yellow
    }
} else {
    Write-Host "ERROR: gradlew.bat not found!" -ForegroundColor Red
    Write-Host "Make sure you're in the project root directory." -ForegroundColor Yellow
}
Set-Location ..

Write-Host "`nBuild process completed!" -ForegroundColor Cyan


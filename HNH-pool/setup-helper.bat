@echo off
echo ============================================
echo HashNHedge Setup Helper
echo ============================================
echo.
echo This script will help you complete the setup.
echo.
echo Please place your dashboard HTML files in the current directory first:
echo - "HashNHedge GPU Farm Dashboard.html"
echo - "HashNHedge Dynamic Mining & Pentesting Platform.html"
echo.
pause

REM Check if files exist
if not exist "HashNHedge GPU Farm Dashboard.html" (
    echo ERROR: "HashNHedge GPU Farm Dashboard.html" not found!
    echo Please place the file in this directory and run again.
    pause
    exit /b 1
)

if not exist "HashNHedge Dynamic Mining & Pentesting Platform.html" (
    echo ERROR: "HashNHedge Dynamic Mining & Pentesting Platform.html" not found!
    echo Please place the file in this directory and run again.
    pause
    exit /b 1
)

REM Copy files
echo.
echo Copying dashboard files...
copy "HashNHedge GPU Farm Dashboard.html" "pages\gpu-farm-dashboard.html" /Y
copy "HashNHedge Dynamic Mining & Pentesting Platform.html" "pages\mining-security-platform.html" /Y

echo.
echo Setup complete!
echo.
echo Next steps:
echo 1. Review the files in the pages/ directory
echo 2. Test locally by opening index.html in a browser
echo 3. Follow DEPLOY.md for deployment instructions
echo.
pause

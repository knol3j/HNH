@echo off
REM HashNHedge Platform Server
REM Usage: Double-click this file or run from command line

echo ========================================
echo    HashNHedge Platform Starting...
echo ========================================

REM Ensure dependencies are installed
echo Installing dependencies...
call npm install

REM Start the Node.js server with backend API
echo Starting server with backend API...
call npm start

REM Server will automatically open browser
echo Server starting on http://localhost:3001

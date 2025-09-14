@echo off
REM Simple script to serve static site using npx http-server
REM Usage: Double-click this file or run from command line

REM Ensure dependencies are installed
call npm install

REM Start http-server on port 8080, serving current directory
npx http-server . -p 8080

REM Open default browser to index.html
start http://localhost:8080/index.html

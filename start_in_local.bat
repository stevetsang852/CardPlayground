@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo CardPlayground - local start
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 20 or newer, then run this file again.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js, then run this file again.
  pause
  exit /b 1
)

if not exist "backend\.env" (
  echo Creating backend\.env from backend\.env.example
  copy /Y "backend\.env.example" "backend\.env" >nul
)

if not exist "backend\data" mkdir "backend\data"

if not exist "node_modules\" (
  echo Installing dependencies. This can take a few minutes the first time.
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting API at http://localhost:3000
start "CardPlayground API" /D "%~dp0" cmd /k "npm run dev:backend"

echo Starting web at http://localhost:5173
start "CardPlayground Web" /D "%~dp0" cmd /k "npm run dev:client"

timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo Two windows are open: API and Web. Close those windows to stop.
echo Redis is optional. If the API says Redis is down, the local database still works.
echo.
pause
endlocal

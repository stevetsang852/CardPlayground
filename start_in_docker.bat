@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo CardPlayground - Docker development
echo Web http://localhost:5173    API http://localhost:3000
echo Vite and the API reload from the mounted source.
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo Docker was not found. Install Docker Desktop, then run this file again.
  pause
  exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
  echo Docker is installed but not running. Open Docker Desktop and wait until it is ready.
  pause
  exit /b 1
)

if not exist "backend\data" mkdir "backend\data"

echo Web:  http://localhost:5173
echo API:  http://localhost:3000
echo The browser opens after the first build. Press Ctrl+C here to stop.
echo.

start "CardPlayground browser" cmd /c "timeout /t 40 /nobreak >nul && start "" http://localhost:5173"

docker compose version >nul 2>&1
if errorlevel 1 (
  echo Using docker-compose.
  docker-compose up --build
) else (
  echo Using docker compose.
  docker compose up --build
)

if errorlevel 1 (
  echo Docker start failed.
  pause
  exit /b 1
)

echo.
echo Stopped. Containers may still be running. To remove them, run: docker compose down
pause
endlocal

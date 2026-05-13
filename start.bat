@echo off
REM Finch — local launcher.
REM Starts a static HTTP server on http://localhost:8765 and opens the browser.
REM Uses serve.py which adds Cache-Control: no-store so JSX edits show up on
REM a normal refresh (no Ctrl+Shift+R needed).

setlocal
cd /d "%~dp0webapp"

set PORT=8765
set URL=http://localhost:%PORT%/index.html

where py >nul 2>&1
if not errorlevel 1 (
  echo [Finch] Using Python (no-cache wrapper) on port %PORT%
  start "" "%URL%"
  py -3 serve.py %PORT%
  goto :eof
)

where python >nul 2>&1
if not errorlevel 1 (
  echo [Finch] Using python (no-cache wrapper) on port %PORT%
  start "" "%URL%"
  python serve.py %PORT%
  goto :eof
)

REM Fallback: try Node's http-server if installed.
where npx >nul 2>&1
if not errorlevel 1 (
  echo [Finch] Python not found. Falling back to npx http-server.
  start "" "%URL%"
  npx --yes http-server -p %PORT% -c-1
  goto :eof
)

echo.
echo [Finch] Could not find Python or Node.
echo Install one of:
echo   - Python 3 from https://www.python.org/downloads/  (recommended)
echo   - Node.js  from https://nodejs.org/
echo and run start.bat again.
pause

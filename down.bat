@echo off
REM Finch — local launcher stop.
REM Kills whatever is listening on the dev ports (8765 production, 8766 demo).

setlocal enabledelayedexpansion

set "ANY_KILLED="

call :killport 8765 production
call :killport 8766 demo

if not defined ANY_KILLED (
  echo [Finch] No dev server was running on ports 8765 or 8766.
)
endlocal
goto :eof

:killport
set "PORT=%~1"
set "LABEL=%~2"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":%PORT% "') do (
  echo [Finch] Stopping %LABEL% server ^(PID %%P^) on port %PORT%
  taskkill /PID %%P /F >nul 2>&1
  set "ANY_KILLED=1"
)
goto :eof

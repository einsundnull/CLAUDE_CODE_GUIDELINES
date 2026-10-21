@echo off
:: ============================================================
::  start-watchdog.bat
::  Startet den WLAN-Watchdog minimiert im Hintergrund.
::  Muss als Administrator ausgeführt werden.
:: ============================================================

:: Administratorrechte prüfen
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo Dieses Skript benoetigt Administratorrechte.
    echo Bitte rechtsklick ^> "Als Administrator ausfuehren".
    pause
    exit /b 1
)

set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%wifi-watchdog.ps1"

if not exist "%PS_SCRIPT%" (
    echo FEHLER: wifi-watchdog.ps1 nicht gefunden in:
    echo %SCRIPT_DIR%
    pause
    exit /b 1
)

echo Starte WLAN-Watchdog im Hintergrund...
echo Logs werden gespeichert in: %SCRIPT_DIR%logs\

:: PowerShell minimiert und im Hintergrund starten
:: ExecutionPolicy Bypass noetig, da das Skript nicht signiert ist
powershell.exe -WindowStyle Minimized -ExecutionPolicy Bypass ^
    -File "%PS_SCRIPT%" ^
    -LogDir "%SCRIPT_DIR%logs" ^
    -PingHost "8.8.8.8" ^
    -Interval 60

echo Watchdog wurde gestartet.

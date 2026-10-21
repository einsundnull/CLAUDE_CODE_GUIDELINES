@echo off
:: ============================================================
::  stop-watchdog.bat
::  Beendet alle laufenden WLAN-Watchdog-Instanzen.
:: ============================================================

echo Suche laufende Watchdog-Prozesse...

:: Alle PowerShell-Prozesse beenden, die wifi-watchdog.ps1 ausfuehren
wmic process where "name='powershell.exe' and commandline like '%%wifi-watchdog%%'" ^
     call terminate >nul 2>&1

if %errorLevel% EQU 0 (
    echo WLAN-Watchdog wurde beendet.
) else (
    echo Kein laufender Watchdog-Prozess gefunden.
)

pause

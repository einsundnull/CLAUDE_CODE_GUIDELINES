@echo off
:: ============================================================
::  unregister-autostart.bat
::  Entfernt die geplante Aufgabe "WLAN-Watchdog".
::  Ein gerade laufender Watchdog wird NICHT beendet
::  (dafuer: stop-watchdog.bat).
::  Muss als Administrator ausgeführt werden.
:: ============================================================

net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo Dieses Skript benoetigt Administratorrechte.
    echo Bitte rechtsklick ^> "Als Administrator ausfuehren".
    pause
    exit /b 1
)

schtasks /Delete /F /TN "WLAN-Watchdog"
pause

@echo off
:: ============================================================
::  register-autostart.bat
::  Legt die geplante Aufgabe "WLAN-Watchdog" an: startet beim
::  Login autostart-watchdog.ps1 mit hoechsten Rechten, also
::  ohne UAC-Abfrage. Nur EINMAL noetig.
::  Muss als Administrator ausgeführt werden.
::  Entfernen: unregister-autostart.bat
:: ============================================================

net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo Dieses Skript benoetigt Administratorrechte.
    echo Bitte rechtsklick ^> "Als Administrator ausfuehren".
    pause
    exit /b 1
)

set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%autostart-watchdog.ps1"

if not exist "%PS_SCRIPT%" (
    echo FEHLER: autostart-watchdog.ps1 nicht gefunden in:
    echo %SCRIPT_DIR%
    pause
    exit /b 1
)

schtasks /Create /F /TN "WLAN-Watchdog" /SC ONLOGON /RL HIGHEST /RU "%USERNAME%" ^
    /TR "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \"%PS_SCRIPT%\""

if %errorLevel% NEQ 0 (
    echo FEHLER: Aufgabe konnte nicht angelegt werden.
    pause
    exit /b 1
)

echo.
echo Aufgabe "WLAN-Watchdog" angelegt. Sie startet beim naechsten Login.
echo Sofort starten:  schtasks /Run /TN "WLAN-Watchdog"
pause

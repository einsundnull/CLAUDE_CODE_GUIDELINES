@echo off
:: ============================================================
::  open-selector.bat
::  Öffnet die WLAN-Selector-GUI.
::  Muss als Administrator ausgeführt werden.
:: ============================================================

net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo Dieses Skript benoetigt Administratorrechte.
    echo Bitte rechtsklick ^> "Als Administrator ausfuehren".
    pause
    exit /b 1
)

set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%wifi-selector.ps1"

if not exist "%PS_SCRIPT%" (
    echo FEHLER: wifi-selector.ps1 nicht gefunden in:
    echo %SCRIPT_DIR%
    pause
    exit /b 1
)

:: -Sta = Single-Threaded Apartment, wird von WinForms benoetigt
powershell.exe -Sta -ExecutionPolicy Bypass -File "%PS_SCRIPT%"

:: Fenster offen halten, damit Fehlermeldungen sichtbar sind
if %errorLevel% NEQ 0 (
    echo.
    echo FEHLER: PowerShell hat das Skript mit Fehlercode %errorLevel% beendet.
    echo Bitte die Fehlermeldung oben ablesen und weitergeben.
    pause
)

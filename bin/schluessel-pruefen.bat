@echo off
rem Schluessel pruefen: startet einen eigenen Server nur auf 127.0.0.1 und oeffnet den Browser.
rem Beschreibung: Kopf von schluessel-pruefen.mjs. Beenden: Taste in diesem Fenster oder Knopf "Beenden".
chcp 65001 >nul
node "%~dp0schluessel-pruefen.mjs"
if errorlevel 1 (
  echo.
  echo Fehler beim Starten ^(ist Node installiert?^). Taste druecken zum Schliessen.
  pause >nul
)

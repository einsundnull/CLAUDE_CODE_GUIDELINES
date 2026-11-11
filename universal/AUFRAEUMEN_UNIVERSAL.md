# AUFRAEUMEN_UNIVERSAL.md — Laptop aufräumen und optimieren

Quelle: dieses Repo. Geladen über den Skill `laptop-aufraeumen`. Erstellt 2026-11-11
(Task_2026-11-11_Laptop-optimieren.txt).

## §A1 Ablauf

1. Freien Platz auf C: messen und notieren.
2. Trockenlauf selbst starten — er löscht nichts:
   `powershell -ExecutionPolicy Bypass -File "C:\Users\pc\Documents\CLAUDE_CODE_GUIDELINES\bin\laptop-aufraeumen.ps1" -Android -PythonStore`
3. Neue große Ordner suchen, die das Skript nicht kennt: Größen der Ordner in `%LOCALAPPDATA%`
   messen, mit der Liste unten vergleichen. Neues erst einordnen, dann ins Skript aufnehmen.
4. Den User fragen (Frage-Format aus KERN): Freigabe zum Löschen, und nur die Gruppen aus §A3,
   deren Entscheidung fehlt oder älter als 6 Monate ist.
5. Löschen startet der User selbst (Grund: §A4) mit `! powershell … -Loeschen …`.
6. Vorher/nachher und die Ausgabe in die progress-Datei, die Entscheidungen in §A3 nachtragen.

## §A2 Sicher löschbar — ohne Rückfrage zur Sache, nur Freigabe

- `Temp\claude\*\*`: alte Claude-Sitzungen. Nie, was in den letzten 2 Stunden geschrieben wurde
  (laufende Sitzungen, auch anderer Konten).
- `Temp`: Einträge älter als 7 Tage.
- `Edge|Chrome\User Data\Crashpad`: Absturzberichte.
- `Google\AndroidStudio*` außer der neuesten Version: Einstellungen alter Versionen.
- `*-updater`, `SquirrelTemp`: Installer-Reste.
- `ms-playwright`, `pip\cache`, `npm-cache` (über `npm cache clean --force`): laden bei Bedarf neu.
- `.gradle\wrapper\dists\*`, die keine `gradle-wrapper.properties` in den Projektordnern nennt;
  `.gradle\daemon` (Protokolle). Ist die Erkennung unsicher, bleibt alles (Beleg: ein Regex-Fehler
  hätte am 2026-11-11 auch die benutzten Versionen gelöscht; im Trockenlauf aufgefallen).
- `.cache\puppeteer`, Papierkorb (Freigabe 2026-11-11).

## §A3 Nur nach Entscheidung des Users

| Gruppe | Schalter | Entscheidung |
|---|---|---|
| Android-NDK außer neuester, `ndk-bundle`, Emulator-Abbilder | `-Android` | 2026-11-11: nicht gebraucht, löschen |
| Python aus dem Microsoft Store | `-PythonStore` | 2026-11-11: nicht gebraucht, löschen. Vorher prüfen: `graphify-out\.graphify_python` und `python --version` zeigen auf `AppData\Local\Python` |
| `.git-entfernt-*` im Benutzerordner (abgehängte Git-Daten) | `-GitAltlast` | 2026-11-11: löschen (project-hub-Stand Juni 2026, sonst nirgends, vom User verworfen) |
| Autostart: Skype deinstallieren, Skype/Messenger/Edge-Autostart aus, verwaiste Aufgaben (Programm fehlt) | `-Autostart` | 2026-11-11: ja |
| `.cache\whisper` (Spracherkennung) | keiner | 2026-11-11: nicht gefragt, bleibt |
| WSL-Ubuntu (`wsl\{…}`, 15 GB) | keiner | 2026-11-11: wird gebraucht, bleibt. Nie per Skript; nur `wsl --unregister` durch den User |

## §A4 Nie oder nur selbst durch den User

- Chrome-Profile (`User Data\Default`, `Konto N`): Anmeldungen der Konten.
- `Packages\Claude_*`, `Microsoft\Office`, `Microsoft\Windows`, `Programs`, `Python`.
- Registry-Reiniger: kein messbarer Nutzen, Risiko für Windows.
- Löschen durch Claude: Der Sicherheitsfilter blockierte es am 2026-11-11 bei bloßer Freigabe
  („1 ja“). Mit dem ausdrücklichen Auftrag „Du führst das Löschen aus“ lief es durch. Blockiert
  er: nicht umgehen, der User startet den Befehl selbst (`! powershell … -Loeschen …`).
- Geplante Aufgaben im Stammordner der Aufgabenplanung (z. B. verwaiste McAfee-Aufgaben) brauchen
  Administratorrechte; das Skript meldet sie, der User startet es dann als Administrator.

## §A5 Weitere Orte (nicht im Skript, nur messen und vorschlagen)

`Downloads`, `Pictures`, `Desktop` (persönlich), `AppData\Roaming`, `.m2` (Eclipse braucht es),
`.gradle\caches` (beschleunigt Builds), doppelte Projektkopien in `Documents\Phoenix Code`
(2026-11-11 zusammen nur 0.6 GB). Arbeitsspeicher: 2026-11-11 12 von 20 GB frei, kein Bedarf.

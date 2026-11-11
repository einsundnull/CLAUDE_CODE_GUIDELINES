# AUFRAEUMEN_UNIVERSAL.md — Laptop aufräumen und optimieren

Quelle: dieses Repo. Geladen über den Skill `laptop-aufraeumen`. Erstellt 2026-11-11
(Task_2026-11-11_Laptop-optimieren.txt). §A0 (Vorbeugen) gilt immer; KERN.md verweist darauf.

## §A0 Vorbeugen — die Platte wird gar nicht erst voll

Bestellt vom User 2026-11-11 nach dem Aufräumen (1.7 → 59 GB frei): *„dass die Projekte immer so ablaufen,
dass die Festplatte gar nicht erst zugemüllt wird.“* Gilt in jedem Projekt, bei jeder Aufgabe. Jede Regel
nennt den Müll, den sie verhindert hätte.

1. **Zwischendateien nur im scratchpad**, nie in `Temp`, im Benutzerordner oder im Projekt. Am Ende der
   Aufgabe löscht Claude im scratchpad alles über 50 MB, das niemand mehr braucht (Videos, Bildfolgen,
   Repo-Abzüge, Protokolle). (6 GB alte Claude-Sitzungen in `Temp\claude`.)
2. **Keine Kopie eines Projektordners.** Vergleich und Rot-Probe über `git archive` ins scratchpad, danach
   löschen. Sicherung ist Git, nicht „… - Kopie (15)“. Muss ein alter Stand liegen bleiben: ein Ordner
   mit Datum und Grund in `doc/`. (15 Kopien von German in `Phoenix Code`.)
3. **Abgehängte Git-Daten werden nicht umbenannt und vergessen.** Erst prüfen, ob die Commits sonst
   irgendwo liegen; dann löschen oder als Bündel (`git bundle`) mit Datum ablegen und in `doc/` vermerken.
   (`.git-entfernt-2026-11-06`, 4.2 GB.)
4. **Werkzeuge einmal, nicht je Projekt.** Test-Browser (Playwright, Puppeteer), Python, Node, JDK, Gradle,
   NDK: eine gemeinsame Version. Bevor ein Projekt eine neue Version lädt: prüfen, ob eine vorhandene
   reicht. Wechselt ein Projekt die Version, wird die alte gelöscht, sobald kein Projekt sie mehr nennt.
   (Gradle 8.5 GB, NDK 12.6 GB, zwei Pythons.)
5. **Test-Profile und Testdaten leben nur für die Prüfung.** Chrome-Profile, Emulator-Abbilder,
   Datenbank-Abzüge, die eine Prüfung anlegt, löscht dieselbe Prüfung am Ende, auch wenn sie rot ist.
6. **Erzeugte Ausgaben haben eine Obergrenze.** Trainingsläufe, Protokolle, Bildschirmfotos, GIFs,
   Bench-Ergebnisse: behalten werden der beste Stand und die letzten 5 Läufe; Ältere löscht das Skript,
   das sie schreibt. Jede solche Ausgabe steht in `.gitignore`. Ein Protokoll wächst nie ohne Ende.
7. **Downloads gehören in den Ordner der Aufgabe**, nicht nach `Downloads`. Installer werden nach der
   Installation gelöscht. Wird ein Programm deinstalliert, kommen seine Reste (`*-updater`, Caches) mit weg.
8. **Wer etwas Großes anlegt (über 500 MB), sagt es** in der Antwort und in der progress-Datei, mit Pfad
   und wie es wieder wegkommt.
9. **Prüfen statt vergessen:** Das Audit nach jeder PD (Prompt_Handling.txt) fragt auch: Was hat diese
   Aufgabe auf der Platte hinterlassen? Der Start-Hook (`bin/hooks/session-start.mjs`) warnt, wenn auf
   C: weniger als 20 GB frei sind; dann zuerst §A1 vorschlagen.

## §A1 Ablauf

1. Freien Platz auf C: messen und notieren.
2. Trockenlauf selbst starten — er löscht nichts:
   `powershell -ExecutionPolicy Bypass -File "C:\Users\pc\Documents\CLAUDE_CODE_GUIDELINES\bin\laptop-aufraeumen.ps1" -Android -PythonStore`
3. Neue große Ordner suchen, die das Skript nicht kennt: `bin/laptop-messen.ps1` (nur lesen) starten,
   mit der Liste unten vergleichen. Neues erst einordnen, dann ins Skript aufnehmen.
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
- `*.hprof` im Benutzerordner und `CrashDumps` (Speicherabzüge nach Abstürzen); alte Claude-Versionen in
  `.local\share\claude\versions` und `.local\bin\claude.exe.old.*` außer der neuesten. Gesperrte gehören
  einer laufenden Sitzung (auch anderer Konten) und bleiben (2026-11-11: 1.4 GB).

## §A3 Nur nach Entscheidung des Users

| Gruppe | Schalter | Entscheidung |
|---|---|---|
| Android-NDK außer neuester, `ndk-bundle`, Emulator-Abbilder | `-Android` | 2026-11-11: nicht gebraucht, löschen |
| Python aus dem Microsoft Store | `-PythonStore` | 2026-11-11: nicht gebraucht, löschen. Vorher prüfen: `graphify-out\.graphify_python` und `python --version` zeigen auf `AppData\Local\Python` |
| `.git-entfernt-*` im Benutzerordner (abgehängte Git-Daten) | `-GitAltlast` | 2026-11-11: löschen (project-hub-Stand Juni 2026, sonst nirgends, vom User verworfen) |
| Autostart: Skype deinstallieren, Skype/Messenger/Edge-Autostart aus, verwaiste Aufgaben (Programm fehlt) | `-Autostart` | 2026-11-11: ja |
| `.cache\whisper` (Spracherkennung) | keiner | 2026-11-11: nicht gefragt, bleibt |
| WSL-Ubuntu (`wsl\{…}`, 15 GB) | keiner | 2026-11-11: wird gebraucht, bleibt. Nie per Skript; nur `wsl --unregister` durch den User |
| Ruhezustand (`hiberfil.sys`, 8 GB) | keiner | 2026-11-11: wird gebraucht, bleibt |
| `LocalLow\Google\GoogleEarth\Cache` | keiner | 2026-11-11: löschen (lädt neu) |
| Projektkopien („… - Kopie“, `Backup*`) und `app\build` | keiner | 2026-11-11: löschen. Vorher: Kopien mit nicht committeten Änderungen ohne build/node_modules/.git als ZIP nach `Documents\Archiv-Projektkopien-<Datum>` mit LIESMICH.txt |

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
Zweite Messung 2026-11-11 abends: `hiberfil.sys` 8 GB (Ruhezustand; nur `powercfg /h off` als Administrator,
schaltet auch den Schnellstart ab), `LocalLow\Google\GoogleEarth` 2 GB (Cache, lädt neu), Projektkopien
`catalog - Kopie*`, `German - Kopie (10–15)`, `BT - Working Version - Kopie*`, `promo\Backup II`
(zusammen rund 1 GB) und `app\build`-Ordner (lassen sich neu bauen), Videos in `Pictures` und `Downloads`
(persönlich). Die Messung: `bin/laptop-messen.ps1`.

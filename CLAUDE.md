# CLAUDE.md — CLAUDE_CODE_GUIDELINES

Die eine Quelle der allgemeinen Regeln für alle Projekte. Jede Änderung hier wirkt auf alle Projekte.

## Einstieg

Lies `README.md` (Aufbau des Repos) und `PROJECTS.txt` (welches Projekt wo liegt, abweichende Orte).
Die Regeldateien in `universal/` nur abschnittsweise: `grep -n "^## " <Datei>`, Betroffenes lesen.
Es gibt hier keine WEITERMACHEN_PROMPT.txt. Ohne Auftrag: auf die Aufgabe des Users warten.
Aufgaben und Verlauf: `doc/` (`Task_*.txt`, `progress_*.txt`).

## Prüfen

`bash bin/check-projects.sh` — prüft alle Projekte, die Größen der Pflichtlektüre und die Startprompts der Hub-Seite.

## Hochladen

`bash bin/push.sh "was geändert wurde"` — erst, wenn der User es sagt.

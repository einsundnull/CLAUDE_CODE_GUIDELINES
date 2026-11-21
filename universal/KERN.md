# KERN — gilt in jeder Sitzung, jedem Projekt, jedem Konto

Quelle: dieses Repo, nie kopieren. Lädt über `~/.claude/CLAUDE.md`. Höchstens 4 KB.

## Einstieg

- Die `CLAUDE.md` des Projekts sagt, was zu lesen ist; lädt sie nicht, wird sie zuerst gelesen.
- „weiter“: `WEITERMACHEN_PROMPT.txt` und die dort genannte aktive PD (`doc/Task_*.txt`) lesen, dann arbeiten.
- Allgemeine Regeln (`universal/`) und `doc/GUIDELINES.md` nur abschnittsweise: Überschriften holen, nur Betroffenes lesen. Im Zweifel lesen.
- Bei Konflikt gewinnt die projektnähere Regel, dort namentlich begründet.

## Orte und Grenzen

- `Task_*.txt` (PD) und `progress_*.txt` liegen in `doc/`, nach jedem Schritt aktualisiert. Im Root nur `CLAUDE.md` und `WEITERMACHEN_PROMPT.txt`. Kein progress im Benutzerordner.
- Arbeitsbereich = Projektordner, auch nicht „zum Vergleichen“ in einer Kopie. Keine rekursive Suche ohne Projektpfad. Ausnahme: Lesen in diesem Repo und was `doc/GUIDELINES.md` nennt. Geht es hinaus: vorher sagen.
- Schlüssel nie in einem Repo: `C:\Users\pc\Documents\Schluessel-privat`.
- Platte nicht zumüllen (`AUFRAEUMEN_UNIVERSAL.md` §A0): Zwischendateien ins scratchpad, keine Projektkopie, Werkzeug-Versionen teilen, Ausgaben begrenzen, über 500 MB melden.
- Größere Aufgabe (mehrere Schritte), Archivieren, Code-Audit, neues Skript: zuerst Skill `aufgaben-ablauf`.
- Nur am Gerät Sichtbares heißt nie „funktioniert“: Liste (A1, A2 …: Taste/Klick, erwartete Beobachtung) in die progress-Datei. Jede Neuerung nennt Tasten oder Klicks zum Testen.

## Fragen und Anweisungen an den User

Grund (User 2026-09-04): Eine im Text versteckte Frage bleibt unbeantwortet, dann wird auf einer Annahme gebaut.

- Einfache Sprache: ein Gedanke pro Satz, Fachwort im Halbsatz erklären. Das Wichtigste zuerst, Belege in die progress-Datei.
- Keine Kennung ohne Bedeutung: PR4, F2 oder Ähnliches stehen nie allein, in derselben Zeile steht ein kurzer Satz dazu. Keine §-Nummern in einer Frage.
- Höchstens 4 Fragen pro Runde, nur nach Absichten, Grenzen, Plänen; was in Code oder `doc/` steht, selbst lesen.
- Letzte Option immer: „Etwas anderes — ich schreibe es hin“. Bei jeder Frage steht, was ohne Antwort passiert („Default: X“ oder „ohne Antwort geht es nicht weiter“).
- Die Frage steht allein, ohne Befund oder Begründung im Block.
- Die Blöcke stehen direkt vor dem Abschluss-Block. Nichts zu fragen oder zu tun: Block entfällt. Exakt diese Form, je Nummer eine Sache:

```
Question:
──────────────────────────────────────────────────────────────────────────
1. Was der User beantworten soll.
──────────────────────────────────────────────────────────────────────────

Instruction:
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
1. Was der User tun soll, je Zeile ein Schritt.
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
```

## Abschluss-Block: die letzten Zeilen jeder Ausgabe

```
# PD.txt aktualisiert (ja/nein)
# progress.txt aktualisiert (ja/nein)
# WEITERMACHEN_PROMPT.txt aktualisiert (ja/nein)
# Fragen nach "/clear" beantwortbar (ja/nein/keine Fragen)
# WEITERMACHEN_PROMPT.txt bereinigt und alter archiviert (ja/nein)
# Die Aufgabe <ID> wurde vollständig abgeschlossen (ja/nein)
# Code-Audit nach PD gelaufen (ja/nein/entfällt) - Befunde: <Anzahl>
# Nächster Schritt: [n/m] bzw. nächstes TODO: <Aufgabe>
# "/clear" Befehl und WEITERMACHEN_PROMPT.txt empfohlen (ja/nein)
# Bewusst NICHT gemacht: <Liste + Grund; auch verworfene eigene Empfehlungen>
```

Die letzte Zeile ist die wichtigste: Ausgelassenes und Verworfenes wird namentlich genannt.
Fragen-Zeile (User 2026-11-21): „ja“ = Fragen stehen in WEITERMACHEN_PROMPT.txt, erst /clear, dann antworten; „nein“ = jetzt.

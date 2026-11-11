# CLAUDE_CODE_GUIDELINES

**Die eine Quelle der Wahrheit für alle allgemeinen Regeln.**
Repo: `https://github.com/einsundnull/CLAUDE_CODE_GUIDELINES.git`
Lokal: `C:\Users\pc\Documents\CLAUDE_CODE_GUIDELINES\`
Angelegt: 2026-09-05

---

## Das Modell in drei Sätzen

1. **Allgemeine Regeln** liegen ausschließlich hier, in `universal/`. Sie
   werden nicht in Projekte kopiert — Projekte **lesen** sie über den
   absoluten Pfad.
2. **Projektspezifische Regeln** liegen ausschließlich im Projekt, in
   `<Projekt>\doc\GUIDELINES.md`. Dort steht der Projekt-Steckbrief, der die
   Rollen aus den allgemeinen Regeln mit konkreten Klassen/Dateien besetzt.
3. **Bei Konflikt gewinnt das Projekt** — aber nur mit namentlicher
   Begründung an Ort und Stelle.

Warum keine Kopien: Kopien driften. Dieses Repo entstand genau daran. Am
2026-09-05 lagen im Bestand drei verschiedene `GUIDELINES_v2.md`
(56 KB / 30 KB / 35 KB), drei verschiedene `UNIVERSAL_GUIDELINES.md`
(2 KB / 20 KB / 8,6 KB, gleicher Name, völlig anderer Inhalt) und drei
verschiedene `Prompt_Handling.txt`. Keine davon war als veraltet erkennbar.

---

## Was hier liegt

```
universal/
  KERN.md                        Einstieg, Orte, Frage-Format, Abschluss-Block. Lädt in JEDER Sitzung
                                 über C:\Users\pc\.claude\CLAUDE.md. Obergrenze 4 KB.
  JAVA_GUIDELINES_UNIVERSAL.md   Regeln + Steckbrief §14, für Java-Projekte
  WEB_GUIDELINES_UNIVERSAL.md    Regeln + Steckbrief §14, für HTML/CSS/JS
  Prompt_Handling.txt            Aufgaben-Ablauf: Schritte, PD, Archiv, Audit, Skripte.
                                 Geladen über den Claude-Skill ~/.claude/skills/aufgaben-ablauf/
  ARBEITSPLATZ_UNIVERSAL.md      KEIN Projekt-Regelwerk: Claude-Konten, Werkzeuge, Orte;
                                 Konto wechseln auf Zuruf (auch vom Telefon).
                                 Geladen über den Claude-Skill ~/.claude/skills/konto-wechseln/
  AI_TRAINING_UNIVERSAL.md       §T0–§T11: KI trainieren ohne Austricksen der Belohnung
                                 (Belohnungs-Prüfung, Kennzahlen, Abbruch-Regeln, Self-Play).
                                 Geladen über den Claude-Skill ~/.claude/skills/ai-training/
  PERFORMANCE_UNIVERSAL.md       §P0–§P8: Performance by Design — Programm-Art + Ziel-Geräte,
                                 Budget, Pflicht-Bausteine, Messwerkzeuge, regelmäßige Prüfung.
                                 Geladen über den Claude-Skill ~/.claude/skills/performance/
  PRUEFSTAND_UNIVERSAL.md        §S1–§S3: Prüfungen, die wirklich etwas prüfen (war einmal rot,
                                 Verhalten statt Quelltext, Zusagen statt Bestand).
                                 Geladen über den Claude-Skill ~/.claude/skills/pruefstand/
  AUFRAEUMEN_UNIVERSAL.md        §A1–§A5: Laptop aufräumen (AppData, Caches, Android-SDK);
                                 sicher / nur nach Entscheidung / nie. Skript bin/laptop-aufraeumen.ps1.
                                 Geladen über den Claude-Skill ~/.claude/skills/laptop-aufraeumen/
skills/
  ai-training/SKILL.md           Claude-Skill, verweist nur auf AI_TRAINING_UNIVERSAL.md.
                                 ~/.claude/skills/ai-training ist eine Junction auf diesen
                                 Ordner (alle Konten sehen ihn über ihre skills-Junction).
  performance/SKILL.md           Claude-Skill, verweist nur auf PERFORMANCE_UNIVERSAL.md;
                                 ~/.claude/skills/performance ist ebenso eine Junction.
  pruefstand/SKILL.md            Claude-Skill, verweist nur auf PRUEFSTAND_UNIVERSAL.md;
                                 ~/.claude/skills/pruefstand ist ebenso eine Junction.
  aufgaben-ablauf/SKILL.md       verweist nur auf Prompt_Handling.txt; ebenso eine Junction.
  konto-wechseln/SKILL.md        verweist nur auf ARBEITSPLATZ_UNIVERSAL.md; ebenso eine Junction.
  laptop-aufraeumen/SKILL.md     verweist nur auf AUFRAEUMEN_UNIVERSAL.md; ebenso eine Junction.
templates/
  Task_TEMPLATE.txt              Kopiervorlage für eine PD (Task_*.txt)
                                 CLAUDE.md, doc/GUIDELINES.md und
                                 WEITERMACHEN_PROMPT.txt stehen bewusst NICHT
                                 hier als Datei — new-project.sh erzeugt sie
                                 mit eingesetztem Pfad. Zwei Vorlagen für
                                 dieselbe Sache würden driften.
bin/
  push.sh                        schreibt Änderungen in dieses Repo (commit + push)
  laptop-aufraeumen.ps1          Trockenlauf; mit -Loeschen [-Android] [-PythonStore] [-GitAltlast] [-Autostart] wird gelöscht
  new-project.sh                 richtet ein NEUES Projekt nach diesem Modell ein
  check-projects.sh              prüft, ob alle Projekte richtig angebunden sind
  _wait.sh                       die Warte-Zeile am Ende jedes Skripts
                                 (`wait_for_key`) — Enter, ESC oder jede andere
                                 Taste schließt. Wird von allen dreien geladen,
                                 damit die fünf Zeilen nicht dreimal dastehen.
                                 Regel: Prompt_Handling.txt, „EIN SKRIPT
                                 SCHLIESST SICH NICHT SELBST"
  hooks/session-start.mjs        warnt, wenn eine Sitzung oberhalb eines Projektordners startet
                                 (eingetragen in ~/.claude/settings.json)
CLAUDE.md                        Einstieg für Sitzungen in diesem Repo (seit 2026-11-08; vorher
                                 stand der Text als BESONDERS im Startprompt-Erzeuger des Hubs)
START_TEMPLATE.txt               abgelöst: nur noch ein Verweis
PROJECTS.txt                     welches Projekt welche Sprache liest und wo es liegt
```

---

## Neues Projekt anlegen

```bash
bash ~/Documents/CLAUDE_CODE_GUIDELINES/bin/new-project.sh "C:/Pfad/zum/Projekt" WEB
```

Das Skript legt an: `doc/`, `CLAUDE.md`, `doc/GUIDELINES.md` (leerer Steckbrief
mit Ausfüll-Pflicht) und `WEITERMACHEN_PROMPT.txt`. Die Lesefolge steht im Abschnitt
„Einstieg“ der `CLAUDE.md`. Es überschreibt nichts, was schon da ist.
Der Startprompt der Hub-Seite nennt nur Projekt und Ordner. Ohne Abschnitt „Einstieg“ erzeugt
`project-hub/bin/startprompts.mjs` keinen Prompt und meldet ein PROBLEM (seit 2026-11-08).

## Bestehendes Projekt anbinden

Den Abschnitt „Einstieg“ aus der CLAUDE.md-Vorlage in `bin/new-project.sh` in die `CLAUDE.md` des
Projekts setzen, Pfad und Sprache anpassen. Ein alter Startblock wird dabei gelöscht.
Sitzungen im Projektordner starten, nur dort laden seine Regeln und Hooks.

## Regeln ändern

```bash
# 1. Datei in universal/ bearbeiten
# 2. hochladen:
bash ~/Documents/CLAUDE_CODE_GUIDELINES/bin/push.sh "was geändert wurde"
```

Ab der nächsten Sitzung gilt die Änderung in **allen** Projekten, ohne dass
irgendwo etwas nachgezogen werden muss. Das ist der ganze Punkt.

---

## Herkunft und was ersetzt wurde

| Bisher | Status ab 2026-09-05 |
|---|---|
| `GameLoop2\JAVA_GUIDELINES_UNIVERSAL.md` (Stand 09-04) | **hierher übernommen**, war der aktuellste Stand im Bestand |
| `GameLoop2\Prompt_Handling.txt` (Stand 09-04) | **hierher übernommen**, entjavaisiert |
| `New Project\prompts\` (angelegt 09-05) | durch dieses Repo abgelöst |
| `New Project\GUIDELINES_v2.md`, `SESSION_PROTOCOL.md`, `START_PROMPT.txt` | ältere Generation, bleibt liegen, wird nicht mehr zitiert |
| `<Projekt>\Guidelines\UNIVERSAL_GUIDELINES.md` (3 Fassungen) | **Verweis** (siehe unten) |
| `<Projekt>\Guidelines\Prompt_Handling.txt` (3 Fassungen) | **Verweis** (siehe unten) |
| `<Projekt>\Guidelines\GUIDELINES_v2.md` (2 Fassungen) | Kopfblock „teilweise abgelöst"; Inhalt bleibt, weil dort projekteigene Regeln stehen, die nirgendwo sonst existieren |

### Das Verweis-Muster (seit 2026-09-05)

Eine abgelöste Regeldatei wird **nicht** gelöscht und **nicht** umbenannt.
Stattdessen:

1. Der volle alte Inhalt wandert nach `VERALTET_<Datum>_<Name>` daneben.
2. Der **Originalname bleibt bestehen** und enthält nur noch einen Verweis:
   wohin die geltende Fassung gezogen ist, wo der alte Inhalt liegt, und warum.

Der Grund: Diese Dateien werden in Protokollen, Guidelines und alten Prompts
zitiert. Ein Rename macht jedes dieser Zitate still falsch. Ein Löschen lässt
sie ins Leere laufen. Ein Verweis unter dem alten Namen meldet sich beim
ersten Öffnen selbst und sagt, wohin. Ein toter Verweis ist harmloser als ein
irreführender — ein Verweis, der sagt wohin, ist besser als beide.

**Nicht mit umgezogen und weiterhin projektspezifisch gültig** (sie gehören in
das jeweilige `doc/`, nicht hierher): `EXERCISE_GUIDELINES.md`,
`GRAMMAR_TABLE_PAGE_STANDARD.md`, `VERB_DATA_STANDARD.md`,
`VERSION_AND_CHANGELOG_STANDARD.md`, `FAB_A4_PRINT_STANDARD.md` und die
übrigen `*_STANDARD.md` aus dem German-Projekt.

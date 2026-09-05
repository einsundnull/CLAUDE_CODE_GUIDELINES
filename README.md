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
  JAVA_GUIDELINES_UNIVERSAL.md   §0–§16 + Steckbrief §14, für Java-Projekte
  WEB_GUIDELINES_UNIVERSAL.md    §0–§16 + Steckbrief §14, für HTML/CSS/JS
  Prompt_Handling.txt            Aufgaben-Workflow, Frage-Format, Abschluss-Block
templates/
  Task_TEMPLATE.txt              Kopiervorlage für eine PD (Task_*.txt)
                                 CLAUDE.md, doc/GUIDELINES.md und
                                 WEITERMACHEN_PROMPT.txt stehen bewusst NICHT
                                 hier als Datei — new-project.sh erzeugt sie
                                 mit eingesetztem Pfad. Zwei Vorlagen für
                                 dieselbe Sache würden driften.
bin/
  push.sh                        schreibt Änderungen in dieses Repo (commit + push)
  new-project.sh                 richtet ein NEUES Projekt nach diesem Modell ein
  check-projects.sh              prüft, ob alle Projekte richtig angebunden sind
START_TEMPLATE.txt               der Block, der oben in jede Projekt-Startdatei kommt
PROJECTS.txt                     welches Projekt welche Sprache liest und wo es liegt
```

---

## Neues Projekt anlegen

```bash
bash ~/Documents/CLAUDE_CODE_GUIDELINES/bin/new-project.sh "C:/Pfad/zum/Projekt" WEB
```

Das Skript legt an: `doc/`, `CLAUDE.md`, `doc/GUIDELINES.md` (leerer Steckbrief
mit Ausfüll-Pflicht), `WEITERMACHEN_PROMPT.txt` und `START.txt` mit dem
fertigen Lese-Block. Es überschreibt nichts, was schon da ist.

## Bestehendes Projekt anbinden

Den Block aus `START_TEMPLATE.txt` oben in die Startdatei des Projekts setzen
(`Start nicht löschen.txt` oder wie sie dort heißt), `<SPRACHE>` und
`<PROJEKTPFAD>` ersetzen. Die alte `Lies:`-Liste ersetzen, die Notizen
darunter stehen lassen.

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

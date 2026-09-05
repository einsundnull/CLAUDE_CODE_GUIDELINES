#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# new-project.sh — richtet ein Projekt nach dem Zwei-Ebenen-Modell ein
#
# Aufruf:
#   bash bin/new-project.sh "C:/Pfad/zum/Projekt" WEB
#   bash bin/new-project.sh "C:/Pfad/zum/Projekt" JAVA
#
# Legt an (und ueberschreibt NICHTS, was schon da ist):
#   <Projekt>/doc/
#   <Projekt>/doc/GUIDELINES.md      Steckbrief mit Ausfuell-Pflicht
#   <Projekt>/CLAUDE.md              Anker
#   <Projekt>/WEITERMACHEN_PROMPT.txt
#   <Projekt>/START.txt              der fertige Lese-Block
#
# Die allgemeinen Regeln werden NICHT kopiert. Das Projekt liest sie aus
# diesem Repo. Genau eine Fassung, keine Drift.
# ---------------------------------------------------------------------------
set -u

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_WIN='C:\Users\pc\Documents\CLAUDE_CODE_GUIDELINES'

TARGET="${1:-}"
LANG_KIND="${2:-}"

if [ -z "$TARGET" ] || [ -z "$LANG_KIND" ]; then
  echo "Aufruf: bash bin/new-project.sh \"C:/Pfad/zum/Projekt\" WEB|JAVA"
  exit 1
fi
case "$LANG_KIND" in
  WEB|JAVA) ;;
  *) echo "FEHLER: zweites Argument muss WEB oder JAVA sein."; exit 1 ;;
esac
if [ ! -d "$TARGET" ]; then
  echo "FEHLER: $TARGET existiert nicht."
  exit 1
fi

NAME="$(basename "$TARGET")"
TODAY="$(date +%Y-%m-%d)"
# Windows-Schreibweise des Projektpfads fuer die Prompts
TARGET_WIN="$(echo "$TARGET" | sed 's|/|\\|g')"

mkdir -p "$TARGET/doc"

skip_or_write() {   # $1 = Zieldatei
  if [ -e "$1" ]; then
    echo "  uebersprungen (existiert): $(basename "$1")"
    return 1
  fi
  return 0
}

echo "Richte ein: $NAME  ($LANG_KIND)"

# --- START.txt -------------------------------------------------------------
if skip_or_write "$TARGET/START.txt"; then
cat > "$TARGET/START.txt" <<EOF
LIES IN DIESER REIHENFOLGE — DIE ERSTEN ZWEI SIND DIE QUELLE DER WAHRHEIT:

  1. ${REPO_WIN}\\universal\\${LANG_KIND}_GUIDELINES_UNIVERSAL.md
     Die allgemeinen Regeln. Gelten fuer ALLE Projekte. Ganz lesen.
     Sie werden NUR im Repo CLAUDE_CODE_GUIDELINES geaendert, nie hier.

  2. ${REPO_WIN}\\universal\\Prompt_Handling.txt
     Wie Aufgaben zerlegt, protokolliert und abgeschlossen werden.
     Enthaelt das Frage-/Anweisungs-Format und den Abschluss-Block. Ganz lesen.

  3. ${TARGET_WIN}\\doc\\GUIDELINES.md
     Die Regeln DIESES Projekts. Besetzt die Rollen aus Datei 1 im
     Projekt-Steckbrief und ergaenzt projektspezifische Paragraphen ab §20.
     — NICHT am Stueck lesen. Zuerst nur die Ueberschriften holen
       (grep -n "^## §" ${TARGET_WIN}\\doc\\GUIDELINES.md), dann ausschliesslich
       die Paragraphen, die die Aufgabe beruehrt, plus IMMER den
       Projekt-Steckbrief ganz oben.

  4. ${TARGET_WIN}\\WEITERMACHEN_PROMPT.txt
     Wo wir stehen, welche PD aktiv ist, was offen ist. Ganz lesen.

  5. Die aktive Task_*.txt in ${TARGET_WIN}\\doc\\, die in Datei 4 genannt ist.

REGELN ZU DIESER REIHENFOLGE:
  - Bei Konflikt gewinnt die projektnaehere Regel: 3 schlaegt 1. Eine
    Abweichung von 1 wird in 3 NAMENTLICH begruendet.
  - Dateien 1 und 2 werden NICHT ins Projekt kopiert. Es gibt genau eine
    Fassung, und sie liegt im Repo.
  - Der Lesezugriff auf das Repo ist die EINZIGE erlaubte Ausnahme von der
    Regel "der Arbeitsbereich endet am Projektordner".
EOF
  echo "  angelegt: START.txt"
fi

# --- CLAUDE.md -------------------------------------------------------------
if skip_or_write "$TARGET/CLAUDE.md"; then
cat > "$TARGET/CLAUDE.md" <<EOF
# ${NAME} — Projekt-Anker

Diese Datei wird bei jeder Sitzung automatisch geladen.

## Lesereihenfolge

Siehe \`START.txt\` im Projekt-Root. Kurz:
1. ${REPO_WIN}\\universal\\${LANG_KIND}_GUIDELINES_UNIVERSAL.md
2. ${REPO_WIN}\\universal\\Prompt_Handling.txt
3. \`doc/GUIDELINES.md\` (nur die einschlaegigen §, plus immer den Steckbrief)
4. \`WEITERMACHEN_PROMPT.txt\`
5. die dort genannte aktive \`doc/Task_*.txt\`

Die allgemeinen Regeln liegen NICHT hier. Sie liegen im Repo
CLAUDE_CODE_GUIDELINES und werden nur dort geaendert.

## Was das Projekt ist

<AUSFUELLEN: ein bis drei Saetze>

## Starten

\`\`\`
<AUSFUELLEN: Startbefehl>
\`\`\`

## Pruefen

\`\`\`
<AUSFUELLEN: Pruefstand-Befehl und erwarteter Stand>
\`\`\`

## Wo was liegt

| Ort | Inhalt |
|---|---|
| Projekt-Root | Quellcode, \`CLAUDE.md\`, \`START.txt\`, \`WEITERMACHEN_PROMPT.txt\` |
| \`doc/\` | \`GUIDELINES.md\`, alle \`Task_*.txt\` (PD), alle \`progress_*.txt\`, Mockups |

## Git

<AUSFUELLEN: Repo>. Git und Deploy fuehrt der User aus. Nie selbst pushen.
EOF
  echo "  angelegt: CLAUDE.md"
fi

# --- doc/GUIDELINES.md -----------------------------------------------------
if skip_or_write "$TARGET/doc/GUIDELINES.md"; then
cat > "$TARGET/doc/GUIDELINES.md" <<EOF
# ${NAME} — Projekt-Guidelines (verbindlich)

> **Status: VERBINDLICH ab ${TODAY}.** Erstfassung.
>
> **Zweistufiges Regelwerk:** Die projektneutralen Regeln stehen in
> \`${REPO_WIN}\\universal\\${LANG_KIND}_GUIDELINES_UNIVERSAL.md\` (dort §0–§16).
> Dieses Dokument besetzt deren Rollen (Steckbrief unten) und ergaenzt die
> projektspezifischen Regeln ab §20.
>
> **Zitier-Konvention:** Eine bare Nummer wie "§20" meint DIESES Dokument.
> Eine Regel der neutralen Datei heisst immer "UNIVERSAL §n".
>
> **Leitprinzip (UNIVERSAL §0): Unnoetige Schritte nicht ausfuehren.**
> Risikoklassen: [A] grosses ROI · [B] 100 % sicher · [C] groesseres Risiko.

---

## Projekt-Steckbrief (UNIVERSAL §14)

AUSFUELL-PFLICHT [B]: kein Feld bleibt leer, und kein Feld wird geraten.
Wo eine Rolle noch nicht besetzt ist, steht NICHT "—", sondern
"existiert nicht — Ausloeser: <namentliche Bedingung>".

Die Tabelle mit den passenden Zeilen steht in §14 der UNIVERSAL-Datei.
Sie wird von dort uebernommen und ausgefuellt — nicht aus dem Kopf gebaut.

| Rolle | Projekt-Wert |
|---|---|
| <aus UNIVERSAL §14 uebernehmen> | |

---

## §20 <erste projektspezifische Regel>  [A/B]

Noch keine. Projektspezifische Paragraphen entstehen aus BELEGTEN Befunden,
nicht auf Vorrat: wenn ein Fehler passiert ist, wird die Regel geschrieben,
die ihn beim naechsten Mal verhindert — mit dem Beleg dabei.
EOF
  echo "  angelegt: doc/GUIDELINES.md"
fi

# --- WEITERMACHEN_PROMPT.txt ----------------------------------------------
if skip_or_write "$TARGET/WEITERMACHEN_PROMPT.txt"; then
cat > "$TARGET/WEITERMACHEN_PROMPT.txt" <<EOF
WEITERMACHEN_PROMPT.txt — ${NAME}
$(printf '=%.0s' $(seq 1 $((26 + ${#NAME}))))
Stand: ${TODAY}

LIES IN DIESER REIHENFOLGE
--------------------------
Siehe START.txt im Projekt-Root. Kurz:
1. ${REPO_WIN}\\universal\\${LANG_KIND}_GUIDELINES_UNIVERSAL.md
2. ${REPO_WIN}\\universal\\Prompt_Handling.txt
3. ${TARGET_WIN}\\doc\\GUIDELINES.md  (nur die einschlaegigen §, plus Steckbrief)
4. Diese Datei.
5. Die aktive PD (unten genannt).

AKTIVE PD
---------
Keine. Die naechste groessere Aufgabe bekommt eine
Task_<DateTime>_<Name>.txt in doc\\.

WO WAS LIEGT
------------
Projekt-Root   Quellcode, CLAUDE.md, START.txt, diese Datei
doc\\           GUIDELINES.md, alle Task_*.txt, alle progress_*.txt

MESSWERTE (veralten von selbst — jede Zahl mit Datum)
-----------------------------------------------------
<noch keine>

OFFENE TODOs
------------
1. [B] Projekt-Steckbrief in doc\\GUIDELINES.md ausfuellen.

KONTEXT, DER NACH /clear NOCH GEBRAUCHT WIRD
--------------------------------------------
<noch keiner>
EOF
  echo "  angelegt: WEITERMACHEN_PROMPT.txt"
fi

echo
echo "FERTIG. Naechster Schritt: den Projekt-Steckbrief in doc/GUIDELINES.md"
echo "ausfuellen. Die drei fett gesetzten Zeilen sind Pflichtantworten."
echo
echo "Danach das Projekt in ${REPO_WIN}\\PROJECTS.txt eintragen."

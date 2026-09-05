#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# check-projects.sh — prueft, ob die Projekte richtig angebunden sind
#
# Aufruf:  bash bin/check-projects.sh
#
# Liest PROJECTS.txt und prueft je Projekt:
#   - existiert der Ordner?
#   - gibt es eine Startdatei, die auf CLAUDE_CODE_GUIDELINES zeigt?
#   - gibt es doc/GUIDELINES.md?
#   - ist im Projekt noch eine ALTE Kopie einer allgemeinen Regeldatei?
#     (das ist der Drift-Fall, den dieses Repo abschaffen soll)
#
# Aendert nichts. Meldet nur.
# ---------------------------------------------------------------------------
set -u

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIST="$REPO/PROJECTS.txt"

# Warte-Zeile am Ende, egal ueber welchen Ausgang das Skript endet.
# Regel: universal/Prompt_Handling.txt, "EIN SKRIPT SCHLIESST SICH NICHT SELBST"
. "$REPO/bin/_wait.sh"
trap wait_for_key EXIT

if [ ! -f "$LIST" ]; then
  echo "FEHLER: $LIST fehlt."
  exit 1
fi

PROBLEMS=0

while IFS='|' read -r NAME KIND PATH_WIN; do
  case "$NAME" in ''|'#'*) continue ;; esac
  NAME="$(echo "$NAME" | sed 's/^ *//;s/ *$//')"
  KIND="$(echo "$KIND" | sed 's/^ *//;s/ *$//')"
  PATH_WIN="$(echo "$PATH_WIN" | sed 's/^ *//;s/ *$//')"
  P="$(echo "$PATH_WIN" | sed 's|\\|/|g')"

  echo "=== $NAME  ($KIND)"

  if [ ! -d "$P" ]; then
    echo "    FEHLT: Ordner $P"
    PROBLEMS=$((PROBLEMS+1))
    continue
  fi

  # 1. Startdatei, die auf das Repo zeigt
  # (find + grep statt grep -r --max-depth: das ist eine ripgrep-Option und
  #  scheiterte hier still, was JEDES Projekt faelschlich als "nicht
  #  angebunden" meldete. Gefunden beim ersten Lauf am 2026-09-05.)
  HIT="$(find "$P" -maxdepth 2 -type f \( -name "*.txt" -o -name "*.md" \) \
         -exec grep -l "CLAUDE_CODE_GUIDELINES" {} + 2>/dev/null | head -5)"
  if [ -z "$HIT" ]; then
    echo "    NICHT ANGEBUNDEN: keine Datei zeigt auf CLAUDE_CODE_GUIDELINES"
    PROBLEMS=$((PROBLEMS+1))
  else
    echo "    angebunden ueber:"
    echo "$HIT" | sed "s|$P/|      |"
  fi

  # 2. eigene Projekt-Guidelines (die drei erlaubten Orte)
  if [ -f "$P/doc/GUIDELINES.md" ]; then
    echo "    doc/GUIDELINES.md: da"
  elif [ -f "$P/src/main/doc/GUIDELINES.md" ]; then
    echo "    src/main/doc/GUIDELINES.md: da (abweichender Ort, siehe PROJECTS.txt)"
  elif [ -f "$P/Guidelines/GUIDELINES.md" ]; then
    echo "    Guidelines/GUIDELINES.md: da (abweichender Ort, siehe PROJECTS.txt)"
  else
    echo "    FEHLT: doc/GUIDELINES.md"
    PROBLEMS=$((PROBLEMS+1))
  fi

  # 3. alte Kopien allgemeiner Regeln = Drift-Gefahr
  #    Eine Kopie mit VERALTET-Kopf ist entschaerft und wird nur erwaehnt.
  OLD="$(find "$P" -maxdepth 2 \
        \( -name "UNIVERSAL_GUIDELINES.md" \
        -o -name "GUIDELINES_v2.md" \
        -o -name "Prompt_Handling.txt" \
        -o -name "*_GUIDELINES_UNIVERSAL.md" \) 2>/dev/null)"
  if [ -n "$OLD" ]; then
    echo "    Alte Kopien allgemeiner Regeln im Projekt:"
    echo "$OLD" | while read -r F; do
      # Reihenfolge zaehlt: der Dateiname entscheidet VOR dem Inhalt. Eine
      # Archivdatei traegt den alten Inhalt und damit auch dessen Kopfzeilen -
      # ohne diese Reihenfolge meldet sie sich faelschlich als "Verweis".
      if case "${F##*/}" in VERALTET_*) true ;; *) false ;; esac; then
        echo "      [Archiv]      ${F#$P/}  (alter Inhalt, nur zum Nachschlagen)"
      elif head -5 "$F" | grep -qi "VERALTET"; then
        echo "      [Verweis]     ${F#$P/}  -> zeigt aufs Repo, Inhalt archiviert"
      elif head -5 "$F" | grep -qi "TEILWEISE ABGELOEST"; then
        echo "      [teilweise]   ${F#$P/}  -> Allgemeines abgeloest, Projekteigenes gilt"
      else
        echo "      [OFFEN]       ${F#$P/}  <- zweite Wahrheit, nicht zitieren"
      fi
    done
  fi
  echo
done < "$LIST"

echo "-------------------------------------------------------------"
if [ "$PROBLEMS" -eq 0 ]; then
  echo "Alle gelisteten Projekte sind angebunden."
else
  echo "$PROBLEMS Punkt(e) offen."
fi

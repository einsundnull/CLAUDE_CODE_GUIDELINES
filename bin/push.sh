#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# push.sh — schreibt Aenderungen in das Repo CLAUDE_CODE_GUIDELINES
#
# Aufruf:
#   bash bin/push.sh "kurze Beschreibung, was geaendert wurde"
#   bash bin/push.sh                      -> fragt die Beschreibung ab
#
# Was es tut: zeigt die Aenderungen, fragt nach, committet, pusht.
# Was es NICHT tut: nichts loeschen, nichts erzwingen, kein force-push.
# ---------------------------------------------------------------------------
set -u

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Warte-Zeile am Ende, egal ueber welchen Ausgang das Skript endet.
# Regel: universal/Prompt_Handling.txt, "EIN SKRIPT SCHLIESST SICH NICHT SELBST"
. "$REPO/bin/_wait.sh"
trap wait_for_key EXIT

cd "$REPO" || { echo "FEHLER: Repo-Ordner nicht gefunden."; exit 1; }

if [ ! -d .git ]; then
  echo "FEHLER: $REPO ist kein Git-Repo."
  exit 1
fi

echo "Repo:   $REPO"
echo "Remote: $(git remote get-url origin 2>/dev/null || echo '(keiner)')"
echo

# --- 1. Was hat sich geaendert? -------------------------------------------
if [ -z "$(git status --porcelain)" ]; then
  echo "Nichts geaendert. Es gibt nichts hochzuladen."
  exit 0
fi

echo "Diese Dateien wuerden hochgeladen:"
git status --short
echo

# --- 2. Commit-Text --------------------------------------------------------
MSG="${1:-}"
if [ -z "$MSG" ]; then
  printf "Was wurde geaendert? > "
  read -r MSG
fi
if [ -z "$MSG" ]; then
  echo "ABBRUCH: ohne Beschreibung wird nichts hochgeladen."
  exit 1
fi

# --- 3. Nachfragen ---------------------------------------------------------
printf "Hochladen? [j/N] > "
read -r ANSWER
case "$ANSWER" in
  j|J|y|Y) ;;
  *) echo "Abgebrochen. Nichts passiert."; exit 0 ;;
esac

# --- 4. Schreiben ----------------------------------------------------------
git add -A || exit 1
git commit -m "$MSG" || exit 1

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if git rev-parse --verify "origin/$BRANCH" >/dev/null 2>&1; then
  git push origin "$BRANCH"
else
  echo "Erster Push auf origin/$BRANCH ..."
  git push -u origin "$BRANCH"
fi

STATUS=$?
echo
if [ $STATUS -eq 0 ]; then
  echo "FERTIG. Die Aenderung gilt ab der naechsten Sitzung in ALLEN Projekten,"
  echo "weil die Projekte diese Dateien lesen statt sie zu kopieren."
else
  echo "PUSH FEHLGESCHLAGEN. Der Commit liegt lokal und geht nicht verloren."
  echo "Haeufigster Grund: das Repo auf GitHub existiert noch nicht."
  echo "Dann dort anlegen und danach nochmal: bash bin/push.sh \"$MSG\""
fi
exit $STATUS

#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# _wait.sh — die Warte-Zeile am Ende jedes Skripts.
#
# Regel: universal/Prompt_Handling.txt, Abschnitt
#        "EIN SKRIPT SCHLIESST SICH NICHT SELBST".
#
# Ein Skript, das sein Fenster sofort schliesst, hat seine Ausgabe genauso gut
# nicht geschrieben. Deshalb wartet jedes Skript, das der User startet, auf
# einen Tastendruck - Enter, ESC oder jede andere Taste.
#
# Benutzung im Skript:
#     HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#     . "$HIER/_wait.sh"
#     ...
#     wait_for_key
#     exit $STATUS
#
# Oder, wenn das Skript mehrere Ausgaenge hat, EINMAL oben setzen:
#     trap wait_for_key EXIT
# ---------------------------------------------------------------------------

wait_for_key() {
  # Kein Terminal (Pipe, CI, Aufruf aus einem anderen Skript)? Dann NICHT
  # warten - sonst haengt der Aufruf fuer immer und niemand sieht, warum.
  [ -t 0 ] || return 0

  local text="${1:-Enter oder ESC zum Schliessen.}"
  echo
  printf '%s ' "$text"
  # -n 1  ein einzelner Tastendruck, kein Enter noetig -> ESC funktioniert
  # -s    die Taste wird nicht mit ausgegeben
  # -r    Backslashes werden nicht als Escape gelesen
  read -n 1 -s -r </dev/tty 2>/dev/null || true
  echo
}

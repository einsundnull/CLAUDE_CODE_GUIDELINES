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
#   <Projekt>/.gitattributes         festes Zeilenende
#   <Projekt>/.gitignore             Sperrliste fuer Schluessel, Ort fuer Wegwerf-Skripte
#   <Projekt>/.ignore                haelt Suchen sauber
#   <Projekt>/.vercelignore          nur WEB: interne Dateien gehen nicht online
#
# Die allgemeinen Regeln werden NICHT kopiert. Das Projekt liest sie aus
# diesem Repo. Genau eine Fassung, keine Drift.
# ---------------------------------------------------------------------------
set -u

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_WIN='C:\Users\pc\Documents\CLAUDE_CODE_GUIDELINES'

# Warte-Zeile am Ende, egal ueber welchen Ausgang das Skript endet.
# Regel: universal/Prompt_Handling.txt, "EIN SKRIPT SCHLIESST SICH NICHT SELBST"
. "$REPO/bin/_wait.sh"
trap wait_for_key EXIT

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

# --- Ordnung ab dem ersten Commit (UNIVERSAL §8, §15; Prompt_Handling SCHLUESSEL) ---
if skip_or_write "$TARGET/.gitattributes"; then
cat > "$TARGET/.gitattributes" <<'EOF'
# Festes Zeilenende ab dem ersten Commit.
* text=auto eol=lf
*.bat text eol=crlf
*.cmd text eol=crlf
*.ps1 text eol=crlf
EOF
  echo "  angelegt: .gitattributes"
fi
if skip_or_write "$TARGET/.gitignore"; then
cat > "$TARGET/.gitignore" <<'EOF'
# Wegwerf-Skripte und Messungen haben genau diesen einen Ort.
tools/_tmp/
__pycache__/
node_modules/

# Sperrliste: Schluessel liegen nie im Repo, auch nicht unter anderem Namen.
*[Aa][Pp][Ii][ -_][Kk][Ee][Yy]*
*[Rr]ecovery*[Cc]ode*
*[Cc]redential*
*[Ss]ecret*
*.pem
*.key
*.p12
*.pfx
.env
.env.*
EOF
  echo "  angelegt: .gitignore"
fi
if skip_or_write "$TARGET/.ignore"; then
cat > "$TARGET/.ignore" <<'EOF'
# Suchen ueberspringen das; die Ordner bleiben unberuehrt.
tools/_tmp/
graphify-out/
doc/archive_*/
EOF
  echo "  angelegt: .ignore"
fi
if [ "$LANG_KIND" = "WEB" ] && skip_or_write "$TARGET/.vercelignore"; then
cat > "$TARGET/.vercelignore" <<'EOF'
# Online liegt nur, was die Seite braucht. Danach Abrufprobe: diese Dateien liefern online 404.
/CLAUDE.md
/WEITERMACHEN_PROMPT.txt
/.ignore
/.vercelignore
/doc
/tools
/bin
/test
/graphify-out
EOF
  echo "  angelegt: .vercelignore"
fi

# --- CLAUDE.md -------------------------------------------------------------
if skip_or_write "$TARGET/CLAUDE.md"; then
cat > "$TARGET/CLAUDE.md" <<EOF
# ${NAME} — Projekt-Anker

Diese Datei wird bei jeder Sitzung automatisch geladen.

## Einstieg

"weiter" oder neue Sitzung: \`WEITERMACHEN_PROMPT.txt\` ganz lesen, dann die dort genannte aktive \`doc/Task_*.txt\`.
Vor Code-Aenderungen den Steckbrief in \`doc/GUIDELINES.md\`. Regeln nur abschnittsweise: \`grep -n "^## " <Datei>\`, Betroffenes lesen.
Allgemeine Regeln: ${REPO_WIN}\\universal\\${LANG_KIND}_GUIDELINES_UNIVERSAL.md (nur im Repo geaendert, nie kopiert).
Bei Konflikt gewinnt das Projekt, namentlich begruendet in \`doc/GUIDELINES.md\`.

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
| Projekt-Root | Quellcode, \`CLAUDE.md\`, \`WEITERMACHEN_PROMPT.txt\` |
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
> \`${REPO_WIN}\\universal\\${LANG_KIND}_GUIDELINES_UNIVERSAL.md\`.
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
Dazu die Leistungs-Zeilen aus ${REPO_WIN}\\universal\\PERFORMANCE_UNIVERSAL.md §P8
(Programm-Art, Ziel-Geraete, Budget, Messung) — VOR der ersten Zeile Code.

| Rolle | Projekt-Wert |
|---|---|
| <aus UNIVERSAL §14 uebernehmen> | |
| Programm-Art (LEISTUNG §P1) | |
| Ziel-Geraete + Referenzgeraet (LEISTUNG §P1) | |
| Performance-Budget (LEISTUNG §P2) | |
| Mess-Anzeige + Schalter (LEISTUNG §P4.1) | |
| Headless-Messung: Befehl + schwerste Szene (LEISTUNG §P4.2) | |
| Grundlinie: Zahl + Datum (LEISTUNG §P5) | |
| Letzte Pruefung: Datum + Ergebnis (LEISTUNG §P5) | |

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

AKTIVE PD
---------
Keine. Die naechste groessere Aufgabe bekommt eine
Task_<DateTime>_<Name>.txt in doc\\.

WO WAS LIEGT
------------
Projekt-Root   Quellcode, CLAUDE.md, diese Datei
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
echo "Dann in project-hub/projects.json eine Karte anlegen (mit startPrompt) und dort"
echo "node bin/startprompts.mjs --schreiben ausfuehren: das erzeugt den Startprompt."

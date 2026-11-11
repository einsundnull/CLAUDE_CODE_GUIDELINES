// SessionStart-Hook (eingetragen in ~/.claude/settings.json): warnt, wenn die Sitzung oberhalb eines Projektordners startet.
// Grund: Die CLAUDE.md und die Sperren des Projekts laden nur beim Start im Projektordner; eine Sitzung im Benutzerordner
// bekam sie erst am Ende der Arbeit (WingsOfFury 2026-11-06).
// Die Projektorte stehen im Register project-hub/projects.json (eine Quelle). Fehlt es, zählt nur der Benutzerordner.
// Tut NICHT: den Start verhindern oder den Ordner wechseln. Ein Fehler bleibt still, eine Warnung darf keine Sitzung stören.
import { readFileSync, statfsSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, sep } from 'node:path';

const REGISTER = 'C:/Users/pc/Documents/Phoenix Code/project-hub/projects.json';
const norm = (p) => resolve(p).toLowerCase();

/** Rolle: true, wenn der Ordner der Benutzerordner oder ein Ordner oberhalb eines Projekts ist. */
export function outsideProject(cwd, projectPaths, home) {
  const here = norm(cwd);
  if (here === norm(home)) return true;
  return projectPaths.some((p) => norm(p).startsWith(here + sep));
}

function projectPaths() {
  try { return JSON.parse(readFileSync(REGISTER, 'utf8')).projects.map((p) => p.localPath).filter(Boolean); } catch { return []; }
}

// Zweite Warnung (2026-11-11, AUFRAEUMEN_UNIVERSAL.md §A0 Regel 9): weniger als MIN_FREE_GB frei auf dem Laufwerk der Sitzung.
const MIN_FREE_GB = 20;

/** Rolle: freier Platz in GB auf dem Laufwerk von cwd, oder null, wenn nicht messbar. */
export function freeGb(cwd) {
  try { const s = statfsSync(cwd); return (s.bavail * s.bsize) / 1024 ** 3; } catch { return null; }
}

try {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const cwd = input.cwd || process.cwd();
  const shown = [];
  const context = [];
  if (outsideProject(cwd, projectPaths(), homedir())) {
    shown.push(`Diese Sitzung läuft außerhalb eines Projekts (${cwd}). Regeln und Sperren eines Projekts gelten nur beim Start in seinem Ordner.`);
    context.push('Die Sitzung läuft außerhalb eines Projektordners. Betrifft die Aufgabe ein Projekt: zuerst seine CLAUDE.md mit dem Read-Werkzeug lesen und dem User sagen, dass die Hooks dieses Projekts in dieser Sitzung nicht laufen.');
  }
  const free = freeGb(cwd);
  if (free !== null && free < MIN_FREE_GB) {
    shown.push(`Nur noch ${free.toFixed(1)} GB frei (Grenze ${MIN_FREE_GB} GB). Aufräumen: „Laptop aufräumen“ tippen.`);
    context.push(`Auf dem Laufwerk sind nur ${free.toFixed(1)} GB frei. Dem User einmal das Aufräumen vorschlagen (Skill laptop-aufraeumen), dann seine Aufgabe bearbeiten.`);
  }
  if (shown.length) {
    console.log(JSON.stringify({
      systemMessage: shown.join(' '),
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context.join(' ') },
    }));
  }
} catch { /* siehe Kopf */ }

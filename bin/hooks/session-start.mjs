// SessionStart-Hook (eingetragen in ~/.claude/settings.json): warnt, wenn die Sitzung oberhalb eines Projektordners startet.
// Grund: Die CLAUDE.md und die Sperren des Projekts laden nur beim Start im Projektordner; eine Sitzung im Benutzerordner
// bekam sie erst am Ende der Arbeit (WingsOfFury 2026-11-06).
// Die Projektorte stehen im Register project-hub/projects.json (eine Quelle). Fehlt es, zählt nur der Benutzerordner.
// Tut NICHT: den Start verhindern oder den Ordner wechseln. Ein Fehler bleibt still, eine Warnung darf keine Sitzung stören.
import { readFileSync } from 'node:fs';
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

try {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const cwd = input.cwd || process.cwd();
  if (outsideProject(cwd, projectPaths(), homedir())) {
    console.log(JSON.stringify({
      systemMessage: `Diese Sitzung läuft außerhalb eines Projekts (${cwd}). Regeln und Sperren eines Projekts gelten nur beim Start in seinem Ordner.`,
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: 'Die Sitzung läuft außerhalb eines Projektordners. Betrifft die Aufgabe ein Projekt: zuerst seine CLAUDE.md mit dem Read-Werkzeug lesen und dem User sagen, dass die Hooks dieses Projekts in dieser Sitzung nicht laufen.',
      },
    }));
  }
} catch { /* siehe Kopf */ }

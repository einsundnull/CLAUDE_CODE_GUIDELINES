// hook-eintragen.mjs — trägt den Start-Hook bin/hooks/session-start.mjs in die settings.json aller Claude-Konten ein.
// Grund: Claude darf ~/.claude/settings.json nicht selbst ändern (Sicherheitsprüfer), der User startet dieses Skript.
// Aufruf:  node "C:/Users/pc/Documents/CLAUDE_CODE_GUIDELINES/bin/hook-eintragen.mjs"            -> Trockenlauf
//          node "C:/Users/pc/Documents/CLAUDE_CODE_GUIDELINES/bin/hook-eintragen.mjs" --schreiben -> eintragen
// Tut: je Datei eine Sicherung settings.json.vor-hook-<Datum> anlegen, dann nur den Eintrag hooks.SessionStart ergänzen.
// Tut NICHT: andere Einstellungen ändern, einen schon vorhandenen Eintrag doppeln.
// Erster Parameter darf ein anderer Benutzerordner sein (nur für die Prüfung an einer Kopie).
import { readFileSync, writeFileSync, readdirSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const write = process.argv.includes('--schreiben');
const home = process.argv.slice(2).find((a) => !a.startsWith('--')) || homedir();
const HOOK = 'node "C:/Users/pc/Documents/CLAUDE_CODE_GUIDELINES/bin/hooks/session-start.mjs"';
const stamp = new Date().toISOString().slice(0, 10);

const dirs = readdirSync(home).filter((d) => /^\.claude(-konto\d+)?$/.test(d));
let changed = 0;
for (const d of dirs) {
  const file = join(home, d, 'settings.json');
  if (!existsSync(file)) { console.log(`fehlt     ${file}`); continue; }
  const raw = readFileSync(file, 'utf8');
  let cfg;
  try { cfg = JSON.parse(raw); } catch (e) { console.log(`FEHLER    ${file}: kein gültiges JSON, nichts geändert`); continue; }
  const list = (cfg.hooks && cfg.hooks.SessionStart) || [];
  if (JSON.stringify(list).includes('session-start.mjs')) { console.log(`schon da  ${file}`); continue; }
  cfg.hooks = cfg.hooks || {};
  cfg.hooks.SessionStart = [...list, { hooks: [{ type: 'command', command: HOOK }] }];
  changed++;
  if (!write) { console.log(`würde eintragen  ${file}`); continue; }
  copyFileSync(file, `${file}.vor-hook-${stamp}`);
  writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n');
  console.log(`eingetragen  ${file}  (Sicherung .vor-hook-${stamp})`);
}
console.log(write ? `Fertig: ${changed} Datei(en). Gilt ab der nächsten Sitzung.` : `Trockenlauf: ${changed} Datei(en) würden geändert. Eintragen mit --schreiben.`);

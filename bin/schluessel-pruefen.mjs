#!/usr/bin/env node
/**
 * ============================================================================
 * bin/schluessel-pruefen.mjs — Schlüssel auf diesem Rechner finden und vergleichen
 * ============================================================================
 * Start: Doppelklick auf bin\schluessel-pruefen.bat (oder: node bin/schluessel-pruefen.mjs).
 *   Startet einen eigenen Server NUR auf 127.0.0.1 (zufälliger Port, geheimes Zugangswort in der Adresse)
 *   und öffnet den Browser. Taste im Fenster, Knopf „Beenden“ oder 2 Minuten ohne offene Seite → Ende.
 *
 * Was die Seite kann:
 *   1. Durchsuchen: die Projekte aus PROJECTS.txt (anklickbar), Schluessel-privat, Downloads, Desktop,
 *      gcloud, weitere Ordner. Zeigt je Schlüssel: Art, Name, gekürzten Wert, Fingerabdruck, Datei,
 *      ob der Name im Code des Projekts vorkommt. Voller Wert nur nach Klick auf „Zeigen“.
 *   2. Vergleichen: bekannte Schlüssel einfügen (voll, gekürzt wie „sk_live_…4f2a“ oder nur die
 *      Schlüssel-ID aus der Google-Konsole) → je Zeile: gefunden wo / Teiltreffer / nicht auf diesem Rechner.
 *
 * Sicher zum Hochladen: Die Datei enthält keinen Schlüssel. Werte bleiben im Speicher des laufenden
 *   Programms; nichts wird auf die Platte geschrieben, nichts ins Terminal, nichts ins Netz.
 * Schutz des Servers: nur 127.0.0.1, Host-Prüfung (gegen DNS-Rebinding), Zugangswort bei jeder Anfrage,
 *   nur JSON-POST (keine Formular-Angriffe fremder Seiten), CSP mit Nonce.
 * Tut NICHT: Schlüssel ändern, löschen, senden; .odt/.docx/.pdf öffnen (nur aufgelistet);
 *   prüfen, was beim Anbieter (Firebase, Vercel, GitHub) hinterlegt ist.
 * Herkunft: myLangSite, Task_2026-11-18_OWASP-Saga-Restbereiche [1.1/11].
 * Regel: universal/Prompt_Handling.txt „SCHLÜSSEL UND SPERRLISTE“.
 * ============================================================================
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOME = os.homedir();
const TOKEN = crypto.randomBytes(24).toString('hex');
const MAX_BYTES = 256 * 1024;
const CODE_MAX_BYTES = 1024 * 1024;
const IDLE_MS = 2 * 60 * 1000;
const SKIP_DIR = /^(node_modules|\.git|\.svn|graphify-out|\.cache|\.next|dist|build|target|\.gradle|\.idea|AppData|\$Recycle\.Bin|bower_components|vendor)$/i;
const SECRET_DIR = /^(key|keys|jaas|geheim|secret|secrets|credentials|private-keys|Schluessel-privat)$/i;
const CODE_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.java', '.kt', '.html', '.yml', '.yaml', '.json', '.sh', '.ps1', '.bat', '.rules', '.toml', '.gradle', '.xml']);

// ---------------------------------------------------------------- Erkennen
function fp(v) { return crypto.createHash('sha256').update(String(v)).digest('hex').slice(0, 8); }
function pemFp(pem) {
    try {
        const pub = crypto.createPublicKey(pem);
        return 'öff. ' + crypto.createHash('sha256').update(pub.export({ type: 'spki', format: 'der' })).digest('hex').slice(0, 8);
    } catch (e) { return null; }
}
function mask(v) {
    v = String(v);
    if (v.includes('KEY-----')) return `(PEM, ${v.length} Zeichen)`;
    if (v.length > 400) return `(lang, ${v.length} Zeichen)`;
    if (v.length < 16) return `(${v.length} Zeichen)`;
    return `${v.slice(0, 6)}…${v.slice(-4)} (${v.length} Zeichen)`;
}
function kind(name, v) {
    const n = String(name || '').toUpperCase();
    const pre = [['sk_live_', 'Stripe Geheimschlüssel LIVE'], ['sk_test_', 'Stripe Geheimschlüssel TEST'],
        ['rk_live_', 'Stripe eingeschränkt LIVE'], ['rk_test_', 'Stripe eingeschränkt TEST'],
        ['pk_live_', 'Stripe öffentlich LIVE (kein Geheimnis)'], ['pk_test_', 'Stripe öffentlich TEST (kein Geheimnis)'],
        ['whsec_', 'Stripe Webhook-Geheimnis'], ['price_', 'Stripe Preis-Kennung (kein Geheimnis)'],
        ['GOCSPX-', 'Google OAuth Client-Geheimnis'], ['AIza', 'Google/Firebase Web-Schlüssel (öffentlich gedacht, kein Geheimnis)'],
        ['0x4', 'Cloudflare Turnstile'], ['vpaas-magic-cookie-', 'JaaS (Jitsi) Kennung'], ['ghp_', 'GitHub Token'],
        ['github_pat_', 'GitHub Token'], ['xox', 'Slack Token'], ['sk-ant-', 'Anthropic API-Schlüssel'], ['sk-', 'API-Schlüssel (sk-)'],
        ['eyJ', 'JWT/Token']];
    for (const [p, k] of pre) if (v.startsWith(p)) return k;
    if (v.includes('PRIVATE KEY-----')) return 'Privater Schlüssel (PEM)';
    if (v.includes('PUBLIC KEY-----')) return 'Öffentlicher Schlüssel (PEM, kein Geheimnis)';
    for (const w of ['MAILGUN', 'VERCEL', 'JAAS', 'TURNSTILE', 'IMGBB', 'STRIPE', 'PAYPAL', 'WISE', 'GOOGLE', 'FIREBASE', 'OPENAI', 'ANTHROPIC']) {
        if (n.includes(w)) return w.charAt(0) + w.slice(1).toLowerCase();
    }
    return 'unbekannt';
}
function isPlain(name, v, art) {
    return /(_DOMAIN|_FROM|_REGION|_PRICE_ID|_APP_ID|_KEY_ID|_URL|_HOST|_PORT|_MODE|_ENV)$/i.test(String(name || '')) || art.includes('kein Geheimnis');
}

// ---------------------------------------------------------------- Durchsuchen
let funde = [];      // { id, ort, projekt, name, art, wert, hinweis, fp, keyId, codeTreffer }
let dateien = [];    // { ort, hinweis }
let gelesen = 0;
let projekte = [];   // { name, pfad }
const codeCache = new Map();   // projektPfad → [{ datei, text }]

function readSmall(file, max = MAX_BYTES) {
    try {
        const st = fs.statSync(file);
        if (!st.isFile() || st.size > max) return null;
        gelesen++;
        return fs.readFileSync(file, 'utf8');
    } catch (e) { return null; }
}
function projektVon(file) {
    let best = null;
    for (const p of projekte) {
        const r = path.relative(p.pfad, file);
        if (r && !r.startsWith('..') && !path.isAbsolute(r) && (!best || p.pfad.length > best.pfad.length)) best = p;
    }
    return best;
}
function add(ort, name, wert, hinweis, keyId) {
    let v = String(wert).trim().replace(/^["']|["']$/g, '');
    if (!v) return;
    let art = kind(name, v);
    let f = fp(v);
    let extra = hinweis || '';
    if (/_B64$/i.test(name || '')) {
        try {
            const dec = Buffer.from(v, 'base64').toString('utf8');
            if (dec.includes('PRIVATE KEY-----')) { const p = pemFp(dec); if (p) f = p; art = 'Privater Schlüssel (PEM, Base64)'; }
        } catch (e) { /* bleibt */ }
    } else if (v.includes('KEY-----')) { const p = pemFp(v); if (p) f = p; }
    if (isPlain(name, v, art)) extra = (extra ? extra + ' · ' : '') + 'kein Geheimnis';
    const pr = projektVon(ort);
    funde.push({ id: funde.length, ort, projekt: pr ? pr.name : '', name: name || '', art, wert: v, hinweis: extra, fp: f, keyId: keyId || '', codeTreffer: null });
}
function scanEnv(file) {
    const t = readSmall(file); if (t == null) return;
    for (const line of t.split(/\r?\n/)) {
        if (line.trim().startsWith('#')) continue;
        const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (m) add(file, m[1], m[2]);
    }
}
function scanJson(file, nurDienstkonto) {
    const t = readSmall(file); if (t == null) return false;
    if (nurDienstkonto && !t.includes('service_account') && !t.includes('authorized_user')) return false;
    let j; try { j = JSON.parse(t); } catch (e) { return false; }
    if (j && j.type === 'service_account') {
        add(file, 'Dienstkonto ' + (j.client_email || '?'), j.private_key || '', `Projekt ${j.project_id || '?'}`, j.private_key_id || '');
        return true;
    }
    if (j && j.type === 'authorized_user') {
        add(file, 'gcloud-Anmeldung (Benutzer, kein Dienstkonto)', j.refresh_token || '', 'Client ' + (j.client_id || '?'));
        return true;
    }
    if (nurDienstkonto) return false;
    const c = j && (j.web || j.installed);
    if (c && c.client_secret) { add(file, 'Google OAuth client_secret', c.client_secret, 'Client ' + c.client_id); return true; }
    return false;
}
function scanText(file) {
    const t = readSmall(file); if (t == null) { dateien.push({ ort: file, hinweis: 'zu groß oder nicht lesbar' }); return; }
    const vorher = funde.length;
    const pems = t.match(/-----BEGIN [A-Z ]+-----[\s\S]+?-----END [A-Z ]+-----/g) || [];
    pems.forEach((p, i) => add(file, `PEM-Block ${i + 1}`, p));
    const rest = pems.reduce((s, p) => s.replace(p, ''), t);
    for (const line of rest.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_ ]{0,40})\s*[=:]\s*(\S{12,})\s*$/);
        if (m) { add(file, m[1].trim(), m[2]); continue; }
        for (const tok of line.match(/[A-Za-z0-9_\-.+/=]{24,}/g) || []) add(file, '(Text)', tok);
    }
    if (funde.length === vorher) dateien.push({ ort: file, hinweis: 'nichts Schlüsselartiges erkannt' });
}
/** Rolle: eine Datei, die als Schlüsselort gilt, nach Art auswerten. */
function scanFile(file) {
    const base = path.basename(file).toLowerCase();
    const ext = path.extname(file).toLowerCase();
    if (base.startsWith('.env')) {
        if (/\.(example|sample|template|dist)$/.test(base)) return;
        return scanEnv(file);
    }
    if (ext === '.json') { if (!scanJson(file, false)) dateien.push({ ort: file, hinweis: 'JSON ohne erkannte Schlüssel' }); return; }
    if (['.odt', '.docx', '.doc', '.pdf', '.p12', '.pfx', '.jks', '.keystore'].includes(ext)) { dateien.push({ ort: file, hinweis: 'Dokument/Binärdatei — bitte selbst öffnen' }); return; }
    if (['.png', '.jpg', '.jpeg', '.gif', '.zip', '.exe'].includes(ext)) return;
    return scanText(file);
}
/** Rolle: Datei im Projekt — nur typische Schlüsselorte, Rest nur Dienstkonto-JSON. */
function scanProjektDatei(file, inSecretDir) {
    const base = path.basename(file).toLowerCase();
    const ext = path.extname(file).toLowerCase();
    if (inSecretDir || base.startsWith('.env') || ['.pem', '.pk', '.key', '.p8', '.pub', '.p12', '.pfx', '.jks', '.keystore'].includes(ext)
        || /^(client_secret.*|.*adminsdk.*|serviceaccount.*|credentials.*|.*-key)\.json$/.test(base)) return scanFile(file);
    if (ext === '.json' && base !== 'package.json' && base !== 'package-lock.json') scanJson(file, true);
}
function walk(dir, fn, tiefe, inSecret) {
    if (tiefe < 0) return;
    let list; try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const d of list) {
        const p = path.join(dir, d.name);
        if (d.isDirectory()) {
            if (SKIP_DIR.test(d.name)) continue;
            walk(p, fn, tiefe - 1, inSecret || SECRET_DIR.test(d.name));
        } else if (d.isFile()) fn(p, inSecret);
    }
}
function ladeProjekte() {
    const out = [];
    const t = readSmall(path.join(REPO, 'PROJECTS.txt')) || '';
    for (const line of t.split(/\r?\n/)) {
        if (!line.trim() || line.trim().startsWith('#')) continue;
        const parts = line.split('|').map((s) => s.trim());
        if (parts.length >= 3 && parts[2]) out.push({ name: parts[0], pfad: parts[2] });
    }
    return out;
}
function standardOrte() {
    return [
        { id: 'privat', name: 'Schluessel-privat (Dokumente)', pfad: path.join(HOME, 'Documents', 'Schluessel-privat'), art: 'alles' },
        { id: 'downloads', name: 'Downloads (nur Dienstkonto-/.env-Dateien)', pfad: path.join(HOME, 'Downloads'), art: 'download' },
        { id: 'desktop', name: 'Desktop (nur Dienstkonto-/.env-Dateien)', pfad: path.join(HOME, 'Desktop'), art: 'download' },
        { id: 'gcloud', name: 'gcloud-Anmeldung (%APPDATA%\\gcloud)', pfad: path.join(process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming'), 'gcloud'), art: 'download' },
    ];
}
function durchsuchen(auswahl) {
    funde = []; dateien = []; gelesen = 0; codeCache.clear();
    projekte = ladeProjekte();
    const gewaehlt = projekte.filter((p) => (auswahl.projekte || []).includes(p.name));
    for (const extra of (auswahl.ordner || [])) {
        if (extra && fs.existsSync(extra)) gewaehlt.push({ name: path.basename(extra), pfad: path.resolve(extra) });
    }
    projekte = gewaehlt.concat(projekte.filter((p) => !gewaehlt.includes(p)));
    for (const p of gewaehlt) walk(p.pfad, scanProjektDatei, 10, false);
    for (const o of standardOrte()) {
        if (!(auswahl.orte || []).includes(o.id)) continue;
        if (o.art === 'alles') walk(o.pfad, (f) => scanFile(f), 5, true);
        else walk(o.pfad, (f) => {
            const b = path.basename(f).toLowerCase();
            if (b.startsWith('.env')) scanFile(f); else if (b.endsWith('.json')) scanJson(f, true);
        }, o.id === 'gcloud' ? 2 : 4, false);
    }
    // Dubletten derselben Datei (z. B. Projekt-Ordner doppelt gewählt) entfernen.
    const seen = new Set();
    funde = funde.filter((x) => { const k = x.ort + '|' + x.name + '|' + x.fp; if (seen.has(k)) return false; seen.add(k); return true; });
    funde.forEach((x, i) => { x.id = i; });
    for (const x of funde) x.codeTreffer = codeTreffer(x);
}

// ---------------------------------------------------------------- Im Code benutzt?
function codeDateien(pfad) {
    if (codeCache.has(pfad)) return codeCache.get(pfad);
    const list = [];
    walk(pfad, (f, inSecret) => {
        if (inSecret) return;
        const base = path.basename(f).toLowerCase();
        if (base.startsWith('.env') || base === 'package-lock.json') return;
        if (!CODE_EXT.has(path.extname(f).toLowerCase())) return;
        const t = readSmall(f, CODE_MAX_BYTES);
        if (t != null) list.push({ datei: path.relative(pfad, f), text: t });
    }, 12, false);
    codeCache.set(pfad, list);
    return list;
}
/** Rolle: in wie vielen Code-Dateien des Projekts kommt der Name (Variable) vor? null = nicht prüfbar. */
function codeTreffer(x) {
    const pr = projekte.find((p) => p.name === x.projekt);
    if (!pr) return null;
    let suche = null;
    if (/^[A-Z][A-Z0-9_]{3,}$/.test(x.name)) suche = [x.name];
    else if (x.name.startsWith('Dienstkonto')) suche = [path.basename(x.ort), 'GOOGLE_APPLICATION_CREDENTIALS', 'adminsdk'];
    else if (x.name === 'Google OAuth client_secret') suche = [path.basename(x.ort), 'client_secret'];
    else if (/\.(pk|pem|key|p8)$/i.test(x.ort)) suche = [path.basename(x.ort)];
    if (!suche) return null;
    const files = codeDateien(pr.pfad).filter((c) => suche.some((s) => c.text.includes(s))).map((c) => c.datei);
    return { suche, files: files.slice(0, 12), anzahl: files.length };
}

// ---------------------------------------------------------------- Vergleichen
const MASK_RE = /…|\.{3,}|\*{2,}|•+|x{4,}|X{4,}/;
function vergleiche(text) {
    // Ganze PEM-Blöcke zählen als EIN Eintrag (sie gehen über viele Zeilen).
    let rest = String(text || '');
    const pems = rest.match(/-----BEGIN [A-Z ]+-----[\s\S]+?-----END [A-Z ]+-----/g) || [];
    pems.forEach((p) => { rest = rest.replace(p, ''); });
    const zeilen = pems.concat(rest.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)).slice(0, 200);
    return zeilen.map((ein) => {
        const anzeige = MASK_RE.test(ein) && ein.length <= 80 ? ein : mask(ein);
        let treffer = [];
        let wie = '';
        const pem = ein.includes('KEY-----') ? pemFp(ein) : null;
        if (pem) { treffer = funde.filter((x) => x.fp === pem); wie = 'gleicher Schlüssel (öffentlicher Teil)'; }
        if (!treffer.length) { treffer = funde.filter((x) => x.wert === ein); if (treffer.length) wie = 'genau gleich'; }
        if (!treffer.length) {
            const id = ein.toLowerCase();
            treffer = funde.filter((x) => x.keyId && x.keyId.toLowerCase() === id);
            if (treffer.length) wie = 'Schlüssel-ID des Dienstkontos';
        }
        if (!treffer.length && MASK_RE.test(ein)) {
            const teile = ein.split(MASK_RE).map((s) => s.trim());
            const vorn = teile[0] || ''; const hinten = teile[teile.length - 1] || '';
            if (vorn.length + hinten.length >= 4) {
                treffer = funde.filter((x) => x.wert.startsWith(vorn) && x.wert.endsWith(hinten) && x.wert.length > vorn.length + hinten.length);
                if (treffer.length) wie = `Anfang „${vorn}“ und Ende „${hinten}“ passen (gekürzte Angabe)`;
            }
        }
        if (!treffer.length && ein.length >= 8) {
            treffer = funde.filter((x) => (x.wert.includes(ein)) || (x.keyId && x.keyId.toLowerCase().startsWith(ein.toLowerCase())));
            if (treffer.length) wie = 'Teiltreffer (eingegebener Text steckt im Schlüssel)';
        }
        return {
            eingabe: anzeige,
            wie,
            treffer: treffer.slice(0, 20).map((x) => ({ id: x.id, projekt: x.projekt, name: x.name, art: x.art, ort: x.ort, code: x.codeTreffer })),
        };
    });
}

// ---------------------------------------------------------------- Seite
function seite(nonce) {
    return `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Schlüssel prüfen</title>
<style nonce="${nonce}">
:root{--bg:#f6f6f3;--fg:#1d1d1b;--muted:#68685f;--line:#dcdcd4;--card:#fff;--acc:#245c9e;--ok:#1f7a3a;--warn:#a3341f;--dup:#fff1bf;--field:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#151514;--fg:#ececea;--muted:#a2a29a;--line:#34342f;--card:#1f1f1d;--acc:#7fb0ea;--ok:#6fd08c;--warn:#ff9a85;--dup:#4b3e05;--field:#262624}}
*{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:1280px;margin:0 auto;padding:16px}
h1{font-size:20px;margin:0 0 2px} h2{font-size:16px;margin:0 0 8px} p.sub{margin:0 0 14px;color:var(--muted)}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;margin:0 0 14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:6px 14px;margin:0 0 10px}
label.chk{display:flex;gap:8px;align-items:flex-start} label.chk small{display:block;color:var(--muted);word-break:break-all}
textarea{width:100%;min-height:84px;padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--field);color:var(--fg);font:13px/1.4 ui-monospace,Consolas,monospace;resize:vertical}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:10px}
button{font:inherit;padding:7px 14px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer}
button.pri{background:var(--acc);border-color:var(--acc);color:#fff} button:disabled{opacity:.55;cursor:default}
button.sm{padding:2px 9px;font-size:12px}
.status{color:var(--muted)}
.wrap{overflow-x:auto} table{border-collapse:collapse;width:100%}
th,td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
th{font-size:12px;color:var(--muted);font-weight:600} tr.plain td{color:var(--muted)}
td.ort{font-size:12px;word-break:break-all;min-width:220px} code{font:12px ui-monospace,Consolas,monospace}
code.dup{background:var(--dup);padding:0 3px;border-radius:3px}
pre.val{white-space:pre-wrap;word-break:break-all;margin:6px 0 0;font-size:12px;max-width:520px}
.ok{color:var(--ok);font-weight:600} .no{color:var(--warn);font-weight:600} .muted{color:var(--muted)}
ul.res{list-style:none;margin:0;padding:0} ul.res>li{border-bottom:1px solid var(--line);padding:8px 0}
ul.res ul{margin:4px 0 0 18px;padding:0}
</style></head><body><main>
<h1>Schlüssel prüfen</h1>
<p class="sub">Läuft nur auf diesem Rechner (127.0.0.1). Werte bleiben im Speicher des Programms und werden nirgends gespeichert.</p>

<section class="card"><h2>1. Wo suchen?</h2>
<div class="grid" id="orte"></div>
<label for="ordner" class="muted">Weitere Ordner (je Zeile ein Pfad)</label>
<textarea id="ordner" spellcheck="false"></textarea>
<div class="row"><button class="pri" id="los" type="button">Durchsuchen</button><span class="status" id="st1"></span></div>
</section>

<section class="card"><h2>2. Bekannte Schlüssel vergleichen</h2>
<p class="muted">Je Zeile ein Schlüssel: voll, gekürzt wie auf der Website (z. B. <code>sk_live_…4f2a</code>) oder die Schlüssel-ID aus der Google-Konsole. Das Feld wird nicht gespeichert.</p>
<textarea id="eingabe" spellcheck="false" autocomplete="off"></textarea>
<div class="row"><button class="pri" id="suchen" type="button" disabled>Suchen</button><span class="status" id="st2">Erst durchsuchen.</span></div>
<ul class="res" id="ergebnis"></ul>
</section>

<section class="card"><h2>3. Gefundene Schlüssel</h2>
<div class="wrap"><table><thead><tr><th>Art</th><th>Name</th><th>Wert</th><th>Fingerabdruck</th><th>Im Code</th><th>Projekt / Datei</th></tr></thead>
<tbody id="tab"><tr><td colspan="6" class="muted">Noch nicht durchsucht.</td></tr></tbody></table></div>
<div id="weitere"></div>
</section>

<div class="row"><button id="ende" type="button">Beenden</button><span class="status">Fingerabdruck: gleiche 8 Zeichen = gleicher Schlüssel (gelb = mehrfach vorhanden).</span></div>
</main>
<script nonce="${nonce}">
(function(){
var T=new URLSearchParams(location.search).get('t')||'';
function api(p,b){return fetch(p,{method:'POST',headers:{'Content-Type':'application/json','X-Token':T},body:JSON.stringify(b||{})}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();});}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
function store(k,v){try{if(v===undefined)return JSON.parse(localStorage.getItem(k)||'null');localStorage.setItem(k,JSON.stringify(v));}catch(e){return null;}}
setInterval(function(){api('/api/ping').catch(function(){});},20000);

api('/api/orte').then(function(d){
  var box=document.getElementById('orte'); var saved=store('sp.auswahl')||{};
  function chk(id,name,pfad,def){var l=el('label','chk');var c=document.createElement('input');c.type='checkbox';c.value=id;c.checked=saved[id]!=null?saved[id]:def;
    var s=el('span',null,name);var sm=el('small',null,pfad);s.appendChild(sm);l.appendChild(c);l.appendChild(s);box.appendChild(l);}
  d.projekte.forEach(function(p){chk('p:'+p.name,p.name,p.pfad+(p.da?'':'  (Ordner fehlt)'),p.da);});
  d.orte.forEach(function(o){chk('o:'+o.id,o.name,o.pfad,o.da);});
  document.getElementById('ordner').value=store('sp.ordner')||'';
});

document.getElementById('los').addEventListener('click',function(){
  var b=this; var sel={projekte:[],orte:[],ordner:[]}; var save={};
  document.querySelectorAll('#orte input').forEach(function(c){save[c.value]=c.checked;if(!c.checked)return;
    if(c.value.indexOf('p:')===0)sel.projekte.push(c.value.slice(2));else sel.orte.push(c.value.slice(2));});
  var ord=document.getElementById('ordner').value; sel.ordner=ord.split(/\\r?\\n/).map(function(s){return s.trim();}).filter(Boolean);
  store('sp.auswahl',save); store('sp.ordner',ord);
  b.disabled=true; document.getElementById('st1').textContent='Suche läuft …';
  api('/api/suche',sel).then(function(d){
    document.getElementById('st1').textContent=d.gelesen+' Dateien gelesen · '+d.funde.length+' Einträge';
    document.getElementById('suchen').disabled=false; document.getElementById('st2').textContent='';
    zeichne(d);
  }).catch(function(e){document.getElementById('st1').textContent='Fehler: '+e.message;}).then(function(){b.disabled=false;});
});

function codeZelle(c){ if(!c)return el('span','muted','—');
  var s=el('span',c.anzahl?'ok':'no',c.anzahl?('ja, '+c.anzahl+' Datei'+(c.anzahl>1?'en':'')):'nein');
  s.title=(c.anzahl?c.files.join('\\n'):'gesucht: '+c.suche.join(', ')); return s; }

function zeigeKnopf(id,td){var b=el('button','sm','Zeigen');b.type='button';var pre=null;
  b.addEventListener('click',function(){ if(pre){pre.remove();pre=null;b.textContent='Zeigen';return;}
    api('/api/wert',{id:id}).then(function(d){pre=el('pre','val',d.wert);td.appendChild(pre);b.textContent='Verbergen';}); });
  return b;}

function zeichne(d){
  var tb=document.getElementById('tab'); tb.textContent='';
  var n={}; d.funde.forEach(function(x){n[x.fp]=(n[x.fp]||0)+1;});
  if(!d.funde.length){var tr=el('tr');var td=el('td','muted','Nichts gefunden.');td.colSpan=6;tr.appendChild(td);tb.appendChild(tr);}
  d.funde.forEach(function(x){
    var tr=el('tr',x.hinweis.indexOf('kein Geheimnis')>=0?'plain':'');
    tr.appendChild(el('td',null,x.art));
    var tn=el('td',null,x.name); if(x.keyId){tn.appendChild(document.createElement('br'));tn.appendChild(el('code',null,'Schlüssel-ID '+x.keyId));}
    if(x.hinweis){tn.appendChild(document.createElement('br'));tn.appendChild(el('small','muted',x.hinweis));} tr.appendChild(tn);
    var tv=el('td'); tv.appendChild(el('code',null,x.maske)); tv.appendChild(document.createTextNode(' ')); tv.appendChild(zeigeKnopf(x.id,tv)); tr.appendChild(tv);
    var tf=el('td'); tf.appendChild(el('code',n[x.fp]>1?'dup':'',x.fp)); if(n[x.fp]>1)tf.appendChild(el('small','muted',' '+n[x.fp]+'×')); tr.appendChild(tf);
    var tc=el('td'); tc.appendChild(codeZelle(x.code)); tr.appendChild(tc);
    var to=el('td','ort'); if(x.projekt){to.appendChild(el('b',null,x.projekt));to.appendChild(document.createElement('br'));} to.appendChild(document.createTextNode(x.ort)); tr.appendChild(to);
    tb.appendChild(tr);
  });
  var w=document.getElementById('weitere'); w.textContent='';
  if(d.dateien.length){w.appendChild(el('h2',null,'Weitere Dateien an Schlüsselorten'));var ul=el('ul');
    d.dateien.forEach(function(f){ul.appendChild(el('li',null,f.ort+' — '+f.hinweis));}); w.appendChild(ul);}
}

document.getElementById('suchen').addEventListener('click',function(){
  var b=this; b.disabled=true; var out=document.getElementById('ergebnis'); out.textContent='';
  api('/api/vergleich',{text:document.getElementById('eingabe').value}).then(function(d){
    if(!d.zeilen.length){out.appendChild(el('li','muted','Kein Schlüssel eingegeben.'));}
    d.zeilen.forEach(function(z){
      var li=el('li'); li.appendChild(el('code',null,z.eingabe)); li.appendChild(document.createTextNode('  '));
      if(z.treffer.length){
        li.appendChild(el('span','ok','gefunden ('+z.wie+')'));
        var ul=el('ul'); z.treffer.forEach(function(t){var i=el('li');
          i.appendChild(document.createTextNode((t.projekt?t.projekt+': ':'')+t.name+' — '+t.ort+' — im Code: '));
          i.appendChild(codeZelle(t.code)); ul.appendChild(i);}); li.appendChild(ul);
      } else {
        li.appendChild(el('span','no','nicht auf diesem Rechner'));
        li.appendChild(el('div','muted','Liegt in keiner durchsuchten Datei. Wird er trotzdem benutzt, dann nur beim Anbieter (z. B. Firebase-, Vercel- oder GitHub-Einstellungen). Sonst: wahrscheinlich tot — erst deaktivieren, nach ein bis zwei Wochen löschen.'));
      }
      out.appendChild(li);
    });
  }).catch(function(e){out.appendChild(el('li','no','Fehler: '+e.message));}).then(function(){b.disabled=false;});
});

document.getElementById('ende').addEventListener('click',function(){
  api('/api/ende').then(function(){document.body.textContent='Beendet. Dieses Fenster kann geschlossen werden.';}).catch(function(){});
});
})();
</script></body></html>`;
}

// ---------------------------------------------------------------- Server
let port = 0;
let letzterPing = Date.now();
function ende(grund) {
    console.log('\n' + grund + ' Server beendet.');
    process.exit(0);
}
function antwort(res, code, typ, body, extra) {
    res.writeHead(code, Object.assign({
        'Content-Type': typ, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer',
    }, extra || {}));
    res.end(body);
}
function json(res, obj) { antwort(res, 200, 'application/json; charset=utf-8', JSON.stringify(obj)); }

const server = http.createServer((req, res) => {
    const host = String(req.headers.host || '');
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return antwort(res, 403, 'text/plain', 'Falscher Host');
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (req.method === 'GET' && url.pathname === '/') {
        if (url.searchParams.get('t') !== TOKEN) return antwort(res, 403, 'text/plain; charset=utf-8', 'Zugangswort fehlt. Bitte die Adresse aus dem Fenster des Skripts benutzen.');
        const nonce = crypto.randomBytes(16).toString('base64');
        letzterPing = Date.now();
        return antwort(res, 200, 'text/html; charset=utf-8', seite(nonce), {
            'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'`,
        });
    }
    if (req.method !== 'POST' || !url.pathname.startsWith('/api/')) return antwort(res, 404, 'text/plain', 'nicht gefunden');
    if (req.headers['x-token'] !== TOKEN) return antwort(res, 403, 'text/plain', 'Zugangswort falsch');
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) return antwort(res, 415, 'text/plain', 'nur JSON');
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 512 * 1024) req.destroy(); });
    req.on('end', () => {
        let d = {}; try { d = body ? JSON.parse(body) : {}; } catch (e) { return antwort(res, 400, 'text/plain', 'JSON kaputt'); }
        letzterPing = Date.now();
        try {
            switch (url.pathname) {
                case '/api/ping': return json(res, { ok: true });
                case '/api/orte': {
                    projekte = ladeProjekte();
                    return json(res, {
                        projekte: projekte.map((p) => ({ name: p.name, pfad: p.pfad, da: fs.existsSync(p.pfad) })),
                        orte: standardOrte().map((o) => ({ id: o.id, name: o.name, pfad: o.pfad, da: fs.existsSync(o.pfad) })),
                    });
                }
                case '/api/suche': {
                    const arr = (v) => (Array.isArray(v) ? v.filter((s) => typeof s === 'string').slice(0, 50) : []);
                    durchsuchen({ projekte: arr(d.projekte), orte: arr(d.orte), ordner: arr(d.ordner) });
                    console.log(`Durchsucht: ${gelesen} Dateien, ${funde.length} Einträge.`);
                    return json(res, {
                        gelesen,
                        funde: funde.map((x) => ({ id: x.id, projekt: x.projekt, name: x.name, art: x.art, maske: mask(x.wert), fp: x.fp,
                            keyId: x.keyId, hinweis: x.hinweis, ort: x.ort, code: x.codeTreffer })),
                        dateien,
                    });
                }
                case '/api/wert': {
                    const x = funde[Number(d.id)];
                    return x ? json(res, { wert: x.wert }) : antwort(res, 404, 'text/plain', 'unbekannt');
                }
                case '/api/vergleich': return json(res, { zeilen: vergleiche(typeof d.text === 'string' ? d.text : '') });
                case '/api/ende': json(res, { ok: true }); return setTimeout(() => ende('Knopf „Beenden“.'), 100);
                default: return antwort(res, 404, 'text/plain', 'nicht gefunden');
            }
        } catch (e) {
            console.error('Fehler:', e && e.message);
            return antwort(res, 500, 'text/plain', 'Fehler im Werkzeug');
        }
    });
});

// Nur für den Selbsttest (node bin/schluessel-pruefen.mjs --selbsttest <Ordner>): ohne Server.
if (process.argv[2] === '--selbsttest') {
    const ordner = path.resolve(process.argv[3] || '.');
    projekte = [{ name: 'test', pfad: ordner }];
    funde = []; dateien = []; gelesen = 0;
    walk(ordner, scanProjektDatei, 10, false);
    funde.forEach((x) => { x.codeTreffer = codeTreffer(x); });
    const eingabe = fs.existsSync(path.join(ordner, 'vergleich.txt')) ? fs.readFileSync(path.join(ordner, 'vergleich.txt'), 'utf8') : '';
    console.log(JSON.stringify({
        funde: funde.map((x) => ({ art: x.art, name: x.name, maske: mask(x.wert), fp: x.fp, keyId: x.keyId, code: x.codeTreffer && x.codeTreffer.anzahl })),
        vergleich: vergleiche(eingabe).map((z) => ({ eingabe: z.eingabe, wie: z.wie, n: z.treffer.length })),
        dateien: dateien.length,
    }, null, 1));
    process.exit(0);
}

server.listen(0, '127.0.0.1', () => {
    port = server.address().port;
    const adresse = `http://127.0.0.1:${port}/?t=${TOKEN}`;
    console.log('Schlüssel prüfen läuft nur auf diesem Rechner.');
    console.log('Adresse (öffnet sich im Browser): ' + adresse);
    if (process.argv.includes('--kein-browser')) { /* Test: Browser nicht öffnen */ }
    else if (process.platform === 'win32') execFile('cmd', ['/c', 'start', '', adresse]);
    else execFile(process.platform === 'darwin' ? 'open' : 'xdg-open', [adresse]);
    setInterval(() => { if (Date.now() - letzterPing > IDLE_MS) ende('2 Minuten keine offene Seite.'); }, 15000);
    if (process.stdin.isTTY) {
        console.log('\nFertig gestartet. Taste drücken zum Beenden.');
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once('data', () => ende('Taste gedrückt.'));
    }
});

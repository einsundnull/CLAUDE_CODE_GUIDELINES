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
 *   1. Durchsuchen: Liste der Orte = Projekte aus PROJECTS.txt + Standard-Orte (Schluessel-privat, Downloads,
 *      Desktop, gcloud) + eigene Ordner. Eigene hinzufügen/entfernen, die übrigen ausblenden/wieder zeigen.
 *      Liste und Häkchen bleiben dauerhaft in bin/schluessel-pruefen.orte.json (gitignored, nur Pfade).
 *      Während der Suche: Ladeanzeige mit gelesenen Dateien, aktuellem Ordner und Sekunden.
 *      Zeigt je Schlüssel: Art, Name, gekürzten Wert, Fingerabdruck, Datei,
 *      ob der Name im Code des Projekts vorkommt. Voller Wert nur nach Klick auf „Zeigen“.
 *   2. Vergleichen: bekannte Schlüssel einfügen (voll, gekürzt wie „sk_live_…4f2a“ oder nur die
 *      Schlüssel-ID aus der Google-Konsole) → je Zeile: gefunden wo / Teiltreffer / nicht auf diesem Rechner.
 *   3. Rotieren (Knopf je Schlüssel): zeigt alle Stellen mit demselben Fingerabdruck und den Link zum Anbieter.
 *      Neuen Wert einfügen → „Prüfen“ (Trockenlauf, nichts geschrieben) → „Jetzt ersetzen“: erst alle Dateien
 *      prüfen, dann schreiben (scheitert eine, wird alles zurückgedreht), danach nachprüfen.
 *      PEM: .pub bekommt den daraus berechneten öffentlichen Teil, *_B64 die Base64-Form.
 *      Dienstkonto: ganze neue JSON einfügen → neue Datei mit neuer Schlüssel-ID im Namen, alte entfernt.
 *      Rückgängig solange das Programm läuft (Sicherung nur im Speicher, keine Kopie auf der Platte).
 *      Schreibt nur in Dateien aus der Suche. Sperrt den alten Schlüssel NICHT beim Anbieter (das macht der User).
 *
 * Sicher zum Hochladen: Die Datei enthält keinen Schlüssel. Werte bleiben im Speicher des laufenden
 *   Programms; auf die Platte kommt nur die Orte-Liste (Pfade, keine Werte), nichts ins Terminal, nichts ins Netz.
 * Schutz des Servers: nur 127.0.0.1, Host-Prüfung (gegen DNS-Rebinding), Zugangswort bei jeder Anfrage,
 *   nur JSON-POST (keine Formular-Angriffe fremder Seiten), CSP mit Nonce.
 * Tut NICHT: Schlüssel senden oder beim Anbieter sperren; ohne „Jetzt ersetzen“ nichts ändern; .odt/.docx/.pdf öffnen (nur aufgelistet);
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
const IDLE_MS = Number(process.env.SP_IDLE_MS) || 2 * 60 * 1000;   // SP_IDLE_MS nur für den Test
const TEST_SCAN_MS = Number(process.env.SP_TEST_SCAN_MS) || 0;      // Test: lange Suche nachstellen
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
// Stand der laufenden Suche (für die Ladeanzeige). Die Suche gibt alle 100 Einträge die Kontrolle ab,
// damit der Server währenddessen antwortet (Anzeige, Ping).
const stand = { laeuft: false, fertig: false, start: 0, ende: 0, phase: '', ordner: '', fehler: '' };
let schritte = 0;
const pause = () => new Promise((r) => setImmediate(r));
async function walk(dir, fn, tiefe, inSecret) {
    if (tiefe < 0) return;
    stand.ordner = dir;
    let list; try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const d of list) {
        if (++schritte % 100 === 0) await pause();
        const p = path.join(dir, d.name);
        if (d.isDirectory()) {
            if (SKIP_DIR.test(d.name)) continue;
            await walk(p, fn, tiefe - 1, inSecret || SECRET_DIR.test(d.name));
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
// ---------------------------------------------------------------- Orte-Liste (dauerhaft)
// Datei neben dem Programm, gitignored (das Repo ist öffentlich): nur Pfade und Häkchen, nie Werte.
const ORTE_DATEI = process.env.SP_ORTE_DATEI || path.join(REPO, 'bin', 'schluessel-pruefen.orte.json');
function ladeEinstellungen() {
    try {
        const j = JSON.parse(fs.readFileSync(ORTE_DATEI, 'utf8'));
        return {
            eigene: Array.isArray(j.eigene) ? j.eigene.filter((e) => e && typeof e.pfad === 'string').slice(0, 200) : [],
            ausgeblendet: Array.isArray(j.ausgeblendet) ? j.ausgeblendet.filter((s) => typeof s === 'string') : [],
            an: j.an && typeof j.an === 'object' ? j.an : {},
        };
    } catch (e) { return { eigene: [], ausgeblendet: [], an: {} }; }
}
function speichereEinstellungen(e) {
    const tmp = ORTE_DATEI + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(e, null, 2), 'utf8');
    fs.renameSync(tmp, ORTE_DATEI);   // erst ganz schreiben, dann ersetzen: nie eine halbe Datei
}
/** Rolle: alle Orte mit Kennung, Quelle, Häkchen; ausgeblendete getrennt. */
function orteListe() {
    const e = ladeEinstellungen();
    const alle = [];
    for (const p of ladeProjekte()) alle.push({ id: 'p:' + p.name, name: p.name, pfad: p.pfad, quelle: 'PROJECTS.txt', art: 'projekt', vorgabe: true });
    for (const o of standardOrte()) alle.push({ id: 'o:' + o.id, name: o.name, pfad: o.pfad, quelle: 'Standard', art: o.art, vorgabe: true });
    for (const x of e.eigene) alle.push({ id: 'e:' + x.pfad, name: x.name || path.basename(x.pfad), pfad: x.pfad, quelle: 'eigener Ordner', art: 'projekt', vorgabe: true });
    for (const o of alle) {
        o.da = fs.existsSync(o.pfad);
        o.an = e.an[o.id] != null ? !!e.an[o.id] : (o.vorgabe && o.da);
        o.aus = e.ausgeblendet.includes(o.id);
    }
    return alle;
}

async function durchsuchen(ids) {
    if (TEST_SCAN_MS) await new Promise((r) => setTimeout(r, TEST_SCAN_MS));   // Test: lange Suche nachstellen
    funde = []; dateien = []; gelesen = 0; codeCache.clear(); schritte = 0;
    const alle = orteListe();
    const gewaehlt = alle.filter((o) => ids.includes(o.id) && !o.aus && o.da);
    // Für „welches Projekt?“ zählen alle Projekt-Orte, die gewählten zuerst.
    projekte = gewaehlt.filter((o) => o.art === 'projekt').concat(alle.filter((o) => o.art === 'projekt' && !gewaehlt.includes(o)))
        .map((o) => ({ name: o.name, pfad: o.pfad }));
    for (const o of gewaehlt) {
        stand.phase = 'Suche in ' + o.name;
        if (o.art === 'projekt') await walk(o.pfad, scanProjektDatei, 10, false);
        else if (o.art === 'alles') await walk(o.pfad, (f) => scanFile(f), 5, true);
        else await walk(o.pfad, (f) => {
            const b = path.basename(f).toLowerCase();
            if (b.startsWith('.env')) scanFile(f); else if (b.endsWith('.json')) scanJson(f, true);
        }, o.id === 'o:gcloud' ? 2 : 4, false);
    }
    // Dubletten derselben Datei (z. B. Ordner doppelt gewählt) entfernen.
    const seen = new Set();
    funde = funde.filter((x) => { const k = x.ort + '|' + x.name + '|' + x.fp; if (seen.has(k)) return false; seen.add(k); return true; });
    funde.forEach((x, i) => { x.id = i; });
    stand.phase = 'Prüfe, ob der Code die Schlüssel benutzt';
    for (const x of funde) x.codeTreffer = await codeTreffer(x);
}

// ---------------------------------------------------------------- Im Code benutzt?
async function codeDateien(pfad) {
    if (codeCache.has(pfad)) return codeCache.get(pfad);
    const list = [];
    await walk(pfad, (f, inSecret) => {
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
async function codeTreffer(x) {
    const pr = projekte.find((p) => p.name === x.projekt);
    if (!pr) return null;
    let suche = null;
    if (/^[A-Z][A-Z0-9_]{3,}$/.test(x.name)) suche = [x.name];
    else if (x.name.startsWith('Dienstkonto')) suche = [path.basename(x.ort), 'GOOGLE_APPLICATION_CREDENTIALS', 'adminsdk'];
    else if (x.name === 'Google OAuth client_secret') suche = [path.basename(x.ort), 'client_secret'];
    else if (/\.(pk|pem|key|p8)$/i.test(x.ort)) suche = [path.basename(x.ort)];
    if (!suche) return null;
    const files = (await codeDateien(pr.pfad)).filter((c) => suche.some((s) => c.text.includes(s))).map((c) => c.datei);
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

// ---------------------------------------------------------------- Rotieren
// Ablauf: Info (Stellen + Anbieter-Link) → Plan (Trockenlauf, nichts geschrieben) → Los (erst alle Dateien prüfen,
// dann schreiben; scheitert eine, wird zurückgedreht) → Nachprüfung → Rückgängig solange das Programm läuft.
// Geschrieben wird NUR in Dateien, die die Suche gefunden hat (nie ein Pfad aus dem Browser).
// Sicherung nur im Speicher: eine Sicherungsdatei wäre eine weitere Kopie des alten Schlüssels auf der Platte.
const ANBIETER = [
    [(x) => x.name.startsWith('Dienstkonto'), { name: 'Google Cloud (Dienstkonten)', url: 'https://console.cloud.google.com/iam-admin/serviceaccounts',
        schritt: 'Dienstkonto öffnen → Reiter „Schlüssel“ → „Schlüssel hinzufügen“ → „Neuen Schlüssel erstellen“ → JSON. Die heruntergeladene Datei mit einem Editor öffnen und den ganzen Inhalt unten einfügen.' }],
    [(x) => /Webhook/.test(x.art) || /WEBHOOK/i.test(x.name), { name: 'Stripe Webhooks', url: 'https://dashboard.stripe.com/webhooks',
        schritt: 'Endpunkt öffnen → Signaturgeheimnis neu erzeugen („Roll secret“), neuen Wert kopieren.' }],
    [(x) => /^Stripe/.test(x.art) || /STRIPE/i.test(x.name), { name: 'Stripe API-Schlüssel', url: 'https://dashboard.stripe.com/apikeys',
        schritt: 'Beim Schlüssel „Schlüssel rollen“ wählen, neuen Wert kopieren. Test- und Live-Modus sind getrennte Seiten.' }],
    [(x) => /Google OAuth/.test(x.art) || /CLIENT_SECRET/i.test(x.name), { name: 'Google Cloud (Anmeldedaten)', url: 'https://console.cloud.google.com/apis/credentials',
        schritt: 'OAuth-Client öffnen → „Secret hinzufügen“, neuen Wert kopieren. Das alte erst nach dem Test deaktivieren.' }],
    [(x) => /mailgun/i.test(x.art + x.name + x.ort), { name: 'Mailgun', url: 'https://app.mailgun.com/settings/api_security',
        schritt: 'Neuen API-Schlüssel anlegen und sofort kopieren (er wird nur einmal gezeigt).' }],
    [(x) => /turnstile/i.test(x.art + x.name), { name: 'Cloudflare Turnstile', url: 'https://dash.cloudflare.com/?to=/:account/turnstile',
        schritt: 'Widget öffnen → „Rotate Secret Key“, neuen Wert kopieren.' }],
    [(x) => /jaas/i.test(x.art + x.name + x.ort), { name: 'JaaS (8x8)', url: 'https://jaas.8x8.vc/#/apikeys',
        schritt: 'Neuen API-Schlüssel anlegen, den privaten Schlüssel (PEM) herunterladen und unten einfügen. Die neue Key-ID danach in JAAS_KEY_ID eintragen.' }],
    [(x) => /GitHub/.test(x.art), { name: 'GitHub Tokens', url: 'https://github.com/settings/tokens', schritt: 'Neues Token erzeugen, kopieren; altes danach löschen.' }],
    [(x) => /Anthropic/.test(x.art), { name: 'Anthropic Console', url: 'https://console.anthropic.com/settings/keys', schritt: 'Neuen Schlüssel erzeugen, kopieren.' }],
    [(x) => /vercel/i.test(x.art + x.name), { name: 'Vercel Tokens', url: 'https://vercel.com/account/tokens', schritt: 'Neues Token erzeugen. (VERCEL_OIDC_TOKEN erneuert die Vercel-CLI selbst: dort „vercel env pull“.)' }],
    [(x) => /imgbb/i.test(x.art + x.name + x.ort), { name: 'ImgBB', url: 'https://api.imgbb.com/', schritt: 'Angemeldet einen neuen API-Schlüssel erzeugen.' }],
];
function anbieterFuer(x) {
    for (const [t, a] of ANBIETER) if (t(x)) return a;
    return { name: '', url: '', schritt: 'Den neuen Schlüssel dort erzeugen, wo der alte herkommt (Anbieter nicht erkannt).' };
}
const istPem = (v) => String(v).includes('KEY-----');
function stellenVon(x) { return funde.filter((y) => y.fp === x.fp); }
function zaehle(text, s) { let n = 0, i = 0; while (s && (i = text.indexOf(s, i)) !== -1) { n++; i += s.length; } return n; }
function dienstkontoName(alt, j) {
    const base = path.basename(alt);
    const m = base.match(/^(.*-)([0-9a-f]{8,})\.json$/i);
    return m ? path.join(path.dirname(alt), m[1] + String(j.private_key_id).slice(0, m[2].length) + '.json') : alt;
}
function leseUtf8(datei) {
    const buf = fs.readFileSync(datei);
    const text = buf.toString('utf8');
    if (!Buffer.from(text, 'utf8').equals(buf)) throw new Error(datei + ': keine UTF-8-Datei — bitte von Hand ändern.');
    return text;
}
function schreibe(datei, text) {
    const tmp = datei + '.sp-tmp';
    fs.writeFileSync(tmp, text, 'utf8');
    fs.renameSync(tmp, datei);
}
const plaene = new Map();   // planId → Plan (nur der letzte gilt)
let undoStapel = null;      // [{ datei, inhalt (null = Datei war neu) }]

function rotationInfo(id) {
    const x = funde[Number(id)];
    if (!x) return null;
    const sa = x.name.startsWith('Dienstkonto');
    return {
        name: x.name, art: x.art, anbieter: anbieterFuer(x),
        stellen: stellenVon(x).map((y) => ({ datei: y.ort, name: y.name })),
        eingabeHinweis: sa ? '(ganzer Inhalt der neuen JSON-Datei)' : (istPem(x.wert) || /_B64$/i.test(x.name) ? '(neuer privater Schlüssel als PEM, „-----BEGIN PRIVATE KEY-----“ …)' : '(nur der Wert, ohne Namen und ohne Anführungszeichen)'),
    };
}

function planeRotation(id, roh) {
    const x = funde[Number(id)];
    if (!x) return { fehler: 'Unbekannter Eintrag — bitte neu durchsuchen.' };
    if (x.hinweis.includes('kein Geheimnis')) return { fehler: 'Das ist kein Geheimnis; Rotieren ist nicht nötig.' };
    const neu = String(roh || '').replace(/\r\n/g, '\n').trim();
    if (!neu) return { fehler: 'Bitte zuerst den neuen Schlüssel einfügen.' };
    if (neu.length > 20000) return { fehler: 'Der eingefügte Text ist zu lang.' };
    const warnungen = [];
    let neuPem = null, neuJson = null;
    if (x.name.startsWith('Dienstkonto')) {
        try { neuJson = JSON.parse(neu); } catch (e) { return { fehler: 'Für ein Dienstkonto bitte den ganzen Inhalt der neuen JSON-Datei einfügen.' }; }
        if (!neuJson || neuJson.type !== 'service_account' || !neuJson.private_key || !neuJson.private_key_id) return { fehler: 'Das ist keine Dienstkonto-Datei (type, private_key oder private_key_id fehlen).' };
        if (neuJson.private_key_id === x.keyId) return { fehler: 'Das ist derselbe Schlüssel (gleiche Schlüssel-ID).' };
        const altMail = x.name.replace(/^Dienstkonto /, '');
        if (neuJson.client_email !== altMail) warnungen.push(`Anderes Dienstkonto: ${neuJson.client_email} statt ${altMail}.`);
        neuPem = neuJson.private_key;
    } else if (istPem(x.wert) || /_B64$/i.test(x.name)) {
        if (!neu.includes('PRIVATE KEY-----')) return { fehler: 'Bitte den neuen privaten Schlüssel als PEM einfügen („-----BEGIN PRIVATE KEY-----“ …).' };
        const f = pemFp(neu);
        if (!f) return { fehler: 'Der eingefügte PEM-Schlüssel lässt sich nicht lesen.' };
        if (f === x.fp) return { fehler: 'Das ist derselbe Schlüssel wie bisher.' };
        neuPem = neu;
    } else {
        if (/\s/.test(neu)) return { fehler: 'Der neue Wert enthält Leerzeichen oder Zeilenumbrüche — bitte nur den Schlüssel einfügen.' };
        if (neu === x.wert) return { fehler: 'Das ist derselbe Wert wie bisher.' };
        if (/["'#]/.test(neu)) warnungen.push('Der Wert enthält Anführungszeichen oder # — in .env-Dateien kann das stören.');
        const vorn = (v) => (v.match(/^(?:[A-Za-z]{2,8}[_-])+/) || [''])[0];   // sk_test_, sk_live_, whsec_
        if (vorn(x.wert) !== vorn(neu)) warnungen.push(`Der Anfang passt nicht: alt „${vorn(x.wert) || '(ohne)'}“, neu „${vorn(neu) || '(ohne)'}“. Richtiger Schlüssel, richtiger Modus (Test/Live)?`);
        if (Math.abs(neu.length - x.wert.length) > x.wert.length * 0.5) warnungen.push(`Die Länge ist sehr anders (${x.wert.length} → ${neu.length} Zeichen).`);
    }
    // Je Stelle: was ersetzt wird. Gleiche Datei → mehrere Ersetzungen gesammelt.
    const dateien = new Map();
    const plan = [];
    for (const y of stellenVon(x)) {
        if (y.name.startsWith('Dienstkonto')) {
            if (!neuJson) { warnungen.push(`${y.ort}: Dienstkonto-Datei — wird nur über ihren eigenen „Rotieren“-Knopf ersetzt, hier übersprungen.`); continue; }
            const neuName = dienstkontoName(y.ort, neuJson);
            if (neuName !== y.ort && fs.existsSync(neuName)) return { fehler: 'Die neue Datei gibt es schon: ' + neuName };
            dateien.set(y.ort, { ganz: JSON.stringify(neuJson, null, 2) + '\n', neuName });
            plan.push({ datei: y.ort, was: neuName === y.ort ? 'Datei durch die neue ersetzt' : 'ersetzt durch ' + path.basename(neuName) + ' (Name mit neuer Schlüssel-ID)' });
            continue;
        }
        let ein, was;
        if (/_B64$/i.test(y.name)) { ein = Buffer.from(neuPem.trim() + '\n').toString('base64'); was = y.name + ': Base64 des neuen Schlüssels'; }
        else if (y.wert.includes('PUBLIC KEY-----')) { ein = crypto.createPublicKey(neuPem).export({ type: 'spki', format: 'pem' }).trim(); was = 'öffentlicher Schlüssel, aus dem neuen berechnet'; }
        else if (istPem(y.wert)) { ein = neuPem.trim(); was = 'privater Schlüssel ersetzt'; }
        else { ein = neu; was = (y.name || 'Wert') + ': Wert ersetzt'; }
        if (y.wert.includes('\r\n')) ein = ein.replace(/\r?\n/g, '\r\n');
        let text;
        try { text = leseUtf8(y.ort); } catch (e) { return { fehler: e.message }; }
        const n = zaehle(text, y.wert);
        if (!n) { warnungen.push(`${y.ort}: alter Wert nicht mehr in der Datei (geändert?) — übersprungen. Bitte neu durchsuchen.`); continue; }
        const eintrag = dateien.get(y.ort) || { ersetzungen: [] };
        if (!eintrag.ersetzungen.some((r) => r.alt === y.wert)) eintrag.ersetzungen.push({ alt: y.wert, ein, anzahl: n });
        dateien.set(y.ort, eintrag);
        plan.push({ datei: y.ort, was: was + (n > 1 ? ` (${n}×)` : '') });
    }
    if (!plan.length) return { fehler: 'Keine Datei zum Ersetzen gefunden. Bitte neu durchsuchen.' };
    const planId = crypto.randomBytes(12).toString('hex');
    plaene.clear();
    plaene.set(planId, { dateien, x, neuJson });
    return { planId, plan, warnungen };
}

function fuehreRotationAus(planId) {
    const p = plaene.get(String(planId || ''));
    if (!p) return { fehler: 'Der Plan ist abgelaufen — bitte noch einmal „Prüfen“.' };
    plaene.clear();
    // Phase 1: alles lesen und prüfen, nichts schreiben.
    const vorhaben = [];
    for (const [datei, e] of p.dateien) {
        let text;
        try { text = leseUtf8(datei); } catch (err) { return { fehler: err.message + ' Nichts wurde geändert.' }; }
        if (e.ganz != null) { vorhaben.push({ datei, alt: text, neu: e.ganz, neuName: e.neuName }); continue; }
        let neuText = text;
        for (const r of e.ersetzungen) {
            if (zaehle(neuText, r.alt) !== r.anzahl) return { fehler: datei + ': Die Datei hat sich seit dem Prüfen geändert. Nichts wurde geändert.' };
            neuText = neuText.split(r.alt).join(r.ein);
        }
        vorhaben.push({ datei, alt: text, neu: neuText, neuName: datei, ersetzungen: e.ersetzungen });
    }
    // Phase 2: schreiben; scheitert eine Datei, werden die schon geschriebenen zurückgedreht.
    const sicherung = [];
    try {
        for (const v of vorhaben) {
            if (v.neuName !== v.datei) {
                schreibe(v.neuName, v.neu); sicherung.push({ datei: v.neuName, inhalt: null });
                fs.unlinkSync(v.datei); sicherung.push({ datei: v.datei, inhalt: v.alt });
            } else { schreibe(v.datei, v.neu); sicherung.push({ datei: v.datei, inhalt: v.alt }); }
        }
    } catch (err) {
        stelleWiederHer(sicherung);
        return { fehler: 'Schreiben gescheitert (' + (err && err.code || 'Fehler') + '). Alle Dateien sind wieder wie vorher.' };
    }
    undoStapel = sicherung;
    // Nachprüfung: alter Wert weg, neuer da.
    const ergebnis = []; let ok = true;
    for (const v of vorhaben) {
        let t = ''; try { t = fs.readFileSync(v.neuName, 'utf8'); } catch (e) { /* leer */ }
        let gut;
        if (v.ersetzungen) gut = v.ersetzungen.every((r) => !t.includes(r.alt) && t.includes(r.ein));
        else gut = t === v.neu && (v.neuName === v.datei || !fs.existsSync(v.datei));
        ok = ok && gut;
        ergebnis.push({ datei: v.neuName, ok: gut, text: gut ? (v.neuName !== v.datei ? 'neue Datei, alte entfernt' : 'ersetzt, geprüft') : 'Nachprüfung fehlgeschlagen' });
    }
    // Was danach noch zu tun ist.
    const danach = new Set();
    for (const v of vorhaben) {
        if (/[\\/]functions[\\/]\.env/i.test(v.datei)) danach.add('Firebase nutzt den neuen Wert erst nach dem Deploy: im Projektordner „firebase deploy --only functions“.');
        if (/[\\/]\.env(\.local)?$/i.test(v.datei) && fs.existsSync(path.join(path.dirname(v.datei), 'vercel.json'))) danach.add('Steht der Wert auch bei Vercel (Settings → Environment Variables)? Dann dort ebenfalls ändern.');
    }
    if (p.neuJson) danach.add('In der Google-Konsole den alten Dienstkonto-Schlüssel (ID ' + p.x.keyId.slice(0, 10) + '…) löschen, sobald die Skripte mit dem neuen laufen.');
    if (/jaas/i.test(p.x.art + p.x.name + p.x.ort)) danach.add('JAAS_KEY_ID auf die neue Key-ID aus der JaaS-Konsole ändern.');
    danach.add('Testen, ob alles läuft. Dann den alten Schlüssel beim Anbieter sperren.');
    danach.add('Neu durchsuchen, damit die Tabelle den neuen Stand zeigt.');
    console.log(`Rotiert: ${vorhaben.length} Datei(en), Nachprüfung ${ok ? 'ok' : 'FEHLER'}.`);
    return { ok, ergebnis, danach: [...danach], undo: true };
}

function stelleWiederHer(sicherung) {
    const fehler = [];
    for (const s of sicherung.slice().reverse()) {
        try { if (s.inhalt == null) fs.unlinkSync(s.datei); else schreibe(s.datei, s.inhalt); } catch (e) { fehler.push(s.datei); }
    }
    return fehler;
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
.combo{position:relative}
.comboKnopf{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;max-width:640px;text-align:left;background:var(--field)}
.pfeil{width:8px;height:8px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:rotate(45deg);margin:-4px 4px 0 0;flex:0 0 auto}
.comboKnopf[aria-expanded=true] .pfeil{transform:rotate(-135deg);margin-top:4px}
.pop{position:absolute;z-index:20;left:0;right:0;top:calc(100% + 6px);max-height:65vh;overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px;box-shadow:0 10px 30px rgba(0,0,0,.18)}
.overlay{position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;overflow:auto}
.overlay[hidden]{display:none}
.panel{background:var(--card);color:var(--fg);border:1px solid var(--line);border-radius:12px;padding:16px;width:100%;max-width:760px}
.panel .kopf{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}
.schritte{padding-left:20px} .schritte>li{margin:0 0 12px} .schritte textarea{margin-top:6px}
ul.plan{margin:6px 0;padding-left:18px;font-size:13px} ul.plan li{word-break:break-all}
.warn{color:var(--warn)}
ul.orte{list-style:none;margin:0 0 10px;padding:0}
ul.orte li{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--line)}
ul.orte li .txt{flex:1;min-width:0} ul.orte li small{display:block;color:var(--muted);word-break:break-all}
ul.orte li.fehlt .txt{opacity:.6} .tag2{font-size:11px;border:1px solid var(--line);border-radius:10px;padding:0 7px;margin-left:6px;color:var(--muted);white-space:nowrap}
input[type=text]{flex:1;min-width:200px;padding:7px 9px;border:1px solid var(--line);border-radius:8px;background:var(--field);color:var(--fg);font:13px ui-monospace,Consolas,monospace}
input[type=text].kurz{flex:0 1 180px;min-width:120px;font-family:inherit}
.lade{display:none;align-items:center;gap:12px;margin-top:12px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg)}
.lade.an{display:flex} .lade .txt{min-width:0} .lade small{display:block;color:var(--muted);word-break:break-all}
.spin{flex:0 0 22px;width:22px;height:22px;border:3px solid var(--line);border-top-color:var(--acc);border-radius:50%;animation:dreh .8s linear infinite}
@keyframes dreh{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.spin{animation:none;border-top-color:var(--line);background:var(--acc);opacity:.6}}
.msg{margin-top:6px;min-height:1.2em} .msg.no{font-weight:400}
</style></head><body><main>
<h1>Schlüssel prüfen</h1>
<p class="sub">Läuft nur auf diesem Rechner (127.0.0.1). Schlüssel bleiben im Speicher des Programms; gespeichert wird nur die Liste der Orte.</p>

<section class="card"><h2>1. Wo suchen?</h2>
<div class="combo" id="combo">
<button type="button" class="comboKnopf" id="comboKnopf" aria-expanded="false" aria-controls="comboPop"><span id="comboText">Liste wird geladen …</span><span class="pfeil" aria-hidden="true"></span></button>
<div class="pop" id="comboPop" hidden>
<ul class="orte" id="orte"><li><span class="spin" aria-hidden="true"></span><span class="txt">Liste wird geladen …</span></li></ul>
<div class="row" id="ausRow"></div>
<div class="row"><input type="text" id="neuPfad" placeholder="Ordner hinzufügen, z. B. C:\\Pfad\\zum\\Projekt" spellcheck="false" aria-label="Pfad des neuen Ordners">
<input type="text" class="kurz" id="neuName" placeholder="Name (optional)" aria-label="Name des neuen Ordners">
<button type="button" id="neuLos">Hinzufügen</button></div>
<div class="msg" id="neuMsg" role="status"></div>
<div class="row"><button type="button" id="comboZu">Fertig</button></div>
</div></div>
<div class="row"><button class="pri" id="los" type="button">Durchsuchen</button><span class="status" id="st1">Große Ordner können einige Minuten dauern.</span></div>
<div class="lade" id="lade" role="status" aria-live="polite"><span class="spin" aria-hidden="true"></span>
<span class="txt"><b id="ladeKopf">Suche läuft …</b><small id="ladeOrt"></small></span></div>
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

<div class="overlay" id="rot" hidden><div class="panel" role="dialog" aria-modal="true" aria-labelledby="rotTitel">
<div class="kopf"><h2 id="rotTitel">Schlüssel rotieren</h2><button type="button" class="sm" id="rotZu" aria-label="Schließen">Schließen</button></div>
<div id="rotStellen"></div>
<ol class="schritte">
<li><b>Neuen Schlüssel beim Anbieter erzeugen.</b> <span id="rotAnbieter"></span></li>
<li><b>Neuen Schlüssel hier einfügen</b> <span class="muted" id="rotHinweis"></span>
<textarea id="rotNeu" spellcheck="false" autocomplete="off"></textarea>
<div class="row"><button type="button" id="rotPruef">Prüfen (nichts wird geändert)</button></div>
<div id="rotPlan"></div></li>
<li><b>Alten Schlüssel beim Anbieter sperren</b> — erst, wenn alles mit dem neuen läuft.</li>
</ol>
<div id="rotErg" role="status"></div>
</div></div>

<div class="row"><button id="ende" type="button">Beenden</button><span class="status">Fingerabdruck: gleiche 8 Zeichen = gleicher Schlüssel (gelb = mehrfach vorhanden).</span></div>
</main>
<script nonce="${nonce}">
(function(){
var T=new URLSearchParams(location.search).get('t')||'';
var WEG='Das Werkzeug läuft nicht mehr (Fenster geschlossen, Taste gedrückt oder beendet). Bitte schluessel-pruefen.bat neu starten — diese Seite gehört zum alten Start.';
function api(p,b){return fetch(p,{method:'POST',headers:{'Content-Type':'application/json','X-Token':T},body:JSON.stringify(b||{})}).catch(function(){throw new Error(WEG);}).then(function(r){if(!r.ok)throw new Error(r.status===403?WEG:'HTTP '+r.status);return r.json();});}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
function $(id){return document.getElementById(id);}
setInterval(function(){api('/api/ping').catch(function(){});},20000);

// ---- Orte-Liste: Häkchen, Entfernen/Ausblenden, Hinzufügen (alles wird am Server gespeichert)
var zeigeAus=false;
var orteJetzt=[];
function comboText(){var s=orteJetzt.filter(function(o){return !o.aus;}); var an=s.filter(function(o){return o.an&&o.da;});
  $('comboText').textContent='Orte: '+an.length+' von '+s.length+' gewählt'+(an.length?' — '+an.slice(0,3).map(function(o){return o.name;}).join(', ')+(an.length>3?' …':''):'');}
function comboAuf(auf){$('comboPop').hidden=!auf;$('comboKnopf').setAttribute('aria-expanded',auf?'true':'false');}
$('comboKnopf').addEventListener('click',function(){comboAuf($('comboPop').hidden);});
$('comboZu').addEventListener('click',function(){comboAuf(false);$('comboKnopf').focus();});
document.addEventListener('click',function(e){if(!$('combo').contains(e.target))comboAuf(false);});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('comboPop').hidden){comboAuf(false);$('comboKnopf').focus();}});
function zeichneOrte(liste){
  orteJetzt=liste; comboText();
  var ul=$('orte'); ul.textContent='';
  var sichtbar=liste.filter(function(o){return !o.aus;}); var aus=liste.filter(function(o){return o.aus;});
  if(!sichtbar.length)ul.appendChild(el('li','muted','Keine Orte. Unten einen Ordner hinzufügen.'));
  sichtbar.concat(zeigeAus?aus:[]).forEach(function(o){
    var li=el('li',o.da?'':'fehlt'); var c=document.createElement('input'); c.type='checkbox'; c.checked=o.an&&o.da; c.disabled=!o.da||o.aus;
    c.setAttribute('aria-label',o.name); c.addEventListener('change',function(){o.an=c.checked;comboText();api('/api/ort-an',{id:o.id,an:c.checked}).catch(fehlerOrte);});
    var t=el('span','txt'); t.appendChild(el('b',null,o.name)); t.appendChild(el('span','tag2',o.quelle));
    if(!o.da)t.appendChild(el('span','tag2','Ordner fehlt')); if(o.aus)t.appendChild(el('span','tag2','ausgeblendet'));
    t.appendChild(el('small',null,o.pfad));
    var b=el('button','sm',o.aus?'Wieder zeigen':(o.quelle==='eigener Ordner'?'Entfernen':'Ausblenden')); b.type='button';
    b.title=o.quelle==='eigener Ordner'?'Aus der Liste löschen':'Nur hier ausblenden (PROJECTS.txt bleibt unverändert)';
    b.addEventListener('click',function(){b.disabled=true;api(o.aus?'/api/ort-zeigen':'/api/ort-weg',{id:o.id}).then(function(d){zeichneOrte(d.liste);}).catch(fehlerOrte);});
    li.appendChild(c); li.appendChild(t); li.appendChild(b); ul.appendChild(li);
  });
  var r=$('ausRow'); r.textContent='';
  if(aus.length){var a=el('button','sm',zeigeAus?'Ausgeblendete verbergen':('Ausgeblendete zeigen ('+aus.length+')'));a.type='button';
    a.addEventListener('click',function(){zeigeAus=!zeigeAus;zeichneOrte(liste);}); r.appendChild(a);}
}
function fehlerOrte(e){var m=$('neuMsg');m.className='msg no';m.textContent=e.message;}
function ladeOrte(){api('/api/liste').then(function(d){zeichneOrte(d.liste);}).catch(fehlerOrte);}
ladeOrte();

$('neuLos').addEventListener('click',function(){
  var b=this,m=$('neuMsg'); var p=$('neuPfad').value.trim(); if(!p){m.className='msg no';m.textContent='Bitte einen Pfad eingeben.';return;}
  b.disabled=true; m.className='msg muted'; m.textContent='Prüfe Ordner …';
  api('/api/ort-neu',{pfad:p,name:$('neuName').value.trim()}).then(function(d){
    if(d.fehler){m.className='msg no';m.textContent=d.fehler;return;}
    m.className='msg ok';m.textContent='Hinzugefügt und gespeichert.'; $('neuPfad').value=''; $('neuName').value=''; zeichneOrte(d.liste);
  }).catch(fehlerOrte).then(function(){b.disabled=false;});
});
$('neuPfad').addEventListener('keydown',function(e){if(e.key==='Enter')$('neuLos').click();});

// ---- Suche mit Ladeanzeige: Server sucht im Hintergrund, die Seite fragt alle 0,5 s nach dem Stand
function zeigeLade(an){$('lade').className='lade'+(an?' an':'');}
$('los').addEventListener('click',function(){
  var b=this; b.disabled=true; $('suchen').disabled=true; zeigeLade(true);
  $('ladeKopf').textContent='Suche startet …'; $('ladeOrt').textContent=''; $('st1').textContent='';
  api('/api/suche',{}).then(function(){
    var t=setInterval(function(){
      api('/api/stand').then(function(s){
        $('ladeKopf').textContent=(s.phase||'Suche läuft')+' … '+s.gelesen+' Dateien gelesen · '+s.funde+' Funde · '+s.sek+' s';
        $('ladeOrt').textContent=s.ordner||'';
        if(s.laeuft)return;
        clearInterval(t); zeigeLade(false); b.disabled=false;
        if(s.fehler){$('st1').textContent='Fehler: '+s.fehler;return;}
        api('/api/ergebnis').then(function(d){
          $('st1').textContent='Fertig: '+d.gelesen+' Dateien gelesen · '+d.funde.length+' Einträge · '+d.sek+' s';
          $('suchen').disabled=false; $('st2').textContent=''; zeichne(d);
        }).catch(function(e){$('st1').textContent='Fehler: '+e.message;});
      }).catch(function(e){clearInterval(t);zeigeLade(false);b.disabled=false;$('st1').textContent='Fehler: '+e.message;});
    },500);
  }).catch(function(e){zeigeLade(false);b.disabled=false;$('st1').textContent='Fehler: '+e.message;});
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
    var tv=el('td'); tv.appendChild(el('code',null,x.maske)); tv.appendChild(document.createTextNode(' ')); tv.appendChild(zeigeKnopf(x.id,tv));
    if(x.hinweis.indexOf('kein Geheimnis')<0){var rb=el('button','sm','Rotieren');rb.type='button';rb.addEventListener('click',function(){oeffneRotation(x.id,rb);});tv.appendChild(document.createTextNode(' '));tv.appendChild(rb);}
    tr.appendChild(tv);
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
  var w=el('li'); w.appendChild(el('span','spin')); w.appendChild(document.createTextNode(' Vergleiche …')); out.appendChild(w);
  api('/api/vergleich',{text:document.getElementById('eingabe').value}).then(function(d){
    out.textContent='';
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
  }).catch(function(e){out.textContent='';out.appendChild(el('li','no','Fehler: '+e.message));}).then(function(){b.disabled=false;});
});

// ---- Rotieren: Anbieter-Link → neuen Wert einfügen → Trockenlauf (Plan) → ersetzen → prüfen → Rückgängig möglich
var rotId=null, rotPlanId=null, rotAusloeser=null;
function rotSchliessen(){$('rot').hidden=true; $('rotNeu').value=''; rotPlanId=null; if(rotAusloeser)rotAusloeser.focus();}
$('rotZu').addEventListener('click',rotSchliessen);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('rot').hidden)rotSchliessen();});
function liste(arr,fn){var ul=el('ul','plan');arr.forEach(function(a){ul.appendChild(fn(a));});return ul;}
function oeffneRotation(id,knopf){
  rotId=id; rotPlanId=null; rotAusloeser=knopf; $('rotPlan').textContent=''; $('rotErg').textContent=''; $('rotNeu').value='';
  $('rotStellen').textContent='Lade …'; $('rot').hidden=false;
  api('/api/rotation-info',{id:id}).then(function(d){
    $('rotTitel').textContent='Schlüssel rotieren: '+d.name;
    var s=$('rotStellen'); s.textContent=''; s.appendChild(el('div',null,d.art+' — liegt an '+d.stellen.length+' Stelle'+(d.stellen.length>1?'n':'')+':'));
    s.appendChild(liste(d.stellen,function(p){return el('li',null,p.datei+'  ('+p.name+')');}));
    var a=$('rotAnbieter'); a.textContent='';
    if(d.anbieter.url){var l=el('a',null,d.anbieter.name+' öffnen');l.href=d.anbieter.url;l.target='_blank';l.rel='noopener noreferrer';a.appendChild(l);a.appendChild(document.createTextNode(' — '+d.anbieter.schritt));}
    else a.textContent=d.anbieter.schritt;
    $('rotHinweis').textContent=d.eingabeHinweis; $('rotNeu').focus();
  }).catch(function(e){$('rotStellen').textContent='Fehler: '+e.message;});
}
$('rotPruef').addEventListener('click',function(){
  var b=this,p=$('rotPlan'); b.disabled=true; p.textContent='Prüfe …'; $('rotErg').textContent=''; rotPlanId=null;
  api('/api/rotation-plan',{id:rotId,neu:$('rotNeu').value}).then(function(d){
    p.textContent='';
    if(d.fehler){p.appendChild(el('div','no',d.fehler));return;}
    rotPlanId=d.planId;
    p.appendChild(el('div',null,'Das würde geändert ('+d.plan.length+' Datei'+(d.plan.length>1?'en':'')+'):'));
    p.appendChild(liste(d.plan,function(x){return el('li',null,x.datei+' — '+x.was);}));
    var go=el('button','pri','Jetzt ersetzen'); go.type='button';
    if(d.warnungen.length){
      p.appendChild(liste(d.warnungen,function(w){return el('li','warn',w);}));
      var lab=el('label'); var cb=document.createElement('input'); cb.type='checkbox'; lab.appendChild(cb); lab.appendChild(document.createTextNode(' Warnungen gelesen, trotzdem ersetzen'));
      p.appendChild(lab); go.disabled=true; cb.addEventListener('change',function(){go.disabled=!cb.checked;});
    }
    var r=el('div','row'); r.appendChild(go); p.appendChild(r);
    go.addEventListener('click',function(){ go.disabled=true; $('rotErg').textContent='Ersetze …';
      api('/api/rotation-los',{planId:rotPlanId}).then(zeigeRotErg).catch(function(e){$('rotErg').textContent='Fehler: '+e.message;}); });
  }).catch(function(e){p.textContent='Fehler: '+e.message;}).then(function(){b.disabled=false;});
});
function zeigeRotErg(d){
  var r=$('rotErg'); r.textContent='';
  if(d.fehler){r.appendChild(el('div','no',d.fehler));return;}
  r.appendChild(el('div',d.ok?'ok':'no',d.ok?'Ersetzt und nachgeprüft: der alte Wert steht in keiner der Dateien mehr, der neue überall.':'Nicht alles hat geklappt — siehe Liste.'));
  r.appendChild(liste(d.ergebnis,function(x){return el('li',x.ok?'':'warn',x.datei+' — '+x.text);}));
  if(d.danach.length){r.appendChild(el('div',null,'Danach noch nötig:'));r.appendChild(liste(d.danach,function(t){return el('li',null,t);}));}
  if(d.undo){var u=el('button',null,'Rückgängig');u.type='button';u.addEventListener('click',function(){u.disabled=true;
    api('/api/rotation-undo',{}).then(function(x){r.appendChild(el('div',x.ok?'ok':'no',x.text));}).catch(function(e){r.appendChild(el('div','no',e.message));});});
    var row=el('div','row');row.appendChild(u);row.appendChild(el('span','muted','Geht, solange das Werkzeug läuft. Danach bitte neu durchsuchen.'));r.appendChild(row);}
  $('rotPlan').textContent=''; $('rotNeu').value='';
}

document.getElementById('ende').addEventListener('click',function(){
  api('/api/ende').then(function(){document.body.textContent='Beendet. Dieses Fenster kann geschlossen werden.';}).catch(function(){});
});
})();
</script></body></html>`;
}

// ---------------------------------------------------------------- Server
let port = 0;
let letzterPing = Date.now();
let beschaeftigt = 0;   // laufende Anfragen: solange > 0 nie wegen Leerlauf beenden
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
        beschaeftigt++;
        try {
            switch (url.pathname) {
                case '/api/ping': return json(res, { ok: true });
                case '/api/liste': return json(res, { liste: orteListe() });
                case '/api/ort-an': {
                    const e = ladeEinstellungen();
                    if (typeof d.id !== 'string' || d.id.length > 600) return antwort(res, 400, 'text/plain', 'id fehlt');
                    e.an[d.id] = !!d.an; speichereEinstellungen(e);
                    return json(res, { ok: true });
                }
                case '/api/ort-neu': {
                    const roh = typeof d.pfad === 'string' ? d.pfad.trim().replace(/^"|"$/g, '') : '';
                    if (!roh || roh.length > 500) return json(res, { fehler: 'Bitte einen Pfad eingeben (höchstens 500 Zeichen).' });
                    const pfad = path.resolve(roh);
                    let ist = false; try { ist = fs.statSync(pfad).isDirectory(); } catch (e) { /* fehlt */ }
                    if (!ist) return json(res, { fehler: 'Diesen Ordner gibt es nicht: ' + pfad });
                    if (pfad === path.parse(pfad).root) return json(res, { fehler: 'Ein ganzes Laufwerk ist zu groß. Bitte einen Ordner wählen.' });
                    if (orteListe().some((o) => path.resolve(o.pfad).toLowerCase() === pfad.toLowerCase())) return json(res, { fehler: 'Dieser Ordner steht schon in der Liste (vielleicht ausgeblendet).' });
                    const e = ladeEinstellungen();
                    const name = typeof d.name === 'string' && d.name.trim() ? d.name.trim().slice(0, 80) : path.basename(pfad);
                    e.eigene.push({ name, pfad }); e.an['e:' + pfad] = true; speichereEinstellungen(e);
                    return json(res, { liste: orteListe() });
                }
                case '/api/ort-weg': {
                    const e = ladeEinstellungen();
                    const id = typeof d.id === 'string' ? d.id : '';
                    if (id.startsWith('e:')) e.eigene = e.eigene.filter((x) => 'e:' + x.pfad !== id);   // eigener Ordner: löschen
                    else if (id && !e.ausgeblendet.includes(id)) e.ausgeblendet.push(id);              // sonst: nur ausblenden
                    // Häkchen AUS merken (nicht löschen): sonst wäre ein wieder gezeigter Ort sofort angehakt.
                    if (id.startsWith('e:')) delete e.an[id]; else e.an[id] = false;
                    speichereEinstellungen(e);
                    return json(res, { liste: orteListe() });
                }
                case '/api/ort-zeigen': {
                    const e = ladeEinstellungen();
                    e.ausgeblendet = e.ausgeblendet.filter((x) => x !== d.id); speichereEinstellungen(e);
                    return json(res, { liste: orteListe() });
                }
                case '/api/suche': {
                    if (stand.laeuft) return json(res, { laeuft: true });
                    const ids = orteListe().filter((o) => o.an && !o.aus && o.da).map((o) => o.id);
                    Object.assign(stand, { laeuft: true, fertig: false, start: Date.now(), ende: 0, phase: 'Suche startet', ordner: '', fehler: '' });
                    funde = []; gelesen = 0;
                    durchsuchen(ids).then(() => {
                        console.log(`Durchsucht: ${gelesen} Dateien, ${funde.length} Einträge, ${Math.round((Date.now() - stand.start) / 1000)} s.`);
                    }).catch((e) => {
                        console.error('Fehler bei der Suche:', e && e.message);
                        stand.fehler = 'Die Suche ist abgebrochen (Fehler im Werkzeug).';
                    }).finally(() => { stand.laeuft = false; stand.fertig = true; stand.ende = Date.now(); letzterPing = Date.now(); });
                    return json(res, { gestartet: true, orte: ids.length });
                }
                case '/api/stand': return json(res, {
                    laeuft: stand.laeuft, fertig: stand.fertig, phase: stand.phase, ordner: stand.ordner, fehler: stand.fehler,
                    gelesen, funde: funde.length, sek: Math.round(((stand.ende || Date.now()) - stand.start) / 1000),
                });
                case '/api/ergebnis': {
                    if (!stand.fertig) return antwort(res, 409, 'text/plain', 'Suche nicht fertig');
                    return json(res, {
                        gelesen, sek: Math.round((stand.ende - stand.start) / 1000),
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
                case '/api/rotation-info': {
                    const info = rotationInfo(d.id);
                    return info ? json(res, info) : antwort(res, 404, 'text/plain', 'unbekannt');
                }
                case '/api/rotation-plan': {
                    if (stand.laeuft) return json(res, { fehler: 'Erst die laufende Suche abwarten.' });
                    return json(res, planeRotation(d.id, typeof d.neu === 'string' ? d.neu : ''));
                }
                case '/api/rotation-los': {
                    if (stand.laeuft) return json(res, { fehler: 'Erst die laufende Suche abwarten.' });
                    return json(res, fuehreRotationAus(d.planId));
                }
                case '/api/rotation-undo': {
                    if (!undoStapel) return json(res, { ok: false, text: 'Es gibt nichts zurückzunehmen.' });
                    const f = stelleWiederHer(undoStapel); undoStapel = null;
                    console.log('Rotation zurückgenommen.');
                    return json(res, f.length ? { ok: false, text: 'Nicht zurückgesetzt: ' + f.join(', ') } : { ok: true, text: 'Zurückgenommen: alle Dateien sind wieder wie vorher. Bitte neu durchsuchen.' });
                }
                case '/api/ende': json(res, { ok: true }); return setTimeout(() => ende('Knopf „Beenden“.'), 100);
                default: return antwort(res, 404, 'text/plain', 'nicht gefunden');
            }
        } catch (e) {
            console.error('Fehler:', e && e.message);
            return antwort(res, 500, 'text/plain', 'Fehler im Werkzeug');
        } finally {
            // Eine lange Suche blockiert das Programm; die Zeit zählt ab ENDE der Arbeit (Fehler 2026-11-18:
            // Suche > 2 min → Server beendete sich direkt nach der Antwort → „Failed to fetch“ beim Vergleich).
            beschaeftigt--;
            letzterPing = Date.now();
        }
    });
});

// Nur für den Selbsttest (node bin/schluessel-pruefen.mjs --selbsttest <Ordner>): ohne Server.
if (process.argv[2] === '--selbsttest') {
    const ordner = path.resolve(process.argv[3] || '.');
    projekte = [{ name: 'test', pfad: ordner }];
    funde = []; dateien = []; gelesen = 0;
    await walk(ordner, scanProjektDatei, 10, false);
    for (const x of funde) x.codeTreffer = await codeTreffer(x);
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
    setInterval(() => { if (!beschaeftigt && !stand.laeuft && Date.now() - letzterPing > IDLE_MS) ende('2 Minuten keine offene Seite.'); }, Math.min(15000, IDLE_MS / 4));
    if (process.stdin.isTTY) {
        console.log('\nFertig gestartet. Taste drücken zum Beenden.');
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once('data', () => ende('Taste gedrückt.'));
    }
});

# ARBEITSPLATZ_UNIVERSAL — Konten, Werkzeuge und Orte (gilt in JEDER Sitzung)

> **QUELLE:** `CLAUDE_CODE_GUIDELINES/universal/ARBEITSPLATZ_UNIVERSAL.md` (DIES IST DIE QUELLE)
> **STAND:** 2026-10-24 (NEU: Kategorie „Arbeitsplatz“ — Konto wechseln auf Zuruf, auch vom Telefon)
>
> **Diese Datei zielt nicht auf ein Projekt**, sondern auf den Arbeitsplatz des Users:
> welche Claude-Konten es gibt, wo die Werkzeuge liegen und wie Claude auf Zuruf
> handelt — auch wenn der User im Zug sitzt und nur das Telefon hat.
> Sie wird über `C:\Users\pc\.claude\CLAUDE.md` in jede Sitzung geladen, in jedem
> Projekt und unter jedem Konto. **Der User erklärt diese Abläufe nie wieder.**
>
> Bestellt vom User am 2026-10-24: *„Sorge dafür, dass ich es vom Telefon aus und auch
> sonst nie wieder erklären muss, wie wir vorgehen müssen. […] dass du immer weisst, wo
> alle Tools und Informationen liegen, die du brauchst um auf ‚Zuruf‘ die Accounts zu
> wechseln, selbst wenn ich im Zug sitze und nicht an meinen Laptop herankomme.“*
>
> Zitier-Konvention: „ARBEITSPLATZ §n“. Getrennter Nummernraum von UNIVERSAL.

---

## §A1 Wo alles liegt  [B]

| Was | Ort |
|---|---|
| **Konten-Register (eine Quelle)** | `C:\Users\pc\Documents\Phoenix Code\project-hub\projects.json` → `accounts` (Nummer, E-Mail, Chrome-Profil, Konfigurationsordner, aktiv) |
| **Projekt-Register** | dieselbe Datei → `projects` (id, Name, Ordner, Startprompt) |
| **Wechsel-Werkzeug** | `C:\Users\pc\Documents\Phoenix Code\project-hub\bin\konten\konto.ps1` |
| Autostart ein / aus | `…\project-hub\bin\konten\autostart-ein.ps1` / `autostart-aus.ps1` |
| **Fenster für den User** (statt Befehle) | `…\project-hub\bin\konten\konto-ui.ps1`, Verknüpfung „Claude-Konten“ auf dem Desktop. Am Laptop verweist Claude auf das Fenster, nicht auf Befehle. |
| Konto-Seite für das Telefon | project-hub-Website (Abschnitt „Account wechseln“), Quelle `project-hub/index.html` + `js/app.js` |
| Hauptordner von Claude Code | `C:\Users\pc\.claude` (= Konto 1). Weitere Konten: `C:\Users\pc\.claude-konto<N>` |
| Globale Anweisungen | `C:\Users\pc\.claude\CLAUDE.md` (die anderen Konten verweisen per `@~/.claude/CLAUDE.md` darauf) |
| Laufende Server | PID-Dateien `C:\Users\pc\.claude\konten\konto<N>.pid` |
| Chrome | `C:\Program Files\Google\Chrome\Application\chrome.exe`, Profile in `%LOCALAPPDATA%\Google\Chrome\User Data\<Profil>` |
| Watchdog (WLAN) | `C:\Users\pc\Documents\CLAUDE_CODE_GUIDELINES\watchdog\` (Befehle im Projekt-Register → `watchdogs`). Autostart = geplante Aufgabe „WLAN-Watchdog“ (`register-autostart.bat`, Admin); im Fenster „Claude-Konten“ als Häkchen |

Ein neues Konto, ein neues Projekt oder ein geänderter Ort wird **im Register** eingetragen,
nicht in dieser Datei und nicht im Skript.

---

## §A2 Das Modell: jedes Konto bleibt angemeldet  [B]

1. **Ein Konto = ein Konfigurationsordner** (`CLAUDE_CONFIG_DIR`) mit eigener Anmeldung.
   Kein `claude logout` / `claude login` zum Wechseln — das trennt Remote Control und
   verlangt den Laptop.
2. **Geteilt** werden über Verzeichnis-Verbindungen (Junctions) `projects` (Gedächtnis
   und Verlauf), `skills`, `plugins`, `commands`, `agents`; `CLAUDE.md` per Verweis;
   `settings.json` als Kopie, beim Einrichten nachgezogen. Claude weiß unter jedem
   Konto dasselbe.
3. **Ein Konto = ein Chrome-Profil**, auf claude.ai mit genau diesem Konto angemeldet.
   Dann passt die Chrome-Erweiterung immer zum Konto der Sitzung.
4. **Je Konto ein Remote-Control-Server** (`claude remote-control --chrome`) im
   Projektordner. Am Telefon erscheint er in der Claude-App des jeweiligen Kontos
   (Bereich Code) als „Konto N - <Projekt>“.

---

## §A3 Auf Zuruf: „Wechsle auf Konto N“ (auch „Konto N“, „nimm Account N“)  [B]

Claude handelt **ohne Rückfrage** (vom User so bestellt) und erklärt nichts, was hier steht:

1. `powershell -NoProfile -File "C:\Users\pc\Documents\Phoenix Code\project-hub\bin\konten\konto.ps1" status`
2. `… konto.ps1 wechseln N <projekt>` — `<projekt>` ist die id des Projekts, in dem die
   Sitzung gerade arbeitet (Projekt-Register), Vorgabe `myLangSite`.
3. Dem User **einen** kurzen Block geben: „Claude-App → Konto <E-Mail> → Code →
   Sitzung ‚Konto N - <Projekt>‘“. Plus der Startblock bzw. Startprompt des Projekts
   aus dem Register (`startPrompt`), damit die neue Sitzung weiß, wo es weitergeht.
4. Vor dem Wechsel die eigene Arbeit sichern: progress-Datei und
   `WEITERMACHEN_PROMPT.txt` des Projekts auf Stand bringen — die neue Sitzung beginnt
   ohne den Kontext dieser.
5. Den Server des alten Kontos **nicht** beenden (er ist der Rückweg), außer der User
   sagt es.

**Meldet das Skript einen Fehler, gilt:**

| Meldung | Bedeutung | Was Claude tut |
|---|---|---|
| „nicht angemeldet“ / „FALSCH: …“ | Konto N hat keine Anmeldung | Ohne Laptop nicht lösbar. Sagen: „Konto N ist noch nicht eingerichtet; am Laptop einmal `konto.ps1 anmelden N`.“ Ein anderes angemeldetes Konto anbieten (aus `status`). |
| „vertraut dem Ordner … noch nicht“ | Sicherheitsfrage nie beantwortet | Ohne Laptop nicht lösbar (Claude umgeht sie nie). Am Laptop: `konto.ps1 vertrauen N <projekt>`. Anderes Projekt oder Konto anbieten. |
| „läuft schon“ | Server ist da | Nur Punkt 3 ausgeben. |
| „Chrome-Profil … fehlt“ (status) | Profil nie angelegt | Wechsel geht trotzdem; Chrome-Werkzeuge fehlen bis zur Einrichtung (§A4). |

---

## §A4 Einmal je Konto, am Laptop (macht der User, Claude gibt die Befehle)  [B]

1. Im Chrome-Profil des Kontos (`konto.ps1 chrome N`): auf claude.ai mit diesem Konto
   anmelden, Claude-Erweiterung installieren/einschalten.
2. `konto.ps1 anmelden N [projekt]` (oder Knopf „Anmelden“ im Fenster) — startet
   `claude auth login` mit `BROWSER` = Starter `~/.claude/konten/browser-konto<N>.cmd`, der
   Chrome **im Profil dieses Kontos** öffnet. Der User klickt nur „Autorisieren“, **kein
   Code** (Befund 2026-10-24: über den Standard-Browser landete die Anmeldung von Konto 2
   und 3 im Profil von Konto 1 und damit beim falschen Konto; der Weg mit Code scheiterte
   am Einfügen). Im selben Fenster fragt danach Claude nach dem Ordner-Vertrauen.
   Claude kann die Anmeldung selbst starten; das Klicken bleibt beim User.
3. Weitere Projekte: `konto.ps1 vertrauen N <projekt>`.
4. Einmalig für alle: `autostart-ein.ps1` — beim Windows-Start laufen die Server aller
   angemeldeten Konten (`konto.ps1 alle`). **Das ist der Schutz für den Zug:** ist das
   Limit eines Kontos erreicht, antwortet dessen Sitzung nicht mehr und kann nichts
   mehr wechseln — dann wählt der User am Telefon einfach das andere Konto, dessen
   Server schon läuft.

Claude gibt nie Passwörter oder Codes ein und liest keine Tokens (`.credentials.json`).
Anmelden und Vertrauen bestätigt immer der User.

---

## §A5 Pflege  [B]

- Ändert sich der Ablauf, wird **diese Datei** geändert (Repo CLAUDE_CODE_GUIDELINES),
  danach das Skript; die Konto-Seite der project-hub-Website zeigt denselben Weg.
- `konto.ps1 status` ist der Prüfstand: angemeldet mit der richtigen E-Mail? Server?
  Chrome-Profil?
- Was ein Konto kann, steht nur im Register — kein zweites Verzeichnis der Konten
  (keine Liste der E-Mails in CLAUDE.md, Gedächtnis oder Projekten).

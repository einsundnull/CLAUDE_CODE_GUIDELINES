# JAVA_GUIDELINES_UNIVERSAL — verbindliche Standards für ALLE Java-Projekte

> **QUELLE:** `CLAUDE_CODE_GUIDELINES/universal/JAVA_GUIDELINES_UNIVERSAL.md`
> (DIES IST DIE QUELLE)
> **STAND:** 2026-09-29 (§20 NEU: Tooltips sprechen zum Benutzer und verdecken kein offenes Fenster); davor 2026-09-28 (§19 NEU: Kennung jedes Bedienelements; §18 NEU: Quick Buttons); davor 2026-09-27 (§17 NEU: Text-Werkstatt); davor 2026-09-05
>
> **Umzug am 2026-09-05:** Diese Datei lag bis dahin in
> `C:\Users\pc\eclipse-workspace\GameLoop2\`. Das war der Grund, warum sie
> aktueller war als alles im damaligen Guidelines-Ordner: sie wurde dort
> gepflegt, wo gearbeitet wurde. Der Inhalt ist unverändert übernommen (Stand
> 2026-09-04); GameLoop2 liest sie ab jetzt von hier.

> **Status: VERBINDLICH ab 2026-07-30** für jedes Java-Projekt in
> `C:\Users\pc\eclipse-workspace\`. Abgeleitet aus den GameLoop2-Guidelines
> (`GameLoop2/src/main/doc/GUIDELINES.md`) durch Herauslösen aller
> projektunabhängigen Regeln.
>
> **Diese Datei ist projektneutral.** Sie enthält keine Klassennamen eines
> einzelnen Projekts, sondern **Rollen** (Token-Quelle, Fenster-Basisklasse,
> Persistenz-Paar …). Jedes Projekt legt in seiner eigenen
> `doc/GUIDELINES.md` einen **Projekt-Steckbrief** (§14) an, der diese Rollen
> mit konkreten Klassen besetzt, und ergänzt projektspezifische Paragraphen.
>
> **Lesereihenfolge für jede Aufgabe:**
> 1. diese Datei · 2. `<Projekt>/doc/GUIDELINES.md` · 3. `doc/Prompt_Handling.txt`
> · 4. `doc/WEITERMACHEN_PROMPT.txt` · 5. die aktive `Task_*.txt` (PD)

---

## §0 Leitprinzip: unnötige Schritte nicht ausführen

Aus `Prompt_Handling.txt`. **Eine funktionierende Architektur wird NICHT nur
umgebaut, um diesen Regeln zu genügen.**

- Die Regeln gelten verpflichtend für **neuen und berührten** Code.
- Reines Refactoring bestehender, laufender Logik allein zur Regelkonformität
  ist ein „unnötiger Schritt" und wird als solcher markiert und begründet.
- Jede Regel trägt eine Risikoklasse:
  **[A]** großes ROI · **[B]** 100 % sicher · **[C]** größeres Risiko
  (nur mit separater Freigabe + Audit im `doc/`).
- Ein Regelverstoß im Bestand ist eine **dokumentierte Altlast**, kein Auftrag.
  Er wird im `doc/` und in der `WEITERMACHEN_PROMPT.txt` geführt, bis er
  bearbeitet wird.

**Die drei häufigsten unnötigen Schritte, namentlich [A]:**

1. **Gerüst auf Vorrat.** Eine Basisklassen-Familie für ein Programm aus drei
   Dateien ist mehr Gerüst als Programm. Jede Struktur dieser Datei hat einen
   **Auslöser** (§14), und vor dem Auslöser ist ihr Bau der teuerste Weg,
   Regelkonformität vorzutäuschen. Umgekehrt gilt: **was ab der ersten Zeile
   nichts kostet, wird ab der ersten Zeile gemacht** — eine Token-Quelle ab
   der ersten Farbe (§3), die Schichtenregel als Aufrufregel ab Tag eins (§4).
   Nachträglich ist beides [C].
2. **Umsortieren, was zitiert wird.** Eine Umbenennung oder ein
   Verzeichnis-Split, der hunderte bestehende Zitate **still** falsch macht,
   ist §9 an hunderten Stellen gleichzeitig — für null Funktionsgewinn.
   Gemessen in GameLoop2 2026-08-23: 490 Zitate der Form `doc/<datei>` im
   Produktivcode; ein Unterordner-Split des flachen `doc/` wurde deshalb
   ausdrücklich verworfen. Aufgeräumt wird, **was am falschen Ort liegt**,
   nicht die Ordnung innerhalb eines zitierten Ortes.
3. **Optimieren ohne Messung** (§13).

**Die Strenge dieser Datei skaliert mit der Lebensdauer des Projekts.** Die
Steckbrief-Zeile „Wegwerf-Werkzeug oder Langläufer" (§14) ist deshalb eine
Pflichtantwort: bei einem Wegwerf-Werkzeug sind §1, §2 und §13 Angebote, bei
einem Langläufer sind sie verbindlich.

---

## §1 Graphify-First (KnowledgeMap)  [A/B]

- **Der Graph hat eine Untergrenze [B].** Unterhalb von grob **30
  Quelldateien** kostet er mehr, als er einbringt — dort ist ein Verzeichnis
  einmal durchlesen schneller als jede Abfrage. Der Steckbrief (§14) hält
  fest, ob das Projekt die Schwelle überschritten hat; ein leeres
  `graphify-out/` ist schlechter als der ehrliche Satz „lohnt hier noch
  nicht". Oberhalb der Schwelle gilt der Rest dieses Paragraphen unverändert.
- Projektüberblick und Navigation **zuerst über den Graphen**, nicht über
  reihenweises Datei-Lesen: `graphify-out/GRAPH_REPORT.md` lesen, dann
  `graphify query "..."` / `explain "X"` / `path "A" "B"` gegen
  `graphify-out/graph.json`.
- Der Graph ist **code-only** (AST der `.java`-Dateien). Ausgeschlossen:
  `doc/`, `bin/`, `graphify-out/`, generierte und binäre Dateien.
- **Nach Struktur-/Funktionsänderungen auffrischen** — gezielt
  `graphify <datei>.java --update`. **Kein** Voll-`graphify update .` bei
  gefilterter Scope (Scope-Falle: re-extrahiert alles, auch das
  Ausgeschlossene). Voller Rebuild nur nach großen Umbauten.
- `graph.json` nie komplett in den Chat lesen — nur per CLI/Feld-Query.
  Das Format ist **node-link**: die Kantenliste heißt `links`, **nicht** `edges`.
- **Der Graph beantwortet „wie hängt es zusammen", nicht „ist das tot" [B].**
  Externe Bibliothekstypen (`JPanel`, `ArrayList`, `Callbacks`) liegen als
  **mehrere** Knoten vor — je einer pro Datei, die sie erwähnt, mit genau
  dieser `source_file`. Wer Kanten auf Dateiebene aufrollt, liest daraus
  „Datei A referenziert Datei B", obwohl beide nur dieselbe Oberklasse
  benutzen. **Eine Löschentscheidung wird deshalb nie allein aus dem Graphen
  begründet, sondern mit einer Textsuche über den Quellbaum belegt**
  (gemessen an TransparencyTool 2026-07-30: der Graph meldete für eine tote
  Klasse 28 Referenzen, tatsächlich waren es null).

---

## §2 Basisklassen-Pflicht (One Source of Truth für UI)  [A/B]

Jedes Projekt benennt in seinem Steckbrief (§14) seine Basisklassen-Familie.
Ab Benennung gilt: **kein UI-Element umgeht sie.**

| Rolle | Pflicht für |
|---|---|
| **Fenster-Basisklasse** | **Jedes** Fenster/Dialog. Nie roh `new Frame`/`new JFrame`/`new JDialog`/`new JWindow`. |
| **Zeichenflächen-Basisklasse** | **Jede** eigengezeichnete Fläche; flickerfrei über EINE Render-Methode. Die Roh-Zeichenmethode der Plattform (`paint()`/`paintComponent()`/`update()`) wird nicht in Fachklassen überschrieben. |
| **Panel-Basisklasse(n)** | Jede wiederkehrende zusammengesetzte UI-Einheit (Sidebar, Liste, Overlay, Toolbar). |
| **Bestätigungs-Dialog** | **Alle** Ja/Nein-/Warn-/Fehler-Abfragen. Nie eigene Ja/Nein-Gerüste, nie plattform-Standarddialoge (`JOptionPane` & Co.) in Fachcode. |
| **Grafik-Utility (statisch)** | Grafik-Helfer (Antialiasing, Distanz, Skalieren, Alpha-Ableitung) für Klassen **außerhalb** der Fenster-Hierarchie. |

- **Neue wiederkehrende UI-Typen** bekommen eine eigene `Base<Typ>`-Klasse,
  sobald sie **≥2×** auftreten. Reihenfolge Pflicht: **erst Redundanz-Audit
  im `doc/` (`Audit Redundanz <Thema> <Datum>.txt`), dann Extraktion.**
- Eine **Factory-Methode ist keine Basisklasse.** Wenn eine Factory ein
  Fenster/Widget nur konfiguriert zurückgibt, ist damit das Aussehen geteilt,
  aber nicht das Verhalten (Tastatur, Resize, Schließen, ESC/ENTER). Sobald
  das Verhalten zum zweiten Mal kopiert wird, ist die Basisklasse fällig.

---

## §3 Ein StyleGuide, eine Token-Quelle  [A / Erstbereinigung C]

- **Alle** Farben, Fonts, Abstände, Radien, Stroke-Breiten stammen aus
  **einer** projektweit sichtbaren Quelle (`Theme` / `Palette` / `AppColors`,
  `public static final`).
- **Kein** verstreutes `new Color(...)` / `new Font(...)` /
  `new BasicStroke(...)` in Dialogen, Panels, Renderern oder im Hauptfenster.
- Die Token-Quelle ist **nicht `protected` in einer Basisklasse.** Sonst
  können Klassen außerhalb der Hierarchie sie nicht nutzen und erfinden eigene
  Werte — der häufigste Weg, wie eine Palette zerfällt.
- Alpha-/Hell-/Dunkel-Varianten werden aus der Token-Farbe **abgeleitet**
  (`alpha(Color,int)`, `.darker()`), nie als zweites RGB-Tripel getippt.
- Konvention der Namen: `BG_*` (Flächen), `FG_*`/`TEXT_*` (Text),
  `FONT_*` (feste, abgezählte Font-Menge), fachliche Präfixe für
  Bedeutungsfarben. Eine Bedeutung = ein Token.
- **Erstbereinigung ist [C]:** inkrementell pro Datei mit Sichtprüfung, nie
  in einem Rutsch. Zwei Token mit gleichem RGB sind **nicht** automatisch
  dasselbe Token — vor dem Zusammenlegen prüfen, ob die Bedeutung dieselbe
  ist, und die Entscheidung als Kommentar festhalten.

---

## §4 Schichten-Trennung (Abhängigkeitsregel zuerst, Package-Split später)  [A / Split C]

Konzeptionelle Schichten — **als Aufruf-/Abhängigkeitsregel sofort
verbindlich**, unabhängig davon, ob die Packages physisch existieren:

```
core     Orchestrierung, Lebenszyklus, Verdrahtung, Hauptfenster
model    Domäne, reine Daten/Logik
io       Persistenz + Laden (Reader/Writer/Loader)
render   Zeichnen
ui       Fenster/Dialoge/Panels/Toolbars
theme    Tokens (§3)
```

**Regeln (gelten sofort, ohne Umzug):**
- `model` kennt kein Rendering und keine IO-Pfade.
- `io` kennt keine UI; Persistenz **ausschließlich** über die `*Reader`/
  `*Writer` — kein ad-hoc Datei-Schreiben/-Parsen irgendwo sonst (§6).
- `render` **liest** aus `model` und **schreibt nicht zurück.** Teure oder
  zustandsändernde Berechnungen gehören in den Update-/Controller-Pfad.
- **[C] Physischer Package-Split** erst nach separater Freigabe — er erzwingt
  viele Sichtbarkeits-/Import-Änderungen, wenn heute alles in einem Package
  liegt. Die „wer darf wen aufrufen"-Regel gilt schon vorher.

---

## §5 God-Klassen: nichts Neues hineinlegen  [A-Regel / Extraktion C]

Jedes Projekt benennt im Steckbrief (§14) seine größte Klasse.

- **Verbindliche Regel [A/B]:** Neue Fachlogik landet **nicht** weiter in der
  God-Klasse. Zielbild: dünner Orchestrator (Verdrahtung + Lebenszyklus).
- **Extraktion ist [C]** und passiert nur **opportunistisch bei Berührung**,
  jede mit Verhaltens-Audit im `doc/`. **Keine Big-Bang-Zerlegung.**
- Vor jeder Extraktion wird eine **Extraktions-Landkarte** aus dem Graphen
  (§1) erzeugt: Methoden nach Community/Verantwortung gruppiert, mit
  Zielklasse und Zeilennummer. Ohne Landkarte keine Extraktion.
- Beim Extrahieren wandert die Logik in die Schicht, in die sie gehört (§4) —
  nicht in eine neue Sammelklasse gleicher Art.

---

## §6 Persistenz-Format-Standard  [A/B]

- **Ein `*Reader` + ein `*Writer` pro Entitätstyp.** Kein Parsen/Schreiben
  des Formats anderswo — Single Source of Truth fürs Format.
- Das Dateiformat jedes Typs wird in **einem** `Schema_<Typ>.txt` im `doc/`
  beschrieben. Bei projektübergreifend gelesenen Formaten ist dieses Schema
  ein **Vertrag** (§7).
- **Pflicht:** UTF-8 · Zielverzeichnis vor dem Schreiben anlegen
  (`Files.createDirectories`) · Fehler über `System.err` (**kein stilles
  Verschlucken**, kein leerer `catch`) · Manifest-/Index-Dateien beim Laden
  überspringen.
- **Fehlender Key = dokumentierter Default.** Eine ältere Datei muss
  unverändert laden. Ein Feld ohne Bedeutung wird **nicht** geschrieben
  (optionale Werte nur bei Abweichung vom Default) — dann bleiben alte
  Dateien byte-identisch.
- **Ein Bildformat pro Zweck**, an einer Stelle geschrieben. Pixel-Export
  gehört in die `io`-Schicht, nicht in Controller und Panels.
- **Autosave-Konvention** wird pro Projekt festgelegt (z. B. bei
  `mouseReleased`, sofort nach Add/Delete) und gilt dann einheitlich.

---

## §7 Formate zwischen Projekten sind Verträge  [A/B]

Sobald **zwei** Programme dieselbe Datei lesen oder schreiben:

- Das Format gehört **einem** Projekt (dem Erzeuger). Das Schema im `doc/`
  des Erzeugers ist die Wahrheit; das lesende Projekt verweist darauf.
- **Rückwärtskompatibel erweitern**, nie umdeuten: neue Keys sind optional,
  bestehende Keys ändern ihre Bedeutung nicht.
- **Legacy-Formate werden gelesen, nicht geschrieben** — und im Schema als
  „nur lesen" markiert. **Diese Regel schließt Byte-Identität ausdrücklich
  aus [B]:** eine Datei mit Legacy-Key kommt aus dem Roundtrip
  zwangsläufig **anders** zurück, weil der Writer den Key absichtlich nicht
  mehr schreibt. Wer für solche Dateien „byte-identisch" zusichert — im
  Schema, in einer PD oder in einem Prüfstand —, sichert das Gegenteil dieser
  Regel zu und bekommt einen roten Strich für korrekten Code. Die zulässige
  Zusage lautet **„der einzige Unterschied ist das Verschwinden der
  Legacy-Zeile"**, und die Liste der Legacy-Keys gehört als benannte
  Konstante an die prüfende Stelle. (Gemessen in GameLoop2 2026-08-25:
  fünf von dreizehn KeyArea-Dateien, `-mouseTransparent`.)
- Eine Formatänderung ist immer [C] und braucht einen Eintrag in **beiden**
  Projekten (`doc/` + `WEITERMACHEN_PROMPT.txt`).

---

## §8 Namens- & Datei-Konventionen  [B]

- Klassen `PascalCase`. Verbindliche Suffixe:
  `*Dialog` (Fenster) · `*Reader`/`*Writer` (Persistenz) · `*Renderer`
  (Zeichnen) · `*Panel` (zusammengesetzte UI) · `*Canvas` (gezeichnete
  Fläche) · `*Controller` (Fachlogik-Bündel) · `*Factory` (Erzeugung) ·
  `*Manager` (Lebenszyklus/Registry) · `Base*` (Basisklasse).
- Eine öffentliche Top-Level-Klasse pro Datei; Dateiname = Klassenname.
- Javadoc-Kopf mit der **Rolle** der Klasse (ein Satz: wofür, und was sie
  ausdrücklich nicht tut).
- Deutschsprachige Kommentare/Titel sind Konvention; Bezeichner
  englisch/gemischt wie gewachsen.
- **`*Legacy`/`*Demo`/`*Test`-Dateien im Produktivbaum sind Altlasten.**
  Sie werden im `doc/` gelistet mit Vermerk „tot / abhängig / zu löschen".
  Löschen ist [B] **nachdem** die Referenzfreiheit im Graphen (§1) belegt ist.

---

## §9 Dokumentations- & Mockup-Pflicht  [B]

- **Alle Projektdokumente liegen in `doc/`.** Kein loses `.md`/`.txt` im
  Projekt-Root oder im Quellbaum. Der Quellbaum enthält Code.
- **ASCII-Schema = Mockup-First.** Vor neuem/geändertem Dialog- oder
  Overlay-Layout zuerst ein `Schema_<Thema>.txt`-Mockup im `doc/` →
  **Freigabe** → Implementierung.
- **Redundanz-Audit vor Basisklassen-Extraktion** (`Audit Redundanz *.txt`).
- **Jede Ausnahme** von diesen Guidelines wird als Code-Kommentar **und** im
  `doc/` begründet.
- **Eine veraltete Datei behält nie ihren Originalnamen [B].** Ein Altstand
  wird mit `<DATUM>`-Suffix archiviert — **auch dann, wenn die bereinigte
  Neufassung woanders angelegt wurde.** Beleg aus GameLoop2: eine
  `doc/WEITERMACHEN_PROMPT.txt` trug ab 2026-08-01 einen VERALTET-Kopfblock,
  hieß aber weiter wie die aktive Datei — **elf** Zitate zeigten fast drei
  Wochen lang auf den falschen Inhalt. Ein **toter** Verweis ist harmloser als
  ein **irreführender**: der tote meldet sich beim ersten Öffnen, der andere
  nie. Dasselbe gilt für **Kopien fremder Dokumente**: sie tragen im Kopf
  Quelle und Stand, und beim Erneuern wird das Datum mitgezogen.
- **Dokumentation, die dem Code widerspricht, ist ein Bug.** Wer eine
  Struktur ändert, korrigiert im selben Schritt `CLAUDE.md`/`doc/`. Eine
  veraltete Architekturbeschreibung ist schlimmer als keine — sie wird
  geglaubt.
- Jedes Projekt hat eine `CLAUDE.md` im Root mit: Build-Befehl, Run-Befehl,
  Einstiegspunkt, Verweis auf diese Datei und auf `doc/GUIDELINES.md`.

---

## §10 Task-Workflow für größere Änderungen  [B]

Aus `Prompt_Handling.txt` (liegt als Kopie in jedem `doc/`):

- Größere Aufgabe **[BT]** → `Task_<DateTime>_<Name>.txt` (PD) im `doc/`;
  Schritte `[m/n]` mit Risikoklasse `[A]/[B]/[C]`; Model-Empfehlung;
  „unnötige Schritte" markieren + begründen. Zwischenschritte werden als
  `[n+i.j/m]` eingefügt.
- Kleine Aufgabe **[ST]** → keine PD, aber `progress_<DateTime>_<Name>.txt`.
- `progress_<DateTime>_<Name>.txt` nach **jedem** Schritt: Prompt,
  Zusammenfassung, Vorschläge, tatsächliche Lösung, Runtime-Verify-Liste.
- `WEITERMACHEN_PROMPT.txt` zum Fortsetzen nach `/clear`; nennt immer die
  aktive PD. Wird sie zu lang: mit `<DATUM>`-Suffix archivieren und bereinigt
  neu anlegen (nur offene TODOs).
- **Abschluss-Block** als letzte Zeilen jeder Ausgabe:
  PD aktualisiert? · progress aktualisiert? · WEITERMACHEN aktualisiert? ·
  WEITERMACHEN bereinigt/archiviert? · Aufgabe vollständig? · nächster
  Schritt? · `/clear` + WEITERMACHEN empfohlen? ·
  **Bewusst NICHT gemacht: <Liste + Grund>**.
- **Die letzte Zeile ist die wichtigste [B].** Was ausgelassen, verworfen oder
  bewusst anders entschieden wurde, wird **namentlich** genannt — auch eine
  eigene Empfehlung, die der User verworfen hat, und der Grund dafür. Ein
  Abschluss-Block, der nur „erledigt" meldet, verschweigt genau die
  Information, die der nächste Einstieg braucht.
- **Runtime-Verify gehört dem User.** Was nur zur Laufzeit sichtbar ist, wird
  als benannte Checkliste (`A1-A9`) in der progress-Datei hinterlassen, nicht
  als „funktioniert" behauptet. „Build grün" ist kein Verify.

---

## §11 Tastatur & Maus: ein Register als Single Source of Truth  [B]

- **Jede** über Taste/Tastenkombination/Maus-Geste auslösbare Funktion steht
  in **einer** statischen Registry (`KeyBinding{combo, scope, description}`).
  Neue Funktion → **zuerst** Eintrag in der Registry, **dann** Handler-Code.
  Kein „stiller" Shortcut.
- Ein **Hilfe-Dialog** speist sich ausschließlich aus dieser Registry und
  enthält **keinen** eigenen Text. Er beantwortet drei Fragen:
  **Tasten** (Scopes Global/Canvas/Dialog) · **Maus** (Gesten in
  Trefferreihenfolge des Codes) · **Anleitung** (kurze Abläufe in
  Klick-Reihenfolge; **neue Funktion = ein Absatz**, sonst ist sie in der UI
  nicht auffindbar).
- **Welche Taste die Hilfe öffnet, legt das Projekt fest** (§14) — sie kann
  belegt sein. Nicht blind `F1` annehmen.
- **Konflikte dokumentieren:** Mehrfachbelegungen werden in der Registry mit
  Vermerk geführt, bis sie aufgelöst sind — nicht verschweigen.
- Beschreibungen werden im Dialog **umgebrochen, nie abgeschnitten.**
- Eine **handgepflegte Shortcut-Tabelle im `doc/` ist keine Registry.** Sie
  veraltet lautlos; sobald die Registry existiert, wird die Tabelle daraus
  erzeugt oder gelöscht.

---

## §12 Einstellungen sind persistent  [B]

- **Ein globaler Schalter, der eine Taste oder einen Kopf-Button hat,
  überlebt den Neustart.** Ablage über ein §6-Paar in einem
  Benutzerverzeichnis (`%APPDATA%/<Projekt>/…`), Format im `doc/`
  beschrieben. Neuer Schalter → **zuerst** Feld in der Settings-Klasse,
  dann Handler, dann Speicher-Aufruf im Umschalter.
- **Werte werden beim Speichern aus dem Live-Zustand abgeleitet**, nie in
  Schattenfeldern mitgeführt — sonst desynchronisiert ein zweiter Bedienweg
  (Taste vs. Dialog) die Datei.
- **Fehlender Key = bisheriger Laufzeit-Default.** Eine fehlende Datei muss
  exakt das alte Startverhalten ergeben.
- **Gelesen wird genau einmal** beim Start, an einer definierten Stelle im
  Lebenszyklus, und nur solange nicht zurückgeschrieben.
- **Per-Element-Zustand bleibt beim Element.** Ein globaler Wert darf
  Elemente nur ausblenden, nie pauschal einblenden — sonst überschreibt der
  Start die individuelle Sichtbarkeit.
- Der Dateiname sagt das Format (`.json` ⇒ JSON, `.txt` ⇒ Zeilenformat). Ein
  `.txt` mit JSON-Inhalt ist eine Falle für jedes lesende Werkzeug.

---

## §13 Mess-Budget: gemessen wird vor optimiert  [A/B]

- **Ein Optimierungsschritt ohne vorherige Messung ist ein „unnötiger
  Schritt".** Erfahrungswert aus GameLoop2: von drei aus dem Code
  hergeleiteten Performance-Befunden traf genau **einer** zu; der größte
  Lastfall stand nicht in der Planung.
- Das Projekt hat eine **Mess-Anzeige** mit Phasenliste (welcher Pass kostet
  die Zeit) und einen **Kopier-Shortcut**, der die Werte als Text mit
  Zeitstempel und **Zustandszeile** (Modus, Sichtbarkeiten, Elementzahlen)
  ablegt. Messungen werden **übernommen, nicht abgetippt** — ohne
  Zustandsvermerk ist ein Vorwert nicht reproduzierbar.
- **Zwei Takte, eine Bewegungsmathematik:** Logik-Takt fix und nachgeholt,
  Zeichen-Takt gedeckelt und bei Rückstand **verworfen**.
- **Keine Allokation im Zeichenpfad** (`new Color`/`new Font`/`new
  BasicStroke`/Streams/Comparatoren pro Frame) — Verschärfung von §3 auf die
  Renderer.
- **Skalierte Bilder werden gecacht, nicht pro Frame gerechnet.** Caches mit
  verschiedenen Zwecken (Dekodierung, Anzeigegröße, Thumbnail) werden
  **nicht zusammengelegt** — sie würden sich gegenseitig pro Frame verwerfen.
  Invalidierung hängt an der Bild-**Referenz**: wer ein Bild *in place*
  bemalt, umgeht alle Caches.
- **Bedarfs-Redraw wird festgestellt, nicht gemeldet [A/C].** Keine
  Meldepflicht für einzelne Handler (jede vergessene Stelle = stehendes
  Bild), sondern Quellen an der Wurzel + **Pflicht-Sicherheitsnetz**
  (spätestens jedes n-te fällige Bild wird unabhängig gezeichnet) +
  **Ausschalter** als Notausgang.
- **Eine Kennzahl, die ohne Erklärung wie ein Einbruch aussieht, gehört
  nicht ins Overlay** — sie erklärt sich selbst (z. B. „Ruhe: x % gespart").

---

## §14 Projekt-Steckbrief (jedes Projekt füllt das aus)

Die `doc/GUIDELINES.md` jedes Projekts beginnt mit dieser Tabelle. Sie
besetzt die Rollen dieser Datei und ist der Grund, warum es je Projekt keine
zweite Regelkopie braucht.

**Ausfüll-Pflicht [B]: kein Feld bleibt leer, und kein Feld wird geraten.**
Wo eine Rolle noch nicht besetzt ist, steht **nicht** „—", sondern der Satz
**„existiert nicht — Auslöser: <namentliche Bedingung>"** (z. B. „ab dem
zweiten eigenen Fenster", „ab dem zweiten Panel-Typ"). Ein leeres Feld ist
nicht unterscheidbar von einem vergessenen; ein benannter Auslöser macht aus
einer Lücke eine **Terminsache**. Vorbild: `PixelArt/doc/GUIDELINES.md`.

| Rolle | Projekt-Klasse/Wert | Auslöser, falls (noch) nicht vorhanden |
|---|---|---|
| Sprache + Version | | — |
| Projektpfad | | — |
| **Lebensdauer: Wegwerf-Werkzeug oder Langläufer?** | | — |
| **Größter denkbarer Datenverlust** | | — |
| UI-Toolkit | AWT / Swing / … | |
| Einstiegspunkt + Run-Befehl | | |
| Build-Befehl + erwartete Artefaktzahl | | |
| Prüfstand: Startbefehl + erwarteter Stand (§13/§10) | | |
| Wer führt Git/Deploy aus | | — |
| Token-Quelle (§3) | | |
| Fenster-Basisklasse (§2) | | |
| Zeichenflächen-Basisklasse (§2) | | |
| Panel-Basisklassen (§2) | | |
| Bestätigungs-Dialog (§2) | | |
| Grafik-Utility (§2) | | |
| Schichten-Ist: Packages (§4) | | |
| God-Klasse(n) (§5) | | |
| Persistenz-Paare (§6) | | |
| Format-Verträge nach außen (§7) | | |
| Settings-Klasse + Ablageort (§12) | | |
| Shortcut-Registry + Hilfe-Taste (§11) | | |
| Mess-Anzeige + Kopier-Shortcut (§13) | | |
| Graphify-Scope (§1) | | |
| Text-Werkstatt + Sprachdateien (§17) | | |

**Die vier fett gesetzten Zeilen haben keinen Auslöser — sie sind
Pflichtantworten vor der ersten Zeile Code**, weil sie alles andere steuern:

- **Lebensdauer** entscheidet über die halbe Strenge dieser Datei. Ein
  Wegwerf-Werkzeug braucht keine Basisklassen-Familie und keinen Graphen; ein
  Langläufer braucht beides, bevor er weh tut.
- **Größter denkbarer Datenverlust** bestimmt, welche Regel im Projekt
  **ganz oben** steht. Wer diese Frage nicht stellt, gewichtet §6 und §12
  nach Gefühl.
- **Prüfstand** und **Git/Deploy-Zuständigkeit** verhindern die zwei
  häufigsten Missverständnisse: „grün" ohne Messung, und ein Push, den
  niemand bestellt hat.

---

## §15 Nicht anwendbar (aus den Web-Guidelines)

i18n/Fallback-Ketten · Barrierefreiheit/WCAG · DSGVO/Fonts/Cookies/CSP ·
No-Build/ES5/IIFE · HTML/CSS/JS-Trennung.

Grund: interne, einsprachige Desktop-Werkzeuge ohne Web/Server/Netz. Die
inhaltlichen Prinzipien sind übersetzt: Mockup-Pflicht → §9 · Basisklassen
(`base_<type_subtype>`) → §2 · Design-Tokens → §3 · Schichtentrennung → §4.

**Ausnahme:** Sobald ein Java-Projekt eine DB/API anbindet, wird **vor**
Beginn geklärt, welche (Frage aus `Prompt_Handling.txt`), und die
Architektur-Regeln werden um eine `service`-Schicht zwischen `core` und `io`
ergänzt. Ohne diese Klärung wird keine Persistenz-Architektur entworfen.

---

## §16 Wie du fragst und wie du ausgibst  [B]

> **Verbindlich ab 2026-09-04**, bestellt vom User in GameLoop2. Die
> Formatvorlage steht im Wortlaut in `Prompt_Handling.txt` (Abschnitt „DAS
> FORMAT FÜR FRAGEN UND ANWEISUNGEN") — **dort wird geändert**, hier steht die
> Regel. Zwei Wortlaute derselben Vorlage würden driften (§9).

**Der Anlass ist kein Geschmack, sondern ein Fehler, der passiert ist.** Der
User: *„Die Ausgaben und vor allem die Sätze und ihre Formulierungen sind für
mich oft unverständlich und in dem Vielen Text oft nicht zu finden."* Eine
Frage, die er nicht findet oder nicht versteht, beantwortet er nicht — und
dann wird auf einer **Annahme** weitergebaut. Das ist ein Fehlerrisiko.

- **Ein Gedanke pro Satz.** Kurze Sätze; was über zwei Zeilen geht, wird
  geteilt. Fachwörter werden im Halbsatz miterklärt.
- **Keine Paragraphen-Nummern in der Frage selbst** (§9, §45 …). Sie gehören
  in den Bericht. Der User soll entscheiden, nicht nachschlagen.
- **Die Frage steht allein.** Befund, Messung und Begründung stehen davor oder
  in der `progress`-Datei — nicht im selben Block.
- **Fragen und Anweisungen bekommen einen eigenen, sichtbaren Block** am
  **Ende** der Ausgabe, direkt vor dem Abschluss-Block (§10), nie mitten im
  Fließtext: `Question:` mit `─`-Linien, `Instruction:` mit `~`-Linien,
  durchnummeriert, Folgezeilen um 3 Zeichen eingerückt, Trennlinie über der
  ersten, zwischen jeder Nummer und unter der letzten. Bei einer Anweisung ist
  **jede Zeile ein Schritt**. Gibt es nichts zu fragen und nichts zu tun,
  entfällt der Block — einer auf Vorrat ist Lärm.
- **Auch der übrige Text wird kürzer:** das Wichtigste zuerst; Herleitung und
  Messprotokoll gehören in die `progress`-Datei, in der Antwort steht das
  Ergebnis und wo der Beleg liegt.
- **Ein Skript, das der User startet, schließt sich nicht selbst.** Jede
  `.sh`/`.bat`/`.ps1`, die er selbst aufruft, endet mit einer Warte-Zeile auf
  **einen** Tastendruck — Enter, ESC oder jede andere Taste (`read -n 1 -s -r`,
  **nicht** `read -p`, das Enter verlangt und ESC ignoriert). Sonst schließt
  sich das Fenster, bevor er die Ausgabe lesen kann; eine Ausgabe, die niemand
  liest, ist so gut wie nicht geschrieben — und sie erweckt den Eindruck, es
  sei etwas geprüft worden. Die Warte-Zeile steht am Ende **auch im
  Fehlerfall**, lässt den Exit-Code unverändert und entfällt, wenn die Eingabe
  kein Terminal ist (`[ -t 0 ]`) — sonst hängt jeder automatisierte Aufruf.
  Ab dem **zweiten** Skript bekommt sie einen eigenen Baustein (§2), nicht
  dreimal dieselben fünf Zeilen. Wortlaut und Referenz-Umsetzung:
  `Prompt_Handling.txt`, Abschnitt „EIN SKRIPT SCHLIESST SICH NICHT SELBST“,
  und `bin/_wait.sh` im Guidelines-Repo.

> **Diese Regel widerspricht der Gewohnheit ausführlicher Akten, und der
> Widerspruch wird zugunsten des Users aufgelöst.** Die Dokumente bleiben
> ausführlich; die **Ausgabe an den User** ist nicht das Dokument.

---

## §17 Text-Werkstatt: jeder Text einer Oberfläche ist bearbeitbar, prüfbar, übersetzbar  [A/B]

> **Verbindlich ab 2026-09-27**, bestellt vom User im Projekt Schnittmuster
> (Vorbild: die Prüfseite der Tooltip-Texte, `bin/make-tooltip-review.js` →
> `doc/tooltip-texte-pruefen.html`, mit Feldern je Teil, Vorschau,
> „Als Datei speichern“).

**Die Regel:** Jedes Programm, das nach diesen Guidelines gebaut wird, führt
ALLE sichtbaren Texte — Beschriftungen, Knöpfe, Tooltips, Hilfe, Meldungen,
Fehlertexte, Seitentexte — in **Sprachdateien** und hat eine
**Text-Werkstatt**: eine Seite aus HTML/JS/JSON, auf der der User

1. **sieht, welcher Text wo steht** — je Eintrag der Schlüssel, der Ort
   (Knopf, Fenster, Abschnitt, Seite; bei Oberflächen aus der laufenden
   Anwendung gelesen, nicht von Hand gelistet) und die Art (Name, Tooltip,
   Hilfe, Meldung);
2. **jeden Text bearbeitet** — je Sprache ein Feld, mit Vorschau, wo die
   Form zählt (Tooltip A·B·C, Knopfname);
3. **eine Sprache hinzufügt** — eine neue Spalte, zunächst leer;
4. **mit einem Knopf „Prüfen“** je Sprache sieht, was **fehlt** (leer oder
   gar nicht vorhanden) und was **verwaist** ist (in der Sprachdatei, aber
   nirgends mehr benutzt), und die Liste auf **„nur fehlende“**, **„nur
   vorhandene“** oder **„alle“** filtert, dazu eine Suche;
5. **das Ergebnis als Datei speichert** (JSON), die übernommen wird.

**Vor dem Anlegen wird GEFRAGT** (nicht angenommen): *Soll die Sprachdatei
neu erstellt oder eine bestehende aktualisiert werden?* Eine vorhandene
Textsammlung (etwa ein `i18n.js`) wird nie still ersetzt — sie wird
übernommen, und was dabei umbenannt oder zusammengelegt wird, steht im
Bericht.

**Form der Dateien** (der Steckbrief nennt sie): je Sprache ein
Schlüssel→Text-Satz in JSON; eine Anwendung, die über `file://` läuft und
kein `fetch()` darf, bindet dieselben Daten als `.js`-Hülle ein
(`window.<Namensraum>_TEXTE = { … }`), erzeugt aus der JSON — es gibt EINE
Quelle, nicht zwei. Die Werkstatt-Seite wird **erzeugt** (Skript in `bin/`),
wie die Tooltip-Prüfseite, damit sie beim nächsten neuen Knopf nicht veraltet.

**Warum das eine Regel ist und kein Komfort:** Texte, die im Code verstreut
stehen, übersetzt niemand vollständig, und eine fehlende Übersetzung fällt
erst auf, wenn ein Nutzer sie sieht. Die Deckungsgleichheit der Sprachen
(Web-Fassung §15) wird damit **sichtbar und anklickbar**, nicht nur ein Test. Und der
User korrigiert seine Texte selbst, ohne eine Zeile Code anzufassen.

Die bestehende Pflicht aus der Web-Fassung §15 („alle sichtbaren Texte laufen über eine
Übersetzungsfunktion", „vom Nutzer eingetippter Text ist ein Datum") bleibt;
§17 gibt ihr die Werkstatt. Für ein Wegwerf-Werkzeug (§14) ist §17 ein
Angebot, für einen Langläufer Pflicht — **Auslöser: der erste Text, der in
einer zweiten Sprache erscheinen soll, oder der zwanzigste Text überhaupt**.

---

## §18 Quick Buttons: die Knöpfe gehören an das, was man bearbeitet  [A/B]

> **Verbindlich ab 2026-09-28**, bestellt vom User im Projekt Schnittmuster:
> *„Wir nennen diese Art Buttons von jetzt an ‚Quick Buttons'. … dass du mir
> von jetzt an immer vorschlägst für Optionen, bei denen es sich in einem
> Projekt anbietet ‚Quick Buttons' zu erstellen, diese zu erstellen und oder
> fragst, ob ich es möchte, wenn es Sinn macht."*
> Vorbild: die Linien-Insel des Schnittmuster-Generators
> (`doc/mockup-linien-knoepfe.html`).

**Was ein Quick Button ist:** ein Knopf, der erscheint, sobald ein Element
angewählt ist, und genau die Handlungen an DIESEM Element anbietet — als
kleine Insel über der Arbeitsfläche (dort: rechts oben, direkt unter der
Leiste), **dieselben Symbole wie in der Leiste, nur größer** (dort 1,5-fach),
mit Tooltip Name · Wirkung · Taste. Ein Zahlenfeld, das zur Handlung gehört
(dort: die Nahtzugabe in mm neben „Schneiden"), steht mit in der Insel.
Ohne Anwahl ist die Insel weg.

**Die Regel:**
1. **Vorschlagen oder fragen — immer.** Wo eine Option an einem angewählten
   Element hängt (Kurve/Gerade, Punkt dazu, schneiden, löschen, ein Wert, der
   nur für dieses Element gilt), schlage ich einen Quick Button vor oder frage,
   ob er gewünscht ist. Nicht still eine Zeile, ein Menü oder ein
   Seitenleisten-Feld dafür bauen.
2. **Ein Weg, zwei Orte:** der Quick Button ruft DENSELBEN Weg wie Taste,
   Menü oder Feld — kein zweites Verhalten (§2). Ein Zustand, den er zeigt
   (gedrückt, gesperrt, Wert), wird aus derselben Quelle nachgezogen.
3. **Mockup zuerst (§9):** Lage, Größe, Reihenfolge und welche Knöpfe je
   Elementart erscheinen, werden als Mockup freigegeben.
4. **Der Name steht im Code und in der Doku:** Quick Buttons heißen so — in
   Kommentaren, im `doc/`, in Fragen an den User.

**Warum das eine Regel ist:** eine Handlung, die weit weg vom Element steht
(eine Zeile oben, ein Menü, die Seitenleiste), sucht man; eine, die neben
dem Element auftaucht, findet man. Und wer mit dem Blick auf dem Element
bleibt, arbeitet schneller und verklickt sich seltener.

---

## §19 Jedes Bedienelement hat eine Kennung — sichtbar per Schalter, kopierbar  [A/B]

> **Verbindlich ab 2026-09-28**, bestellt vom User im Projekt Schnittmuster:
> *„In den Universellen Guidelines festhalten, dass von jetzt an alle
> Bedienelemente in jedem Programm eine eindeutige ID brauchen, die per
> Toggle immer angezeigt und ins Clipboard kopiert werden kann."*

**Die Regel:**
1. **Jedes Bedienelement** — Knopf, Feld, Schalter, Menüeintrag, Quick
   Button (§18), Griff, Punkt, Linie und jedes Stück einer Linie in einer
   Zeichenfläche — hat eine **eindeutige, stabile Kennung**. Stabil heißt:
   nachgeschlagen, nicht gezählt — ein neues Element davor ändert sie nicht.
2. **Ein Schalter** („Kennungen") blendet sie ein: am Tooltip, an der Zeile,
   die das angewählte Element nennt, und wo es passt im Bild. Aus = nichts
   davon zu sehen.
3. **Eine Taste kopiert** die gerade gezeigte Kennung in die Zwischenablage
   (Vorbild Schnittmuster: Strg+C, nur wenn eine Kennung zu sehen ist und
   kein Text markiert ist; sonst gehört die Taste dem Betriebssystem). Die
   Zeile bestätigt „Kopiert: …"; scheitert das Kopieren, sagt sie es.
4. **Ein Element ohne Kennung ist ein Befund**, kein Detail: die Register
   melden es (Prüfstand), statt eine Nummer zu erfinden.

**Warum:** der User meldet Fehler und Wünsche an einem Element. Ohne Namen
heißt es „der Punkt da oben links" — mit Namen ist der Befund eindeutig,
nachbaubar und im Protokoll wiederzufinden.

---

## §20 Tooltips sprechen zum Benutzer — und verdecken nie ein offenes Fenster  [A/B]

> **Verbindlich ab 2026-09-29**, bestellt vom User im Projekt Schnittmuster:
> *„Tooltips dürfen niemals an mich als Entwickler adressiert sein. z.B.
> Freies verschieben [...] Der Weg von früher! <- Der Benutzer weiß nicht,
> was das bedeutet."* und *„Tooltips dürfen niemals kleine Fenster, die sich
> beim Klicken auf eine Combobox eines Buttons öffnen, verdecken."*

**Regel 1 — jeder sichtbare Text spricht zum BENUTZER.** Das gilt für
Tooltips, Hilfetexte, Beschriftungen, Meldungen und Dialoge. Verboten sind:

1. **Entwicklungsgeschichte:** „bisher", „der Weg von früher", „wie vorher",
   „die alte Anordnung", „so war es bisher", „nicht mehr …", „neu seit …".
   Der Benutzer kennt keinen früheren Stand. Beschrieben wird, was das
   Element **jetzt** tut. Ein früherer Standard heißt „Vorgabe".
   **Erlaubt** ist „vorher" nur, wo es die eigene letzte Handlung des
   Benutzers meint („der vorige Maßsatz", „fragt vorher nach").
2. **Pläne und Baustellen:** „kommt später", „noch nicht gebaut",
   „(kommt in …)". Was es nicht gibt, steht nicht in der Oberfläche.
3. **Arbeitsnamen:** Aufgaben-Kennungen (PD, W27, [3/9]), Paragraphen (§),
   „Mockup", Datei-, Funktions- und Variablennamen, Speicher-Schlüssel.
4. **Texte über abgeschaltete Wege:** eine Oberfläche, die der Benutzer
   nicht mehr erreichen kann, wird in der Hilfe nicht beschrieben.

**Die einzige Ausnahme ist ein ausdrücklicher Debug-Weg:** was nur mit dem
Schalter der Kennungen (UNIVERSAL §19) oder in einer Debug-Anzeige
erscheint, darf technische Namen tragen — dort sind sie gewollt.

**Prüfung:** Der Prüfstand oder Rauchtest liest ALLE Texte der Sprachdatei
und meldet die Muster aus 1–3 namentlich. Was bewusst ausgenommen ist (etwa
Texte einer nicht mehr erreichbaren Oberfläche, deren Code bleibt), steht
mit Grund in einer Ausnahmeliste im Test — nicht still.

**Regel 2 — ein Tooltip verdeckt nie ein offenes Fenster.** Ein kleines
Fenster, das ein Knopf, ein ▾ oder eine Klappliste geöffnet hat, ist die
Stelle, an der der Benutzer gerade arbeitet. Der Tooltip weicht ihm aus:

1. Jedes solche Fenster trägt, solange es offen ist, das Kennzeichen
   „frei halten" (im Web: das Attribut, das der EINE Tooltip abfragt; in
   Java: die Eigenschaft, die der Tooltip-Baustein abfragt). Das Kennzeichen
   setzt der **Baustein des Fensters** (UNIVERSAL §2), nicht jeder Aufrufer.
2. **Jede** Art, den Tooltip zu setzen — am Element, an der Mausspitze, in
   der Ecke — wählt unter mehreren Plätzen den mit der kleinsten Überdeckung
   und bietet dabei Plätze **neben** jedem offenen Fenster an. Keine Art
   darf den Platz „stur" setzen.
3. Ein Tooltip eines Knopfes **im** Fenster steht außerhalb des Fensters.
4. Den eigenen Knopf verdeckt er ebenfalls nie.

**Warum:** Ein Tooltip fängt keine Maus. Liegt er über einem offenen
Fenster, klickt der Benutzer hindurch auf etwas, das er nicht sieht — und
ein Text, den er nicht versteht, hilft ihm nicht, sondern verunsichert ihn.

---

## Anhang — Herkunft und Pflege

- Extrahiert am 2026-07-30 aus `GameLoop2/src/main/doc/GUIDELINES.md`
  (§0–§17) + `GUIDELINES_VORSCHLAG_2026-07-27.md` + `Prompt_Handling.txt`.
- **Erste Instanziierungen:** GameLoop2 (AWT, 2.5D-Engine mit Editor) ·
  TransparencyTool (Swing, Bild-/Szenen-Editor).
- **Pflege:** Eine Regel wandert hierher, sobald sie im **zweiten** Projekt
  gilt. Bis dahin bleibt sie im Projekt-Dokument. Eine hier geänderte Regel
  gilt sofort für alle Projekte — die Änderung braucht deshalb einen
  Eintrag in der `WEITERMACHEN_PROMPT.txt` **jedes** betroffenen Projekts.

- **Wo diese Datei liegt (Entscheidung 2026-08-23):** In **jedem**
  Projekt-Root eine eigene Fassung. Kein Dokument im Workspace-Root, keine
  Querverweise zwischen Projektordnern — ein Projektordner ist vollständig
  für sich lesbar. Der Preis dafür sind mehrere Fassungen, und der wird
  bezahlt, nicht ignoriert:

  | | |
  |---|---|
  | **Master** | `GameLoop2/JAVA_GUIDELINES_UNIVERSAL.md` — hier wird geändert. |
  | **Kopien** | `GameLoop3/` · `PixelArt/` — nur nachgezogen, nie dort editiert. |

  **Eine Änderung am Master ist erst fertig, wenn alle Kopien nachgezogen
  sind** (`diff` gegen jede Kopie muss leer sein) **und jede betroffene
  `WEITERMACHEN_PROMPT.txt` den Eintrag hat.** Wer nur den Master ändert,
  hat keine Guideline geändert, sondern eine Abweichung erzeugt (§9).
  Gegenprobe, die in jede Änderungs-PD gehört:
  `for d in GameLoop2 GameLoop3 PixelArt; do diff GameLoop2/JAVA_GUIDELINES_UNIVERSAL.md $d/JAVA_GUIDELINES_UNIVERSAL.md; done`

- **Kandidaten, die noch nicht hier stehen** (nur ein Projekt, deshalb noch
  Projektregel — beim zweiten Vorkommen wandern sie hoch, statt neu erfunden
  zu werden):
  · **„Ein Prüfstand sichert ZUSAGEN zu, keinen BESTAND"** (GameLoop2 §51,
  mit dem Beleg, dass eine Erwartungszahl an EINEM Tag dreimal wechselte,
  ohne dass sich Produktivcode änderte) — fällig, sobald ein zweites Projekt
  einen Prüfstand hat.
  · **„Regression wird neu erhoben, nie abgeschrieben"** (dito).
- Projektspezifische Paragraphen werden ab **§20** numeriert, damit §0–§17
  projektübergreifend dieselbe Bedeutung behalten.

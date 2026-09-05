# WEB_GUIDELINES_UNIVERSAL — verbindliche Standards für ALLE Web-Projekte

> **QUELLE:** `CLAUDE_CODE_GUIDELINES/universal/WEB_GUIDELINES_UNIVERSAL.md` (DIES IST DIE QUELLE)
> **STAND:** 2026-09-05
>
> **Status: VERBINDLICH** für jedes HTML/CSS/JS-Projekt, dessen `CLAUDE.md`
> auf diese Datei zeigt. Abgeleitet aus `JAVA_GUIDELINES_UNIVERSAL.md`
> (GameLoop2, Stand 2026-09-04) durch Übersetzen aller Regeln von Desktop-Java
> nach Web, und aus `GUIDELINES_v2.md` desselben Repos.
>
> **Diese Datei ist projektneutral.** Sie enthält keine Dateinamen und keine
> Funktionsnamen eines einzelnen Projekts, sondern **Rollen** (Token-Quelle,
> Dialog-Basisklasse, Persistenz-Paar …). Jedes Projekt legt in seiner eigenen
> `doc/GUIDELINES.md` einen **Projekt-Steckbrief** (§14) an, der diese Rollen
> mit konkreten Bausteinen besetzt, und ergänzt projektspezifische Paragraphen
> ab §20.
>
> **Zitier-Konvention:** Eine bare Nummer wie „§20" meint das
> **Projekt-Dokument**. Eine Regel aus dieser Datei heißt immer
> **„UNIVERSAL §n"**. Beide haben getrennte Nummernräume.
>
> **Lesereihenfolge für jede Aufgabe:**
> 1. diese Datei · 2. `<Projekt>/doc/GUIDELINES.md` · 3. `Prompt_Handling.txt`
> · 4. `WEITERMACHEN_PROMPT.txt` · 5. die aktive `Task_*.txt` (PD)

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

1. **Gerüst auf Vorrat.** Eine Basisbaustein-Familie für eine Seite aus drei
   Dialogen ist mehr Gerüst als Programm. Jede Struktur dieser Datei hat einen
   **Auslöser** (§14), und vor dem Auslöser ist ihr Bau der teuerste Weg,
   Regelkonformität vorzutäuschen. Umgekehrt: **was ab der ersten Zeile nichts
   kostet, wird ab der ersten Zeile gemacht** — eine Token-Quelle ab der
   ersten Farbe (§3), die Schichtenregel als Aufrufregel ab Tag eins (§4).
   Nachträglich ist beides [C].
2. **Eine Datei aufteilen, nur weil „Trennung von HTML/CSS/JS" schöner klingt.**
   Wenn das Projekt ausdrücklich als Standalone-Datei gefordert ist, gibt die
   Aufteilung eine funktionierende Auslieferung ohne Server auf. Die **interne**
   Ordnung (Token-Block, Basis-Schicht, Anwendungs-Schicht) leistet dasselbe
   und bleibt jederzeit herauslösbar.
3. **Optimieren ohne Messung** (§13).

**Die Strenge dieser Datei skaliert mit der Lebensdauer des Projekts.** Die
Steckbrief-Zeile „Wegwerf-Werkzeug oder Langläufer" (§14) ist deshalb eine
Pflichtantwort: bei einem Wegwerf-Werkzeug sind §1, §2 und §13 Angebote, bei
einem Langläufer sind sie verbindlich.

---

## §1 Graphify-First (KnowledgeMap)  [A/B]

- Vor einer Suche über mehr als zwei Dateien wird der Graph gefragt, nicht das
  Dateisystem. Der Graph ist das billigere Werkzeug; `grep` über alles ist der
  teuerste Weg zu einer Antwort, die schon gespeichert ist.
- Der **Graphify-Scope** steht im Steckbrief (§14): welche Dateien drin sind
  und welche ausgeschlossen (`doc/`, `node_modules/`, `graphify-out/`,
  Build-Ausgaben, generierte Daten).
- Der Graph ist ein **Messwert mit Datum**, keine Zusage. Knoten-, Kanten- und
  Dateizahl stehen mit Stand-Datum im Steckbrief; die geltenden Zahlen stehen
  in der `WEITERMACHEN_PROMPT.txt`.
- **Nie `graphify update .` bei gefiltertem Scope** — der Befehl ignoriert die
  Filterung und extrahiert alles neu. Bei gefilterten Projekten manuell neu
  bauen, mit Backup in `graphify-out/<DATUM>/`.
- Für ein Projekt aus einer einzigen Datei ist der Graph **kein** Pflichtteil.
  Der Auslöser steht im Steckbrief.

---

## §2 Basisbausteine-Pflicht (One Source of Truth für UI)  [A/B]

- **Ab dem ZWEITEN Auftreten**, nicht vorher: jedes wiederkehrende UI-Element
  bekommt genau einen Baustein — Dialog, Formularfeld, Regler, Schalter,
  Farbwähler, Liste, Bestätigungsabfrage.
- Ein neuer Dialog erbt vom vorhandenen Dialog-Baustein. Er baut seine Hülle
  nicht selbst nach. Wer die Hülle nachbaut, verdoppelt Fokusfalle,
  Escape-Behandlung und Backdrop — und repariert später nur eine davon.
- Ein Baustein hat **eine** Datei/Stelle. Zwei Stellen, die dasselbe Element
  bauen, sind ein Bug, auch wenn beide funktionieren.
- **Trennung teuer/billig:** Ein Bedienelement mit laufender Eingabe
  (Regler, Textfeld) trennt „während der Eingabe" von „nach der Eingabe".
  Billige Änderungen laufen während der Eingabe, teure erst danach. Ein Zug am
  Regler darf keine Texturen, keine Netzwerkabfrage und keinen Neuaufbau
  auslösen.

---

## §3 Ein StyleGuide, eine Token-Quelle  [A / Erstbereinigung C]

- **Genau eine** Datei/ein Block definiert Farben, Abstände, Radien, Schrift-
  größen und Zeiten als CSS-Custom-Properties. Alles andere liest sie.
- **Kein Literal im Regelwerk.** Keine Hex-Farbe, kein `px`-Abstand außerhalb
  der Token-Quelle. Ausnahme sind Werte, die geometrisch aus dem Inhalt
  folgen (`1px` Trennlinie, `50%` Radius) — die tragen keinen Stil.
- **Kein Inline-Style aus dem Code**, außer für Werte, die sich zur Laufzeit
  aus Daten ergeben (Position, gewählte Farbe, Fortschritt).
- Die Kaskade wird im Steckbrief benannt: welche Datei welche überschreibt.
  Eine Token-Datei, die von einer anderen überschrieben wird, ist keine Quelle.

---

## §4 Schichten-Trennung (Abhängigkeitsregel zuerst, Datei-Split später)  [A / Split C]

Drei Schichten, und die Abhängigkeit läuft nur in eine Richtung:

1. **Daten & reine Funktionen** — Modell, Prüfung, Umrechnung. Kennt kein DOM,
   kein Fenster, keine Bibliothek der Anwendungsschicht.
2. **Basis-Schicht** — Bausteine, Dialoge, Fehlerausgabe, Übersetzung,
   Hilfsfunktionen. Kennt das DOM, aber nicht die Fachlogik.
3. **Anwendungs-Schicht** — die eigentliche Anwendung. Kennt beide.

- Die Regel gilt **ab Tag eins als Aufrufregel**, auch wenn alles in einer
  Datei liegt. Ein physischer Split ist [C] und braucht einen eigenen Grund.
- Ein Aufruf **von unten nach oben** ist der Verstoß, der wehtut: eine reine
  Funktion, die einen Dialog öffnet, ist nicht mehr prüfbar.
- **Prüfbarkeit ist der Lackmustest:** Was in Schicht 1 liegt, muss ohne
  Browser laufen. Wenn das nicht geht, liegt es falsch.

---

## §5 God-Dateien: nichts Neues hineinlegen  [A-Regel / Extraktion C]

- Eine Datei oder Funktion, die alles kann, wird **im `doc/` benannt**.
- Die Regel ist: **nichts Neues hineinlegen.** Neues kommt daneben.
- Die Extraktion des Bestands ist [C] und braucht eine eigene Aufgabe mit
  Freigabe. Sie passiert nicht nebenbei.

---

## §6 Persistenz-Format-Standard  [A/B]

- Jeder gespeicherte Datensatz hat einen **versionierten Schlüssel**
  (`<projekt>.<sache>.v<N>`). Ein Format-Bruch erhöht die Zahl; er
  überschreibt nicht still den alten Schlüssel.
- **Beim Laden wird jeder Wert geprüft und in seinen erlaubten Bereich
  gezogen** („sanitize"), nicht beim Speichern vertraut. Gespeicherte Daten
  sind fremde Daten: sie können von Hand geändert, von einer alten Fassung
  geschrieben oder halb geschrieben sein.
- **Lesen und Schreiben sind ein Paar** und stehen nebeneinander. Ein Feld,
  das geschrieben, aber nicht gelesen wird, ist tot; umgekehrt ist es ein Bug.
- **Nie ungefragt löschen.** „Alles zurücksetzen" nennt namentlich, welche
  Schlüssel es verwirft.
- Jeder Zugriff auf `localStorage`/`sessionStorage` ist gekapselt und fängt
  Fehler ab. In einem privaten Fenster oder bei blockierten Seitendaten wirft
  schon der Zugriff.

---

## §7 Formate zwischen Projekten sind Verträge  [A/B]

- Ein Format, das ein zweites Projekt oder ein Export/Import liest, wird im
  Steckbrief als **Vertrag** geführt: wer schreibt, wer liest, wo es liegt.
- Ein Vertrag wird **nicht einseitig geändert.** Änderung heißt: Version
  erhöhen, beide Seiten nachziehen, im `doc/` festhalten.
- Ein Export ohne Import ist eine halbe Funktion. Wenn der Import fehlt, steht
  er als benanntes TODO da, nicht als „später mal".

---

## §8 Namens- & Datei-Konventionen  [B]

- **Dateinamen und Pfade ASCII** (`ae/oe/ue/ss`). **Inhalte** — Texte,
  Kommentare, Protokolle — tragen **echte Umlaute** `ä ö ü ß`.
- Dateien `kebab-case`, Funktionen `camelCase`, Klassen/Konstruktoren
  `PascalCase`, Konstanten `UPPER_SNAKE`.
- Verbindliche Suffixe, wo die Rolle es hergibt: `*Dialog` · `*Reader`/
  `*Writer` (Persistenz) · `*Renderer` · `*Panel` · `*Controller` ·
  `*Factory` · `*Manager` · `Base*`.
- Jede nicht-triviale Funktion hat einen Kopfkommentar mit ihrer **Rolle**:
  ein Satz, wofür sie da ist und was sie ausdrücklich **nicht** tut.
- `*-legacy` / `*-demo` / `*-test`-Dateien im Produktivbaum sind Altlasten.
  Sie werden im `doc/` gelistet mit Vermerk „tot / abhängig / zu löschen".
  Löschen ist [B] **nachdem** die Referenzfreiheit belegt ist.

---

## §9 Dokumentations- & Mockup-Pflicht  [B]

- **Alle Projektdokumente liegen in `doc/`.** Kein loses `.md`/`.txt` im
  Projekt-Root außer den Ankerdateien (CLAUDE.md, UNIVERSAL-Kopie,
  `Prompt_Handling.txt`, `WEITERMACHEN_PROMPT.txt`).
- **Mockup-First.** Vor einem neuen oder geänderten Dialog- oder
  Seiten-Layout zuerst ein Mockup — `mockup-*.html` oder ein
  `Schema_<Thema>.txt` im `doc/` → **Freigabe** → Implementierung.
- **Jede Ausnahme** von diesen Guidelines wird als Code-Kommentar **und** im
  `doc/` begründet.
- **Eine veraltete Datei behält nie ihren Originalnamen [B].** Ein Altstand
  wird mit `<DATUM>`-Suffix archiviert — auch dann, wenn die bereinigte
  Neufassung woanders angelegt wurde. Ein **toter** Verweis ist harmloser als
  ein **irreführender**: der tote meldet sich beim ersten Öffnen, der andere
  nie.
- **Kopien fremder Dokumente** tragen im Kopf `QUELLE:` und `STAND:`, und beim
  Erneuern wird das Datum mitgezogen. Eine Kopie ohne Kopfblock ist eine
  Altlast.
- **Dokumentation, die dem Code widerspricht, ist ein Bug.** Wer eine Struktur
  ändert, korrigiert im selben Schritt `CLAUDE.md` und `doc/`. Eine veraltete
  Architekturbeschreibung ist schlimmer als keine — sie wird geglaubt.
- Jedes Projekt hat eine `CLAUDE.md` im Root mit: Was das Projekt ist,
  Start-/Run-Befehl, Einstiegspunkt, Lesereihenfolge, Verweis auf diese Datei
  und auf `doc/GUIDELINES.md`.

---

## §10 Task-Workflow für größere Änderungen  [B]

Aus `Prompt_Handling.txt` (liegt als Kopie in jedem Projekt):

- Größere Aufgabe **[BT]** → `Task_<DateTime>_<Name>.txt` (PD) im `doc/`;
  Schritte `[m/n]` mit Risikoklasse `[A]/[B]/[C]`; Modell-Empfehlung;
  „unnötige Schritte" markieren + begründen. Zwischenschritte als `[n+i.j/m]`.
- Kleine Aufgabe **[ST]** → keine PD, aber `progress_<DateTime>_<Name>.txt`.
- `progress_<DateTime>_<Name>.txt` nach **jedem** Schritt: Prompt,
  Zusammenfassung, Vorschläge, tatsächliche Lösung, Runtime-Verify-Liste.
- `WEITERMACHEN_PROMPT.txt` zum Fortsetzen nach `/clear`; nennt immer die
  aktive PD. Wird sie zu lang: mit `<DATUM>`-Suffix archivieren und bereinigt
  neu anlegen (nur offene TODOs).
- **Abschluss-Block** als letzte Zeilen jeder Ausgabe (Wortlaut in
  `Prompt_Handling.txt`). **Die letzte Zeile ist die wichtigste:** was
  ausgelassen, verworfen oder bewusst anders entschieden wurde, wird
  namentlich genannt — auch eine eigene Empfehlung, die der User verworfen hat.
- **Runtime-Verify gehört dem User.** Was nur im Browser sichtbar ist, wird
  als benannte Checkliste (`A1–A9`) in der progress-Datei hinterlassen, nicht
  als „funktioniert" behauptet. Ein grüner Selbsttest ist kein Darstellungstest.

---

## §11 Tastatur & Maus: ein Register als Single Source of Truth  [B]

- Alle Tastenkürzel stehen in **einem** Register. Die eingebaute Hilfe liest
  dieses Register; sie führt keine zweite Liste.
- Ein Bedienelement **ohne** Taste braucht keinen Registereintrag, aber einen
  Absatz in der Hilfe.
- **Eine Geste, die man kennen muss, ist keine Bedienung.** Was nur durch
  Ausprobieren auffindbar ist, bekommt entweder eine sichtbare Schaltfläche
  oder einen Eintrag in der Hilfe.
- Die Hilfe-Taste steht im Steckbrief (§14).

---

## §12 Einstellungen sind persistent  [B]

- Was der Nutzer einstellt, ist beim nächsten Start noch da: Ansicht, Modus,
  Panel-Zustand, zuletzt gewähltes Element, Fenstergröße, Sprache.
- Der Ablageort und der Schlüsselname stehen im Steckbrief.
- Eine Einstellung, die nur im Speicher lebt, ist ein Bug, kein fehlendes
  Feature — sie sieht im Test aus wie fertig.

---

## §13 Mess-Budget: gemessen wird vor optimiert  [A/B]

- **Keine Optimierung ohne vorherige Messung.** Die Messung steht mit Zahl und
  Datum in der progress-Datei.
- Das Projekt hat eine Mess-Anzeige (Bildrate, Zeit je Aufbau, Anzahl der
  gehaltenen Ressourcen) und einen Weg, sie abzulesen. Beides im Steckbrief.
- Bei allem, was Ressourcen hält (Bilder, Texturen, Geometrien,
  Ereignis-Empfänger, Zeitgeber): Wer aufbaut, gibt auch frei. Die Zahl der
  gehaltenen Ressourcen muss nach einem Umbau auf den Ausgangswert
  zurückgehen; das wird **nachgemessen**, nicht angenommen.
- **Jede Zahl in den Guidelines ist ein Messwert mit Datum.** Eine Zahl ohne
  Datum ist eine Behauptung.

---

## §14 Projekt-Steckbrief (jedes Projekt füllt das aus)

Die `doc/GUIDELINES.md` jedes Projekts beginnt mit dieser Tabelle. Sie besetzt
die Rollen dieser Datei und ist der Grund, warum es je Projekt keine zweite
Regelkopie braucht.

**Ausfüll-Pflicht [B]: kein Feld bleibt leer, und kein Feld wird geraten.**
Wo eine Rolle noch nicht besetzt ist, steht **nicht** „—", sondern der Satz
**„existiert nicht — Auslöser: <namentliche Bedingung>"** (zum Beispiel „ab
dem zweiten eigenen Dialog"). Ein leeres Feld ist nicht unterscheidbar von
einem vergessenen; ein benannter Auslöser macht aus einer Lücke eine
**Terminsache**.

| Rolle | Projekt-Wert | Auslöser, falls (noch) nicht vorhanden |
|---|---|---|
| Sprache/Stack + Zielbrowser | | — |
| Projektpfad | | — |
| **Lebensdauer: Wegwerf-Werkzeug oder Langläufer?** | | — |
| **Größter denkbarer Datenverlust** | | — |
| **Auslieferungsform** (Standalone-Datei / Seite / Build) | | — |
| Einstiegspunkt + Start-/Run-Befehl | | |
| Build-Befehl + erwartete Artefaktzahl | | |
| Prüfstand: Startbefehl + erwarteter Stand (§10/§13) | | |
| Wer führt Git/Deploy aus | | — |
| Netz-Abhängigkeiten (CDN, Fonts, API) | | — |
| Token-Quelle (§3) | | |
| Dialog-Basisbaustein (§2) | | |
| Formular-/Bedienelement-Fabriken (§2) | | |
| Bestätigungs-Dialog (§2) | | |
| Schichten-Ist (§4) | | |
| God-Datei(en) (§5) | | |
| Persistenz-Schlüssel + Paare (§6) | | |
| Format-Verträge nach außen (§7) | | |
| Einstellungs-Ablage (§12) | | |
| Shortcut-Register + Hilfe-Taste (§11) | | |
| Mess-Anzeige + Ablesen (§13) | | |
| i18n-Namensraum + Vorgabesprache (§15) | | |
| Graphify-Scope (§1) | | |

**Die drei fett gesetzten Zeilen haben keinen Auslöser — sie sind
Pflichtantworten vor der ersten Zeile Code**, weil sie alles andere steuern:

- **Lebensdauer** entscheidet über die halbe Strenge dieser Datei.
- **Größter denkbarer Datenverlust** bestimmt, welche Regel im Projekt **ganz
  oben** steht. Wer diese Frage nicht stellt, gewichtet §6 und §12 nach Gefühl.
- **Auslieferungsform** entscheidet, ob eine Aufteilung in mehrere Dateien ein
  Fortschritt oder ein Rückschritt ist (§0, unnötiger Schritt Nr. 2).

---

## §15 Web-eigene Pflichten (in der Java-Fassung nicht vorhanden)  [A/B]

- **i18n:** Alle sichtbaren Texte laufen über eine Übersetzungsfunktion. Der
  Namensraum und die Vorgabesprache stehen im Steckbrief.
  **Vom Nutzer eingetippter Text ist ein DATUM, kein Übersetzungsschlüssel** —
  die Auflösung nimmt zuerst die Daten, dann den Schlüssel.
  Die Sprachtabellen sind deckungsgleich: gleiche Schlüssel, keine fehlenden,
  keine verwaisten. Das wird geprüft, nicht angenommen.
- **Barrierefreiheit:** Ein Dialog fängt den Fokus, reagiert auf Escape und
  gibt den Fokus beim Schließen zurück. Bedienelemente sind mit der Tastatur
  erreichbar. Zustandsänderungen, die nur farblich sichtbar sind, werden
  zusätzlich angesagt.
- **Fehler sind sichtbar:** Ein gefangener Fehler, der nur in der Konsole
  landet, ist ein stiller Fehler. Es gibt eine Sammelstelle, die Fehler zählt
  und anzeigt.
- **Netz-Abhängigkeiten stehen im Steckbrief.** Was über ein CDN geladen wird,
  wird namentlich mit Version genannt. Eine Standalone-Datei, die ohne Internet
  nicht startet, sagt das in ihrer `CLAUDE.md`.
- **Kein `innerHTML` mit fremden oder Nutzer-Daten.** Text wird als Text
  gesetzt.

---

## §16 Wie du fragst und wie du ausgibst  [B]

Der verbindliche Wortlaut steht in `Prompt_Handling.txt`, Abschnitte
„WIE DU FRAGST" und „DAS FORMAT FÜR FRAGEN UND ANWEISUNGEN". Kurz:

- Höchstens 4 Fragen pro Runde, einfache Sätze, letzte Option immer
  „Etwas anderes — ich schreibe es hin", und bei jeder Frage steht, was ohne
  Antwort passiert.
- `Question:`- und `Instruction:`-Blöcke stehen am **Ende** der Ausgabe, mit
  Trennlinien, durchnummeriert, eine Sache je Nummer.
- Keine Paragraphen-Nummern in der Frage selbst.
- Bei jeder neuen Implementation werden die konkreten Tasten oder Klicks
  genannt, mit denen man sie anzeigen und testen kann.
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
  `Prompt_Handling.txt`, Abschnitt „EIN SKRIPT SCHLIESST SICH NICHT SELBST",
  und `bin/_wait.sh` im Guidelines-Repo.

---

## Anhang — Herkunft und Pflege

- Geändert wird **nur** die Quelle in `newProjectGuidelines/prompts/`. Danach
  werden die Projekt-Kopien nachgezogen und ihr `STAND:`-Datum mitgezogen.
- Nicht aus der Java-Fassung übernommen, weil im Web anders geregelt:
  Package-Split (§4 dort) → hier Schichten als Aufrufregel ohne Dateizwang.
- Nicht aus `GUIDELINES_v2.md` übernommen: die ES5/IIFE/No-Build-Pflicht. Sie
  galt für die alten Snippet-Seiten. Ob sie gilt, entscheidet der Steckbrief
  („Zielbrowser", „Auslieferungsform") je Projekt.

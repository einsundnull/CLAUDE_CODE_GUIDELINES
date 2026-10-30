# PERFORMANCE_UNIVERSAL — Performance by Design: schnell von Anfang an, regelmäßig geprüft

> **QUELLE:** `CLAUDE_CODE_GUIDELINES/universal/PERFORMANCE_UNIVERSAL.md` (DIES IST DIE QUELLE)
> **STAND:** 2026-10-30 (Erstfassung)
>
> **Gilt für jedes Programm:** Spiele, Apps, Werkzeuge — Browser, Desktop, Telefon, Java oder Web.
> Geladen über den Claude-Skill `performance` (`~/.claude/skills/performance/SKILL.md`), sobald ein
> neues Projekt entsteht, ein Programm ruckelt oder langsam ist, oder eine Änderung viele Objekte,
> Effekte oder Rechenarbeit hinzufügt. Die Web- und Java-Guidelines verweisen in UNIVERSAL §13 hierher.
>
> Bestellt vom User am 2026-10-30 (Projekt WingsOfFury): *„dass von vornherein dafür gesorgt wird, dass
> wir nicht nachträglich für die grafische oder Rechenbeschleunigung sorgen müssen, sondern dass immer
> Best Practice angewendet wird und auch regelmäßig geprüft wird"*.
>
> **Fachbegriffe:** Das Ganze heißt **Performance Engineering**; „von Anfang an mitgedacht" heißt
> **Performance by Design**. Die Zielwerte sind ein **Performance-Budget** (eine nicht-funktionale
> Anforderung), das regelmäßige Nachmessen ist ein **Performance-Regressionstest** (kontinuierliches
> Performance-Testing).
>
> Zitier-Konvention: „LEISTUNG §Pn". Getrennter Nummernraum von UNIVERSAL und TRAINING.

---

## §P0 Leitprinzip  [A]

1. **Erst messen, dann ändern** (UNIVERSAL §13). Eine Vermutung über die Ursache ist keine Ursache.
   Beleg WingsOfFury 2026-10-30: das Telefon ruckelte „wegen der Grafik" — gemessen waren es zu 63 %
   die Soldaten-Ziellisten in der Simulation.
2. **Der Ablauf schlägt die Sprache.** Ein Programm, das jeden Schritt n × n rechnet, bleibt in C++
   langsam. Reihenfolge der Mittel: Ablauf verbessern → Arbeit seltener tun → auf einen zweiten Kern
   (Worker/Thread) → erst dann native Sprache (WebAssembly, C++, JNI), und nur, wenn eine Messung
   zeigt, dass die Sprache die Grenze ist.
3. **Budget statt Gefühl:** Jedes Projekt hat Zielwerte (§P2) mit Messwert und Datum.
4. Die Regeln gelten für **neuen und berührten** Code (UNIVERSAL §0). Ein Bestand über Budget ist eine
   dokumentierte Altlast mit gemessener Zahl, kein Auftrag zum Umbau ohne Freigabe.

---

## §P1 Vor der ersten Zeile Code: Programm-Art und Ziel-Geräte bestimmen  [B]

Claude bestimmt beim Anlegen eines Projekts (und bei jedem bestehenden Projekt ohne diese Angaben)
**Programm-Art** und **Ziel-Geräte** und schreibt sie in den Steckbrief (§P8). Daraus folgen Budget
(§P2) und Pflicht-Bausteine (§P3).

| Programm-Art | Kennzeichen | Engpass meistens |
|---|---|---|
| **Echtzeit** (Spiel, Simulation, Animation) | läuft jedes Bild, feste Schrittweite | Rechnen je Schritt × Anzahl Objekte, Zeichnen |
| **Interaktive Grafik** (Editor, Zeichen-App, Karte) | zeichnet bei Eingabe neu | Neuzeichnen, große Bilder/Pfade |
| **Daten-/Formular-App** (Web-App, Verwaltung) | Listen, Formulare, Server | Netz, DOM-Größe, lange Listen, Bundle-Größe |
| **Dokument/Übungsblatt** (Seiten zum Lesen/Drucken) | wenig Logik | Ladezeit, Schriften, Bilder |
| **Rechen-Werkzeug / Training / Batch** | läuft ohne Bild, lange | Rechenzeit, Kerne, Speicher |

**Ziel-Geräte:** Desktop-Browser, Telefon-Browser, Desktop-Java, Android/iOS-App. **Ist ein Telefon
dabei, ist das Telefon das Maß** — ein Telefon rechnet 3–5 × langsamer als ein Laptop. Ein
**Referenzgerät** wird mit Namen eingetragen (z. B. das Telefon des Users); fehlt es: Chrome DevTools
„CPU 4× slowdown" als Ersatz, mit dem Vermerk.

---

## §P2 Performance-Budget je Programm-Art  [B]

Zielwerte auf dem Referenzgerät. Das Projekt übernimmt die Zeile, darf sie verschärfen, nie lockern
ohne Vermerk.

| Programm-Art | Budget |
|---|---|
| Echtzeit | 60 Bilder/s (16,7 ms je Bild); davon **Rechnen ≤ 25 %** (≈ 4 ms je Bild), Zeichnen ≤ 50 %; die schwerste Szene des Programms hält das ein |
| Interaktive Grafik | Reaktion auf Eingabe ≤ 100 ms, Ziehen/Zoomen 60 Bilder/s |
| Daten-/Formular-App | Core Web Vitals: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 (UNIVERSAL §27); keine Aufgabe im Hauptfaden > 50 ms |
| Dokument | erste Anzeige ≤ 1,5 s, Druckansicht ohne Nachladen |
| Rechen-Werkzeug | Laufzeit je Einheit gemessen und im Steckbrief; alle Kerne genutzt, wenn die Arbeit teilbar ist |
| Java-Desktop | Ereignis-Faden (EDT) je Ereignis ≤ 16 ms, Start ≤ 2 s |

Speicher: kein Wachsen im Dauerlauf (10 min spielen/benutzen → Speicher wieder auf Ausgangswert).

---

## §P3 Pflicht-Bausteine von Anfang an (Best Practice)  [A/B]

### Echtzeit (Spiele, Simulationen)
1. **Feste Schrittweite mit Deckel:** höchstens ≈ 0,1 s Spielzeit nachrechnen je Bild (× Zeitraffer).
   Ein großer Deckel lässt ein langsames Gerät sich festfressen („spiral of death"; WingsOfFury hatte
   240 Schritte = 2 s je Bild).
2. **Simulation und Zeichnen getrennt** (Kern ohne DOM), damit Rechnen messbar und headless prüfbar ist.
3. **Nie n × n je Schritt:** gemeinsame Listen (Gegner, Freunde, Ziele) **einmal je Schritt** bauen,
   nicht je Objekt. Ab ≈ 50 gleichartigen Objekten ein Suchraster oder sortierte Liste
   (bei Seitenansicht: nach x sortiert).
4. **Denken seltener als Rechnen:** KI/Zielsuche 10–20 × je s, versetzt nach id; Bewegung jeden Schritt.
5. **Keine neuen Objekte in der heißen Schleife** (Partikel, Vektoren, Listen wiederverwenden / Pools).
6. **Ferne Objekte vereinfachen** (Level of Detail): außerhalb des Bildes gröber oder als Gruppe.
7. **Eigene Zufallsströme** für Zusätze, damit Optimierungen die Simulation nicht verschieben.

### Zeichnen (Canvas, WebGL, Java2D)
1. **Pixeldichte höchstens 2** (Telefone haben 3 = 9 Bildpunkte je Punkt).
2. **Nur zeichnen, was im Bild ist** (Culling).
3. **Stehendes einmal vorzeichnen** (Boden, Kulisse in eine Offscreen-Leinwand), Wiederkehrendes als
   fertige Bilder (Sprites) statt Pfade je Bild.
4. Teure Effekte (Unschärfe, Schatten, Filter, viele Partikel) hinter einer **Qualitätsstufe**;
   ab Telefon **automatische Qualität**: Bildzeit messen, Stufe senken, bevor es ruckelt.
5. Nur `requestAnimationFrame`; ist die Seite unsichtbar, ruht die Schleife.

### Web-Apps
1. Keine Aufgabe im Hauptfaden > 50 ms — Schweres in einen **Web Worker**.
2. DOM in einem Rutsch ändern (kein Lesen-Schreiben-Wechsel → Layout-Sturm); lange Listen
   **virtualisieren** (nur Sichtbares im DOM).
3. Eingaben entprellen (Suche, Größe ändern); Bilder in passender Größe + `loading="lazy"`.
4. Nur laden, was die Seite braucht (Module je Seite, keine Riesen-Bibliothek für eine Funktion).

### Java-Desktop
1. Der Ereignis-Faden (EDT) rechnet nie lange — `SwingWorker`/Executor.
2. Doppelpuffer bzw. `VolatileImage`, Neuzeichnen nur des geänderten Bereichs (`repaint(rect)`).
3. Keine Objekte je Bild in `paint`; Schriften, Pinsel, Bilder zwischenspeichern.

### Mehrere Kerne, native Sprachen (Entscheidungsweg, §P0.2)
| Mittel | Wann | Achtung |
|---|---|---|
| Web Worker / Java-Thread für die Simulation | Rechnen > 25 % des Bildes auch nach §P3 1–6 | Zustand je Bild übergeben kostet; Eingaben über Nachrichten |
| mehrere Worker | große, teilbare Arbeit (Training, Batch, Bildverarbeitung) | für wenige hundert Objekte lohnt es nicht |
| WebAssembly (C++/Rust) | Profil zeigt eine enge Rechenschleife, Ablauf ist schon gut | 1,5–3 × nur dort, großer Aufwand |
| native App-Hülle (Java/Kotlin/C++) | nur für Geräte-Funktionen, nicht fürs Tempo | Brücke Browser ↔ nativ je Bild ist zu langsam |
| GPU-Rechnen (WebGPU) | sehr viele gleichartige Rechnungen (Tausende) | nicht jedes Gerät |

---

## §P4 Messwerkzeuge gehören von Anfang an ins Projekt  [B]

1. **Mess-Anzeige** per Schalter (Debug): Bilder/s, ms Rechnen, ms Zeichnen, Zahl der Objekte.
2. **Headless-Messung** (Echtzeit + Rechen-Werkzeug): ein Skript misst ms je Schritt in der
   **schwersten Szene** (z. B. größtes Level) ohne Zeichnen. Befehl im Steckbrief.
3. **Profil-Rezept** im Steckbrief: Node `--cpu-prof` (heißeste Funktionen nach Eigenzeit),
   Chrome DevTools „Performance" mit CPU-Drosselung, Java Flight Recorder / VisualVM.
4. Messwerte stehen mit **Zahl und Datum** im Steckbrief (UNIVERSAL §13).

---

## §P5 Regelmäßig prüfen (Performance-Regressionstest)  [B]

**Wann:**
1. bei jeder Änderung, die **viele Objekte, Effekte, Gegner, Level oder Szenen** hinzufügt;
2. vor jedem Push einer solchen Änderung;
3. mindestens **alle 30 Tage** je aktivem Projekt (Datum „letzte Prüfung" im Steckbrief);
4. sobald der User von Ruckeln, Hängen oder Langsamkeit spricht.

**Wie:** Headless-Messung (§P4.2) gegen die **Grundlinie** im Steckbrief. Wo das Projekt einen
Prüfstand hat, ist die Messung ein **Prüfpunkt mit Grenze** (z. B. „schwerste Szene ≤ Grundlinie ×
1,25"): wird es langsamer, wird der Prüfstand rot — vor dem Push, nicht beim User.

**Ergebnis:** neue Zahl + Datum in den Steckbrief; liegt sie über Budget → §P6.

---

## §P6 Über Budget: der feste Ablauf  [B]

1. Messen (Zahl je Szene, Gerät, Datum).
2. **Profil** aufnehmen, die heißesten Funktionen nach Eigenzeit lesen.
3. **Nur die größte Ursache** beheben, ohne das Verhalten zu ändern (sonst Freigabe).
4. Nachmessen, Prüfstand grün.
5. Vorher/nachher-Zahl in progress-Datei und Steckbrief.
6. Wiederholen, bis im Budget — oder die nächste Ursache ist ein Umbau [C] → dem User als Tabelle
   vorschlagen (Möglichkeit, Gewinn, Aufwand, Risiko).

Vor einem größeren Tempo-Umbau: **Sicherung** (Git-Tag + Kopie des laufenden Stands).

---

## §P7 Was Claude ungefragt tut  [B]

- Beim **neuen Projekt**: §P1 klären, Budget §P2 und Pflicht-Bausteine §P3 einplanen, Mess-Anzeige
  und Headless-Messung (§P4) gleich mit anlegen, Steckbrief-Zeilen §P8 ausfüllen.
- Bei **jeder Aufgabe**, die §P5.1 erfüllt: vorher und nachher messen und die Zahlen nennen.
- Bei einem Projekt **ohne Leistungsprofil**: die Zeilen §P8 nachtragen (Messung, kein Raten).
- Hinweis an den User nur in einem Satz mit Zahl („Europa L2: 3,3 → 1,4 ms je Schritt").

---

## §P8 Steckbrief-Zeilen (in `<Projekt>/doc/GUIDELINES.md`)

| Rolle | Projekt-Wert |
|---|---|
| Programm-Art (§P1) | |
| Ziel-Geräte + Referenzgerät (§P1) | |
| Performance-Budget (§P2) | |
| Mess-Anzeige + Schalter (§P4.1) | |
| Headless-Messung: Befehl + schwerste Szene (§P4.2) | |
| Grundlinie: Zahl + Datum (§P5) | |
| Letzte Prüfung: Datum + Ergebnis (§P5) | |

Ausfüll-Pflicht wie UNIVERSAL §14: kein Feld leer, nichts geraten; fehlt etwas →
„existiert nicht — Auslöser: <Bedingung>".

---

## Anhang — Herkunft

- **WingsOfFury, 2026-10-30:** Europa Level 2 ruckelte auf dem Telefon. Messung headless (Laptop):
  Pazifik 0,48 ms, Europa L1 1,24 ms, Europa L2 3,3 ms je Schritt (120 Schritte/s → 40 % eines
  Laptop-Kerns). Profil: 63 % in den Ziellisten der Soldaten (n × n je Schritt). Nach §P3 Echtzeit
  1/3/4 und Deckel 240 → 12 Schritte: 1,39 ms (−58 %). Erst daraus entstand diese Datei.
- Pflege: geändert wird nur diese Datei (Repo CLAUDE_CODE_GUIDELINES); der Skill verweist nur.

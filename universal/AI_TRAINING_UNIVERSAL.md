# AI_TRAINING_UNIVERSAL — eine KI trainieren, ohne dass sie die Belohnung austrickst

> **QUELLE:** `CLAUDE_CODE_GUIDELINES/universal/AI_TRAINING_UNIVERSAL.md` (DIES IST DIE QUELLE)
> **STAND:** 2026-10-27 (§T10.4 Beispiele abspielbar)
>
> **Gilt für jedes Projekt, in dem etwas lernt:** Neuroevolution, Reinforcement Learning,
> Training gegeneinander (Self-Play), Lernen aus Aufnahmen. Sprache und Stack egal.
> Geladen über den Claude-Skill `ai-training` (`~/.claude/skills/ai-training/SKILL.md`),
> sobald eine Aufgabe ein Training, eine Belohnung oder einen Trainer berührt.
>
> Bestellt vom User am 2026-10-27 (Projekt WingsOfFury): *„Ich möchte die Zeros trainieren,
> gut zu kämpfen. Dabei können aber viele verschiedene Rewards falsch eingestellt sein […]
> z. B. statt zu kämpfen einfach Vollgas geben und so einem Kampf ausweichen, da
> Beschädigungen Punishment bedeuten. […] Ermittle auch, ab wann eine Simulation sofort
> abgebrochen werden sollte […], damit keine sinnlosen Trainingsläufe entstehen.“*
>
> **Zitier-Konvention:** „TRAINING §Tn“. Eigener Nummernraum, getrennt von UNIVERSAL.
> Projektwerte (Grenzen, Namen der Test-Flieger, Kennzahlen) stehen im
> **Trainings-Steckbrief** (§T11) der `<Projekt>/doc/GUIDELINES.md`.

---

## §T0 Begriffe

| Wort | Bedeutung |
|---|---|
| **Belohnung** (Reward, Fitness) | die Zahl, die das Training größer machen will |
| **Zielbelohnung** | der Teil, der das gewollte Ergebnis misst: Sieg, Treffer, Abschuss, Ziel erreicht |
| **Hilfspunkte** (Shaping) | Zwischenpunkte, die den Weg zum Ziel zeigen: „nah dran“, „vor der Nase“, „in Richtung Ziel“ |
| **Strafe** | negativer Teil: Schaden, Verlust, Munition, Zeit |
| **Austricksen** (Reward Hacking, Specification Gaming) | die Zahl steigt, das gewollte Verhalten nicht |
| **Test-Flieger** (Test-Politik) | ein fest programmiertes Verhalten, das nur prüft, ob die Belohnung stimmt |
| **Champion** | das beste Gehirn bisher, geprüft auf festen Prüfläufen |
| **Prüfläufe** (Validation Seeds) | feste Startlagen, nie zum Trainieren benutzt |
| **Vergleichsgegner** | feste Gegner, gegen die jeder Champion gemessen wird (Regel-KI, alte Champions) |
| **Probelauf** | wenige Generationen, nur um die Messwerte anzusehen |

---

## §T1 Das Ziel zuerst, Hilfspunkte nur als Hilfe  [A]

1. **Die Zielbelohnung wird zuerst und allein aufgeschrieben.** Sie misst das Ergebnis, das
   der User sehen will (Treffer, Abschuss, Sieg), nicht den Weg dahin. Jede andere
   Komponente muss sich als Hilfe dafür begründen lassen.
2. **Hilfspunkte dürfen das beste Verhalten nicht ändern.** Sicher ist nur die Form
   „Potenzial-Differenz“: Hilfspunkte = Φ(neuer Zustand) − Φ(alter Zustand), z. B.
   Φ = −Abstand zum Gegner. Wer im Kreis fliegt, bekommt dann netto nichts (Ng, Harada,
   Russell 1999: genau diese Form lässt die beste Strategie unverändert). Punkte „je Sekunde
   in Zustand X“ sind dagegen ein Trick-Angebot: das Gehirn lernt, in X zu bleiben, statt
   das Ziel zu erreichen.
3. **Hilfspunkte klingen ab.** Sie werden über einen festen Abschnitt des Trainings linear
   auf 0 gesenkt; danach zählt nur noch das Ziel. Richtwert: 10–15 % der geplanten
   Generationen (Bansal et al. 2018: dichte Hilfspunkte nur am Anfang, dann linear auf null).
4. **Ihr Anteil wird gemessen** (§T5). Holt ein Gehirn mehr als die Hälfte seiner Punkte aus
   Hilfspunkten, ist das ein Warnzeichen (§T7).

---

## §T2 Ausweichen darf sich nie lohnen  [A]

Der häufigste Fehler in Kampf-Trainings: Schaden wird bestraft, Treffen noch nicht gekonnt —
also ist **„nicht kämpfen“ das beste Verhalten**, und das Training lernt Flucht, Verstecken
(Decke, Rand) oder Abstand halten. Dagegen gelten diese Rechenregeln, **geprüft vor dem
ersten Lauf** (§T4):

1. **Kein Kampf = Niederlage.** Ein Lauf, in dem nichts passiert ist (Zeit abgelaufen, kein
   Treffer, Flucht aus dem Gebiet), bringt die **schlechteste** erreichbare Punktzahl —
   schlechter als ein verlorener Kampf mit Treffern. Gilt für **beide** Seiten.
2. **Ein gleicher Tausch lohnt sich.** Wer so viel Schaden austeilt, wie er einsteckt, muss
   mehr Punkte haben als jemand, der gar nicht kämpft. Formel-Prüfung: Lohn je Treffer am
   Gegner > Strafe je eingesteckter Treffer (zu Beginn deutlich, Richtwert ≥ 3 ×).
3. **Nullsumme bei Gegnern:** Was eine Seite gewinnt, wird der anderen abgezogen (OpenAI Five:
   „Belohnung des Gegners abziehen“). Dann bringt „beide weichen aus“ beiden 0, nicht beiden
   einen Vorteil.
4. **Verstecke schließen:** jeder Ort, an dem man nicht getroffen werden kann (Decke, Rand,
   Boden, außerhalb des Gebiets), wird entweder physisch begrenzt oder nach einer kurzen
   Schonfrist so teuer wie eine Niederlage.
5. **Strafen sind gedeckelt:** keine Strafe pro Zeit ohne Obergrenze — sonst wird ein früher
   Tod (Lauf endet, Strafe hört auf) zum besten Verhalten.
6. **Ein früher Abbruch darf nicht belohnt werden:** Endet der Lauf beim Tod, bekommt der
   Rest der Zeit den Wert „Niederlage“, nicht 0.

---

## §T3 Erst können, dann sicher werden: ein Lehrplan  [A]

Fähigkeiten, die sich gegenseitig ausbremsen (angreifen ↔ heil bleiben), werden **nacheinander**
gelernt, nicht gleichzeitig:

1. **Phase Angreifen:** Strafe für eingesteckten Schaden klein (Richtwert 0–20 % des
   Endwerts), Hilfspunkte an. Ziel: das Gehirn sucht den Kampf und trifft.
2. **Phase Überleben:** die Schadensstrafe steigt linear auf den Endwert, Hilfspunkte klingen
   ab (§T1.3). Ziel: im Kampf bleiben UND weniger einstecken.
3. **Weiter erst, wenn die Kennzahl stimmt:** Phase 2 beginnt nicht nach Zeit, sondern wenn
   die Kampf-Kennzahl (§T5, z. B. Zeit in Schussweite, Treffer je Lauf) eine Schwelle hält.
   Fällt sie in Phase 2 unter die Schwelle zurück → Strafe nicht weiter erhöhen.
4. **Die Phase steht im Gehirn-Datensatz** (Lehrplan-Stand), damit ein fortgesetztes
   Training nicht wieder bei Phase 1 anfängt.
5. **Startgehirn:** Wo eine Regel-KI existiert, startet das Netz als **Korrektur der Regel**
   (Gewichte 0 = Regel). Dann muss eine Mutation, die mehr angreift, in Phase 1 nicht gegen
   volle Schadensstrafen ankommen.

---

## §T4 Die Belohnung wird geprüft, bevor trainiert wird  [A]

**Pflicht vor jedem Training mit neuer oder geänderter Belohnung.** Fest programmierte
Test-Flieger fliegen dieselben Prüfläufe; ihre Punkte müssen eine **Rangfolge** einhalten.
Hält sie nicht, wird **nicht** trainiert — der Lauf wäre sinnlos.

| Test-Flieger | Verhalten | muss liegen |
|---|---|---|
| **Nichtstuer** | keine Eingabe / geradeaus | ganz unten (Kein Kampf = Niederlage) |
| **Feigling** | Vollgas weg vom Gegner, ausweichen | unter jeder kämpfenden Variante |
| **Versteck** | an Decke/Rand/außerhalb parken | unter jeder kämpfenden Variante |
| **Dauerfeuer** | schießt immer, zielt nicht | unter „Regel-KI“ |
| **Kamikaze** | fliegt direkt in den Gegner | unter „Regel-KI“ |
| **Zufall** | zufällige Eingaben | unter „Regel-KI“ |
| **Regel-KI** | das beste handgeschriebene Verhalten | über allen oben |

- **Geforderte Abstände, nicht nur Reihenfolge:** Feigling < Regel-KI mit deutlichem Abstand
  (Richtwert: mindestens 20 % der Spanne Nichtstuer…Regel-KI). Liegen zwei Zeilen fast gleich,
  kann das Training zwischen ihnen nicht unterscheiden.
- **Der Test liegt im Prüfstand** des Projekts (läuft bei jeder Änderung der Belohnung mit)
  und als **Vorprüfung im Trainer** (vor Generation 1; Ausgabe: die Tabelle mit Punkten).
- **Jedes neu entdeckte Austricksen wird ein neuer Test-Flieger.** Die Tabelle wächst mit dem
  Projekt; ein Fehler, der einmal Trainingszeit gekostet hat, kostet sie nie wieder.

---

## §T5 Verhalten messen, nicht nur Punkte  [A]

Der Trainer schreibt **je Generation** (für den Besten, den Champion und den Schnitt):

1. **Punkte-Bilanz:** Punkte je Komponente (Ziel / Hilfspunkte / jede Strafe einzeln). Nur so
   sieht man, *womit* ein Gehirn seine Punkte holt.
2. **Verhaltens-Kennzahlen** (Projekt legt sie im Steckbrief fest; für Kampf typisch):
   - Anteil der Zeit in Kampf-/Schussweite
   - Schüsse, Treffer, Trefferquote
   - mittlerer Abstand zum Gegner
   - Zeit in Verstecken (Decke, Rand, außerhalb)
   - Lauflänge bis zum Ende, Art des Endes (Sieg / Tod / Zeit / Flucht)
   - Verluste, Zusammenstöße, Eigenbeschuss
3. **Vielfalt:** Streuung der Punkte und der Kennzahlen in der Population. Sind alle gleich,
   kann Mutation nichts Neues mehr finden.
4. **Vergleichsgegner-Wertung:** Champion gegen feste Vergleichsgegner (Regel-KI, ältere
   Champions) auf festen Prüfläufen — die einzige Zahl, die zwischen Läufen vergleichbar ist.
   Steigt sie nicht, ist der Lauf nicht besser geworden, egal was die Trainingspunkte sagen
   (OpenAI Five maß jeden Stand gegen einen Pool fester Referenz-Agenten).
5. **Sichtbar machen:** die Kennzahlen stehen in der Live-Anzeige bzw. der Lernkurve des
   Projekts, nicht nur in einer Log-Datei.

---

## §T6 Erst ein Probelauf  [B]

1. Vor jedem langen Lauf: **Probelauf** mit wenigen Generationen (Richtwert 5) und kleiner
   Population.
2. Danach die Kennzahlen aus §T5 ansehen: Geht die Kampf-Kennzahl hoch oder runter? Woher
   kommen die Punkte? Mindestens **einen Lauf ansehen** (abspielen), nicht nur Zahlen lesen.
3. Erst wenn die Richtung stimmt, wird der lange Lauf gestartet.

---

## §T7 Wann ein Lauf abbricht — und wann er nur warnt  [A]

Der Trainer prüft die Regeln **nach jeder Generation** (nach einer Anlaufzeit von N
Generationen, Richtwert 5). Harte Regeln **halten den Lauf an** und schreiben den Grund ins
Protokoll und in die Live-Anzeige; weiche Regeln **warnen** (Live-Anzeige + Protokoll).
Die Grenzen stehen im Trainings-Steckbrief (§T11); die Richtwerte hier sind Vorgaben.

**Harte Regeln (Anhalten):**

| Kennung | Bedingung | Bedeutung |
|---|---|---|
| H1 Feigheit | Kampf-Kennzahl des Besten < Schwelle (Richtwert 50 % des Werts der Regel-KI) über 5 Generationen | lernt ausweichen |
| H2 Austricksen | Trainingspunkte steigen über 10 Generationen (> 10 %), Zielbelohnung oder Vergleichsgegner-Wertung nicht | holt Punkte am Ziel vorbei |
| H3 Unmöglicher Wert | Punkte über dem rechnerischen Maximum oder NaN/∞ | Fehler in Belohnung oder Simulation |
| H4 Belohnungs-Prüfung | §T4 schlägt fehl (vor Generation 1) | Lauf wäre sinnlos |
| H5 Versteck | Anteil Zeit in Verstecken > 30 % beim Besten über 5 Generationen | hat einen Ort ohne Gefahr gefunden |

**Weiche Regeln (Warnen):**

| Kennung | Bedingung | Bedeutung |
|---|---|---|
| W1 Stillstand | Champion seit 15 Generationen nicht verbessert | Plateau: Belohnung, Mutation oder Lehrplan anpassen |
| W2 Hilfspunkte dominieren | > 50 % der Punkte des Besten aus Hilfspunkten | droht H2 |
| W3 Vielfalt weg | Streuung der Punkte < 2 % des Mittels | Population eingefroren |
| W4 Rückschritt | Vergleichsgegner-Wertung des Champions fällt gegenüber dem Vorgänger | Training gegeneinander dreht sich im Kreis (§T8) |
| W5 Strafe frisst alles | eine einzelne Strafe > 80 % der Gesamt-Abzüge | diese Strafe bestimmt das Verhalten |

**Nach einem Abbruch:** nicht einfach neu starten. Erst die Punkte-Bilanz lesen, die Ursache
benennen, die Belohnung ändern, **§T4 erneut laufen lassen**, dann Probelauf (§T6).

---

## §T8 Training gegeneinander (Self-Play, Koevolution)  [A]

1. **Eine Seite trainiert, die andere ist eingefroren.** Wechsel nur blockweise (z. B. nach
   je 20–50 Generationen). Trainieren beide gleichzeitig gegen den jeweils neuesten Gegner,
   kippt das Gleichgewicht: eine Seite wird früh stark, die andere erholt sich nie (Bansal et
   al. 2018: „nur gegen den neuesten Gegner“ war die schlechteste Variante).
2. **Gegner-Pool statt eines Gegners:** jeder Lauf zieht seinen Gegner aus
   - der Regel-KI (immer dabei, Anker),
   - älteren Champions („Hall of Fame“, Rosin & Belew 1997), zufällig aus dem
     jüngeren Teil der Geschichte (Bansal: Gleichverteilung über die letzten 50–100 %),
   - wo vorhanden: einem Doppelgänger echter Spieler.
   Wer nur gegen einen Gegner trainiert, lernt nur dessen Schwächen.
3. **Gegner, die schwer sind, öfter:** gegen Gegner, die oft gewinnen, wird öfter geflogen
   (AlphaStar: „Prioritized Fictitious Self-Play“, Gegnerwahl nach Siegquote).
4. **Kreislauf erkennen (W4):** Ein neuer Champion muss auch die **alten** Vergleichsgegner
   schlagen. Gewinnt er nur gegen den aktuellen Gegner und verliert gegen ältere, ist das kein
   Fortschritt, sondern ein Kreis (Stein–Schere–Papier).
5. **Symmetrie:** Beide Seiten bekommen dieselben Regeln aus §T2 (Kein Kampf = Niederlage für
   beide). Darf eine Seite straffrei fliehen, lernt die andere nie, sie zu stellen.

---

## §T9 Neuroevolution: was die Messung ehrlich hält  [B]

1. **Gleiche Startlagen für alle** einer Generation (Common Random Numbers): Unterschiede
   kommen dann vom Gehirn, nicht vom Glück.
2. **Mehrere Läufe je Kandidat**, mindestens für die Besten (Ausscheidung: ein Lauf für alle,
   mehrere für die Spitze).
3. **Champion nur nach Prüfläufen**, die nie zum Trainieren benutzt werden; ein neuer Champion
   muss den alten auf **denselben** Prüfläufen schlagen.
4. **Rang statt Rohpunkte** bei der Auswahl, wenn einzelne Läufe Ausreißer erzeugen (ein
   Glückstreffer soll nicht die ganze Population übernehmen).
5. **Elite:** die Besten gehen unverändert weiter; der Champion fliegt jede Generation mit.
6. **Gelernte Daten werden erst übernommen, wenn sie gemessen besser sind** (Vergleichsgegner,
   Prüfläufe) — sonst bleibt der alte Stand. Übernahme mit Messwert und Datum im Protokoll.

---

## §T10 Protokoll: jeder Lauf ist nachvollziehbar  [B]

1. Jeder Lauf schreibt: Belohnungs-Satz (alle Gewichte mit Namen, **mit Version**),
   Lehrplan-Phase, Population, Generationen, Seeds, Ergebnis der Belohnungs-Prüfung (§T4),
   Abbruch-/Warn-Meldungen (§T7), Vergleichsgegner-Wertung am Ende, übernommen ja/nein + Grund.
2. **Jede Änderung eines Belohnungs-Gewichts** steht mit Grund und Messwert im Code-Kommentar
   des Gewichts (Vorbild: „gemessen <Datum>: …“).
3. Ein Lauf ohne Messwert gilt als nicht gelaufen.
4. **Jedes Beispiel ist abspielbar** (User 2026-10-27: „wenn du mir Beispiele nennst, wie stürzt immer ins
   Wasser […], auch die Generation nennen, wo ich mir das selber angucken kann […] oder auch
   Beispielgenerationen abspeichern“). Wer dem User ein Verhalten nennt, nennt dazu **Übung, Generation,
   Startlage (Seed) und Rechenschritt** — so, dass der User es in der Anzeige des Projekts selbst abspielen
   kann. Vorher selbst nachprüfen, dass genau diese Generation auf genau dieser Startlage das Verhalten zeigt.
   - Generationen, die als Beispiel taugen, werden **gespeichert, auch wenn nichts übernommen wird**
     (Archiv). Ein neuer Lauf überschreibt archivierte Generationen nie, auch nicht nach dem Zurücksetzen
     des Gehirns: er zählt hinter der letzten archivierten Generation weiter.
   - Zeigt sich ein Verhalten nur unter anderen Bedingungen als im Training (z. B. anderer Rechenschritt),
     braucht die Anzeige einen Schalter für genau diese Bedingung — sonst sieht der User etwas anderes als
     das genannte Beispiel.

---

## §T11 Trainings-Steckbrief (jedes Projekt mit Training füllt ihn aus)

Steht in `<Projekt>/doc/GUIDELINES.md` unter dem Projekt-Steckbrief. Wie dort: kein Feld leer,
statt „—“ der Satz „existiert nicht — Auslöser: …“.

| Rolle | Projekt-Wert |
|---|---|
| Trainer (Datei, Startbefehl) | |
| Belohnungs-Register (eine Stelle für alle Gewichte) | |
| Zielbelohnung je Übung | |
| Hilfspunkte je Übung + Abkling-Plan (§T1) | |
| Lehrplan-Phasen + Schwellen (§T3) | |
| Test-Flieger + geforderte Rangfolge (§T4) | |
| Verhaltens-Kennzahlen (§T5) | |
| Abbruch-/Warn-Grenzen (§T7) | |
| Vergleichsgegner + Prüfläufe (§T5, §T9) | |
| Gegner-Pool beim Training gegeneinander (§T8) | |
| Gehirn-Datei + Übernahme-Regel (§T9) | |
| Live-Anzeige der Kennzahlen (§T5) | |

---

## Quellen (gelesen 2026-10-27)

- Bansal, Pachocki, Sidor, Sutskever, Mordatch: *Emergent Complexity via Multi-Agent
  Competition*, ICLR 2018 — https://arxiv.org/abs/1710.03748 (dichte Hilfspunkte am Anfang,
  linear auf null in 500 bzw. 1000 Iterationen, ≈ 10–15 % des Trainings; ohne diesen Lehrplan
  „nicht optimale Verhaltensweisen“, z. B. nur stehen und zur Mitte gehen; Gegner zufällig aus
  älteren Versionen statt nur dem neuesten, „nur gegen den neuesten“ am schlechtesten).
- OpenAI: *Dota 2 with Large Scale Deep Reinforcement Learning*, 2019 —
  https://arxiv.org/abs/1912.06680 (Belohnung des Gegners abziehen; Team-Spirit langsam von 0,3
  auf 1,0 erhöht; Fortschritt gemessen gegen einen Pool fester Referenz-Agenten mit TrueSkill).
- DeepMind: *AlphaStar: Grandmaster level in StarCraft II*, 2019 —
  https://deepmind.google/discover/blog/alphastar-grandmaster-level-in-starcraft-ii-using-multi-agent-reinforcement-learning/
  (Liga mit Haupt-Agenten und „Exploiter“-Agenten; Gegnerwahl nach Siegquote, PFSP).
- Ng, Harada, Russell: *Policy Invariance Under Reward Transformations*, ICML 1999 —
  https://mlanthology.org/icml/1999/ng1999icml-policy/ (nur potenzialbasierte Hilfspunkte
  lassen die beste Strategie unverändert; beliebige Zusatzpunkte laden zum Austricksen ein).
- Rosin, Belew: *New Methods for Competitive Coevolution*, Evolutionary Computation 5(1), 1997
  (Hall of Fame: gegen die Besten früherer Generationen prüfen; Koevolution kann sich im Kreis
  drehen — Nolfi/Floreano).
- Krakovna u. a. (DeepMind): Liste von Specification-Gaming-Beispielen und Blog
  *Specification gaming: the flip side of AI ingenuity*, 2020 (Boot fährt im Kreis um
  Bonuspunkte statt ins Ziel; Greifarm täuscht die Kamera).
- Salimans u. a.: *Evolution Strategies as a Scalable Alternative to Reinforcement Learning*,
  2017 — https://arxiv.org/abs/1703.03864 (gemeinsame Zufallszahlen für alle Kandidaten).

Richtwerte ohne Quelle (Schwellen in §T7, Faktor in §T2.2) sind Vorgaben dieser Datei; jedes
Projekt ersetzt sie durch eigene Messwerte mit Datum.

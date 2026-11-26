# PRUEFSTAND_UNIVERSAL — Prüfungen, die wirklich etwas prüfen

> **QUELLE:** `CLAUDE_CODE_GUIDELINES/universal/PRUEFSTAND_UNIVERSAL.md` (DIES IST DIE QUELLE)
> **STAND:** 2026-11-26 (§S5 Tempo und Lesbarkeit der Prüfläufe; Erstfassung 2026-11-06)
>
> **Gilt für jedes Projekt mit Prüfstand, Web und Java.** Ein Projekt ohne Prüfstand bekommt durch
> diese Datei keinen Auftrag, einen zu bauen (UNIVERSAL §0, Gerüst auf Vorrat). Geladen über den
> Claude-Skill `pruefstand`, sobald eine Prüfung geschrieben oder geändert wird oder ein Prüfstand rot ist.
>
> **Zitier-Konvention:** „PRÜFSTAND §Sn". Eigener Nummernraum.

---

## §S1 Eine neue Prüfung war einmal rot  [A]

Eine neue Prüfung läuft einmal gegen den alten oder absichtlich kaputten Code und muss dort rot
werden. Das Ergebnis steht im Protokoll. Eine Prüfung, die nie rot werden kann, ist schlimmer als
keine: Sie meldet Sicherheit, die es nicht gibt. Im Fachjargon heißt das tautologische Prüfung, das
Gegenmittel Mutationstest.

Belege: Ein Abstand in einer Belohnungsprüfung war in beiden Fassungen immer erfüllt. Eine
Oberflächenprüfung prüfte bis zu einem Merkmal, das es nie gab (WingsOfFury 2026-11). Ein Läufer
meldete grün, während die Gruppe nichts maß (GameLoop2).

---

## §S2 Geprüft wird Verhalten, nicht Quelltext  [A]

Eine Prüfung sucht nicht nach einer Textstelle im Code. Sie bricht beim harmlosen Umformulieren und
schweigt beim echten Fehler.

**Ausnahme:** Regeln ÜBER den Quelltext, etwa „kein `innerHTML` mit Nutzerdaten". Solche Prüfungen
sind unabhängig von Zeilenenden.

Beleg: Eine Prüfung suchte einen wörtlichen Funktionsaufruf; drei weitere scheiterten an `\n` nach
einem Wechsel der Zeilenenden (WingsOfFury 2026-11).

---

## §S3 Ein Prüfstand sichert Zusagen zu, keinen Bestand  [B]

Gegen echte Benutzerdaten wird eine Zusage des Codes geprüft: Hin- und Rückweg ohne Verlust,
Byte-Gleichheit, Zahl und Reihenfolge der Datensätze. Eine Momentaufnahme der Daten („die Datei
enthält noch keine Zeile X") veraltet, sobald die Software funktioniert, und meldet dann einen Fehler
genau dort, wo alles richtig läuft.

Beleg: GameLoop2 §51; eine Erwartungszahl wechselte an einem Tag dreimal, ohne dass sich
Produktivcode änderte.

---

## §S4 Lesen wird als Fremder geprüft, gegen eine Erlaubt-Liste  [A]

Für jede Sammlung, die ein anderer als der Eigentümer lesen darf, gibt es einen Test: als Fremder
und als Abgemeldeter lesen. Jedes Feld außerhalb der Erlaubt-Liste (WEB §31) macht ihn rot. Geprüft
wird die echte Regel im Emulator, nicht der Text der Regeldatei (§S2). Rechte-Tests prüfen Schreiben
UND Lesen.

Beleg: myLangSite 2026-11-14. Die Regel-Tests prüften nur Schreiben; die Prüfung H2 kannte nur eine
Sperrliste von Geldfeldern. E-Mail und Guthaben lagen sechs Monate offen, kein Test war je rot.

---

## §S5 Prüfläufe schnell und lesbar  [A]

Ein Prüflauf, der wartet, hängt oder wiederholt werden muss, kostet mehr als der Fehler, den er findet.
Gilt für jede Sitzung, die Tests startet.

1. **Teure Umgebung einmal starten.** Emulatoren, lokaler Server, Browser laufen über viele Läufe. Zwischen
   den Läufen werden die Daten geleert, nicht die Programme neu gestartet. Der Läufer hat dafür einen Schalter
   (z. B. `--behalten`) und einen zum Beenden.
2. **Feste Einstellungen liegen im Repo.** Ports, Pfade, Java-Ort, Projekt-Kennung stehen in einer
   Config-Datei, die der Läufer liest. Was in jeder Sitzung von Hand neu gebaut wird, wird ein Skript.
3. **Nachladen statt Neustart**, wo das Werkzeug es kann (z. B. Firestore-Regeln per REST in den Emulator).
   Erst gemessen (§S1: alte Fassung rot, neue grün), dann als Regel.
4. **Lange Läufe (über 2 min) im Hintergrund**, ganze Ausgabe in eine Datei im scratchpad. Danach wird die
   Datei durchsucht. Nie die Ausgabe filtern (`tail`, `Select-String`, `-Last`) und dann neu laufen lassen,
   weil die Fehlerzeile fehlte. Hintergrund höchstens 20 min; länger → in Gruppen teilen.
5. **Warten auf eine Bedingung, nie auf die Uhr.** Kein `sleep N`, um zu raten, ob etwas fertig ist; der
   Läufer wartet auf Port, Meldung oder Datei, mit Obergrenze.
6. **Jeder Schritt im Test hat eine Zeitgrenze**, auch Aufrufe in die Seite (`page.evaluate` hat keine).
   Ein Hänger kostet höchstens diese Grenze, dann zählt er rot und der nächste Ablauf läuft.
7. **Wackler werden benannt, nicht weggewiederholt.** Höchstens eine Wiederholung; das Ergebnis heißt
   „wackelt“, nie still „grün“. Die Ursache wird eine Aufgabe.
8. **Unabhängige Tests laufen parallel** (Worker-Pool, Kerne − 1), sobald die Gesamtzeit über 1 min liegt
   und die Tests keine Dateien oder Ports teilen. Vorher einmal seriell und parallel vergleichen.
9. **Windows-PowerShell: kein `2>&1` hinter Node/Java.** Es macht aus jeder Warnung einen „NativeCommandError“
   und verfälscht den Exit-Status. Testläufe im Bash-Werkzeug oder ohne Umleitung.

Beleg: myLangSite 2026-11-24 bis 26, 332 Testläufe, 7,9 h Wartezeit. Emulatoren 41× neu gestartet (je bis
90 s), Regel-Emulator 92× mit Java-Pfad von Hand, 474 gefilterte Ausgaben mit Wiederholungen, 255× `2>&1`,
75× `sleep`, 4× Zeitgrenze des Werkzeugs (600 s). Auswertung: myLangSite
`doc/progress/progress_2026-11-26_test-tempo.txt`.

---

## Anhang — Herkunft und Pflege

- Entstanden am 2026-11-06 aus der Auswertung der Fehler von zwei Tagen in WingsOfFury und dem
  Abgleich mit myLangSite und GameLoop2.
- **Pflege:** Eine Regel wandert hierher, sobald sie im zweiten Projekt gilt. Prüfstand-Regeln, die
  bisher nur ein Projekt belegt, bleiben dort (WingsOfFury `doc/GUIDELINES.md` §29: Prüfungen
  beeinflussen sich, veraltete erzeugte Dateien, Stufen, technisch erzwungener Lauf vor dem Push).

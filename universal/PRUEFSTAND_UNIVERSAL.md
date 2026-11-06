# PRUEFSTAND_UNIVERSAL — Prüfungen, die wirklich etwas prüfen

> **QUELLE:** `CLAUDE_CODE_GUIDELINES/universal/PRUEFSTAND_UNIVERSAL.md` (DIES IST DIE QUELLE)
> **STAND:** 2026-11-06 (Erstfassung)
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

## Anhang — Herkunft und Pflege

- Entstanden am 2026-11-06 aus der Auswertung der Fehler von zwei Tagen in WingsOfFury und dem
  Abgleich mit myLangSite und GameLoop2.
- **Pflege:** Eine Regel wandert hierher, sobald sie im zweiten Projekt gilt. Prüfstand-Regeln, die
  bisher nur ein Projekt belegt, bleiben dort (WingsOfFury `doc/GUIDELINES.md` §29: Prüfungen
  beeinflussen sich, veraltete erzeugte Dateien, Stufen, technisch erzwungener Lauf vor dem Push).

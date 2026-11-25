# GELD_RECHTE_UNIVERSAL — Geld, Buchungen und Rechte am Server

> **QUELLE:** `CLAUDE_CODE_GUIDELINES/universal/GELD_RECHTE_UNIVERSAL.md` (DIES IST DIE QUELLE)
> **STAND:** 2026-11-25 (§G17 Wer Kosten verursacht, zahlt; §G16 Rest beim Löschen; Erstfassung 2026-11-18)
>
> **Gilt für jedes Projekt, in dem Geld, Guthaben, Buchungen oder Rechte über einen Server laufen**
> (Web und Java). Ein Projekt ohne Server oder ohne Geld bekommt durch diese Datei keinen Auftrag.
> Gelesen: beim Bau oder Umbau eines Geld-, Buchungs- oder Rechte-Wegs und bei jedem Code-Audit
> (Prompt_Handling.txt „CODE-AUDIT NACH JEDER PD“).
>
> **Zitier-Konvention:** „GELD §Gn". Eigener Nummernraum.
>
> **Herkunft:** myLangSite, vier Bug-Audits 2026-11-17/18 mit 76 Befunden am Zahl- und
> Buchungssystem. 74 davon hätte eine anerkannte Praxis verhindert; unsere Regeln deckten 2 ab.
> Alle 6 schweren Befunde fielen in Klassen ohne Bauregel. Einordnung:
> `myLangSite/doc/progress/progress_2026-11-18_bestpractice-abgleich.txt`.
>
> **Quellen:** OWASP API Security Top 10 (2023), OWASP ASVS 4.0.3, OWASP WSTG (Business Logic),
> CWE-362/367/636, Stripe-Doku (Idempotent requests, Error handling, Webhooks), PayPal Payouts und
> Wise Transfers (Status-Doku), Saga-Muster (Garcia-Molina & Salem 1987), doppelte Buchführung
> (Fowler, Analysis Patterns), DDD-Aggregat (Evans 2003).

---

## §G1 Ein Vorgang, ein Eingang  [A]

Ein Geschäftsvorgang (Buchen, Absagen, Auszahlen, Freigeben) hat genau EINEN Eingang am Server.
Dort stehen alle Prüfungen: Anmeldung, Sperre, Freigabe des Kontos, Besitz, Zustand, Grenzen —
gesammelt in einer gemeinsamen Funktion. Ein zweiter Weg (Anfrage, Vorschlag, Admin, Job) ruft
den ersten auf, statt ihn nachzubauen. Prüfungen im Browser sind Komfort, nie Schutz.

Grund: Führen fünf Wege zum selben Geld-Ergebnis, braucht jeder dieselben Prüfungen. Jede vergessene
ist ein Loch (Beleg: ein vergessener Server-Weg buchte ohne Freigabe der Zeit und ohne Preisprüfung).
Quelle: ASVS V1.4.1, V4.1.1; Saltzer & Schroeder „Complete Mediation“.

## §G2 Rechte je Objekt und je Handlung  [A]

Jede Server-Funktion beantwortet zuerst zwei Fragen: Wem gehört DIESES Objekt (Kennung aus dem
Aufruf nie ungeprüft)? Darf DIESE Rolle DIESE Handlung? Wer etwas bekommt — Geld, Rang, Freigabe —
löst es nie selbst aus. Admin-Werkzeuge prüfen zusätzlich, ob das Ziel dafür gedacht ist
(z. B. nur Testkonten löschen).
Quelle: OWASP API1:2023 (BOLA), API5:2023 (BFLA), ASVS V4.2.1.

## §G3 Schreiben nur mit Feld-Erlaubt-Liste  [A/B]

Jedes Schreiben — Datenbank-Regel oder Server-Funktion — nennt die erlaubten Felder mit Typ und
Länge. Alles andere wird abgelehnt. Zu jedem Schreiber im Browser gibt es einen Regel-Test mit
genau seinen Feldern; so fällt auf, wenn Browser und Regel auseinanderlaufen (Beleg: eine
Lesebestätigung schrieb ein Feld zu viel und wurde still abgelehnt).
Quelle: OWASP API3:2023 (Mass Assignment), ASVS V5.1.2; Firebase „hasOnly“/„affectedKeys“.

## §G4 Der Server rechnet; ein Geld-Objekt kennt seine Grenzen  [A/C]

Betrag, Dauer, Preis und Rolle berechnet der Server aus gespeicherten Daten. Werte aus dem Browser
dienen nur dem Vergleich („Preis wie angezeigt?“). Ein Objekt mit Geld (Buchung, Auszahlung,
Abo-Tag) speichert seine Grenzen selbst: Anfang, Ende, Bestandteile, Preis. Sie werden nie aus
Nachbardaten neu abgeleitet (Beleg: die Dauer einer Stunde aus „anschließenden Zellen desselben
Schülers“ zählte die nächste, schon bezahlte Stunde mit).
Quelle: ASVS V11.1; DDD-Aggregat mit Invarianten.

## §G5 Zustandsautomat mit Zeitfenstern; Fehlendes heißt verboten  [A]

Jedes Objekt mit Geld hat einen Zustandsautomaten: welche Übergänge, wer sie auslöst, bis wann.
Er steht als Tabelle in der Projekt-Doku und als eine Funktion im Code. Fehlt eine Angabe
(Zeitfenster, Status, Feld), ist der Übergang verboten — nie erlaubt. Auch das Löschen eines Kontos
ist ein Übergang: offenes Geld in jedem Topf blockiert es.
Quelle: ASVS V11.1.1/V11.1.2, OWASP WSTG-BUSL-06, CWE-636 (Fail securely).

## §G6 Unklarer Ausgang ist kein Fehler; Idempotenz-Schlüssel immer  [A]

Jeder Aufruf, der bei einem Anbieter Geld bewegt, trägt einen Idempotenz-Schlüssel aus der eigenen
Kennung — eine Wiederholung bucht nie doppelt. Zeitüberschreitung, Netzfehler, unlesbare Antwort
und Antworten eines Test-/Mock-Modus im Live-Betrieb heißen: Ausgang UNKLAR. Dann wird nicht
zurückgebucht, sondern geprüft (Abgleich, §G7, oder Admin). Zurückgebucht wird nur bei einer
eindeutigen Ablehnung.
Quelle: Stripe „Idempotent requests“ + „Error handling“; OWASP API10:2023.

## §G7 Abgleich bis zum Endzustand; Webhooks sind doppelt und ungeordnet  [A]

Ein Vorgang beim Anbieter ist erst im Endzustand fertig. Ein Abgleich-Job fragt bis dahin nach —
auch nach „gesendet“, denn Geld kann zurückkommen (PayPal UNCLAIMED → RETURNED, Wise bounced_back).
Er filtert gezielt, liest in fester Reihenfolge und hat ein Höchstalter, nach dem ein Mensch prüft.
Webhooks: Doppelte und ungeordnete Ereignisse sind normal; jede Verarbeitung ist idempotent und
verträgt jede Reihenfolge. Jedes verarbeitete Ereignis steht im Code UND im Abo beim Anbieter; die
Liste steht in der Projekt-Doku.
Quelle: Stripe „Webhooks best practices“, PayPal Payouts / Wise Transfers Status-Doku.

## §G8 Jede Geldbewegung hat einen Beleg; erst Geld, dann Daten  [A]

Jede Änderung eines Guthabens schreibt in DERSELBEN Transaktion einen Beleg (Art, Betrag, Bezug).
Ein Ablauf aus mehreren Schritten führt zuerst den Schritt aus, der Geld bewegt; scheitert er,
bleibt alles stehen. Jeder spätere Schritt hat einen Ausgleich (Saga). Nie erst die Buchung löschen
und dann das Geld aus dem Browser zurückholen.
Quelle: doppelte Buchführung (Fowler), Saga-Muster.

## §G9 Prüfen und Handeln in einer Transaktion  [A]

„Gibt es das schon?“, „Ist es noch offen?“, „Hat es schon begonnen?“ werden in derselben
Transaktion gelesen, in der geschrieben wird — sonst legt ein Doppelklick zwei Einträge an. Eine
Sperre hat immer ein Ende und wird auch im Fehlerfall gelöst.
Quelle: CWE-367 (TOCTOU), CWE-362, ASVS V11.1.6.

## §G10 Grenzen für Menge, Größe und Häufigkeit  [B]

Jede Liste, Abfrage, Datei-Anzahl, Textlänge, Zahlungsmethoden-Zahl und jeder Auslöser von Mails
oder Nachrichten hat eine Grenze; Mail-Auslöser zusätzlich eine Wartezeit. Jobs lesen in fester
Reihenfolge und überspringen Hängendes, statt dahinter zu verhungern.
Quelle: OWASP API4:2023, API6:2023, ASVS V11.1.4.

## §G11 Kein Endpunkt ohne Aufrufer  [B]

Eine öffentlich aufrufbare Funktion ohne Aufrufer wird gelöscht — beim Anbieter UND im Code —, nicht
per Schalter abgeschaltet. Das Audit vergleicht die Liste der deployten Endpunkte mit ihren Aufrufern.
Quelle: OWASP API9:2023 (Inventory), Top 10 A05.

## §G12 Fehler mit passendem Code; Fremddaten mit Prüfung  [B]

Fehler gehen mit passendem Code an den Aufrufer (ungültig, verboten, nicht gefunden, unklar), nie
pauschal „intern“; ein schon passender Fehler wird unverändert weitergereicht. Nichts wird still
verschluckt. Fremddaten (JSON, Anbieter-Antworten, Kennungen mit unbekanntem Typ) werden geprüft
gelesen.
Quelle: ASVS V7.4.

## §G13 Jeder Status hat einen Text  [B]

Jeder gespeicherte Status eines Geld-Objekts hat einen Text für den Nutzer. Ein Teil-Erfolg
(„zwei von drei erstattet“) wird als solcher genannt, mit dem nächsten Schritt.
Quelle: Nielsen-Heuristiken 1 und 9.

## §G14 Fünf Missbrauchs-Tests je Geld-Funktion  [A]

Zu jeder Server-Funktion mit Geld oder Rechten gehören fünf Tests: fremde Kennung, gesperrtes Konto,
falscher Zustand, doppelter Aufruf, Zeitüberschreitung beim Anbieter. Jeder war einmal rot
(PRÜFSTAND §S1).

## §G15 Ein Kommentar, der Sicherheit behauptet, hat einen Test  [B]

„Nur der Server schreibt“, „mit Wartezeit“, „wird nicht aufgerufen“ sind Behauptungen. Sie bekommen
einen Test oder fliegen raus (Beleg: „additiv, solange der Browser sie nicht aufruft“ stand über einer
deployten, öffentlich aufrufbaren Funktion).

## §G16 Konto löschen hinterlässt einen Rest; eine Sperre überlebt das Löschen  [A]

Wer sein Konto löscht, darf sich danach nicht als „neu“ oder „nie gesperrt“ wieder anmelden. Darum:

1. **Ein Rest je Person**, gespeichert BEVOR das Profil gelöscht wird (fehlt er, wird nicht gelöscht).
   Schlüssel: HMAC (geheimer Schlüssel am Server) der normierten E-Mail. Normiert heißt: klein, ohne
   Leerzeichen, ohne `+zusatz`, bei Gmail ohne Punkte. Ein einfacher SHA-256 reicht nicht, denn er lässt
   sich per Wörterbuch zurückrechnen.
   Inhalt nur: Rollen je gehabt, gesperrt ja/nein mit Zeitraum, Anzahl der Löschungen, Daten, alte
   Kennungen. Kein Name, keine Adresse, kein Freitext.
2. **Die Anmeldung prüft den Rest am Server**, vor dem Anlegen des Kontos und für jeden Anbieter
   (E-Mail, Google …). Ist der Rest gesperrt, wird die Anmeldung abgelehnt. Sonst wird die neue Kennung
   mit den früheren Rollen verknüpft, damit Vorteile für „neu“ nicht ein zweites Mal greifen.
3. **Eine Lösch-Tabelle steht in der Projekt-Doku.** Sie nennt für jede Datenart: gelöscht oder bleibt,
   Frist, Grund. Belege mit Geld bleiben nach Steuer- und Handelsrecht und hängen an der alten Kennung.
4. **Transparenz:** Der Lösch-Dialog und die Datenschutzerklärung nennen den Rest, den Zweck und die Frist.
5. **Weitere Merkmale nur als Hinweis**, nie als harte Sperre: Zahlkarten-Fingerabdruck, Gerät, IP.
   Grund: Karten und Geräte werden geteilt.
6. **Test:** gesperrt → löschen → mit derselben Adresse neu anmelden. Das muss abgelehnt werden, auch mit
   `+zusatz` und über Google. Der Test war einmal rot.

Grund: Die Sperre hing nur am Profil. Ein gesperrter Nutzer löschte sich und registrierte sich mit
derselben Adresse neu; die Sperre war weg (Beleg: myLangSite TC4-1, 2026-11-25).
Quelle: Art. 6 Abs. 1 lit. f und Art. 17 Abs. 3 DSGVO. Irische Datenschutzbehörde, Entscheidung Apple
(2024): einen Prüfwert der E-Mail zu behalten ist zulässig, aber der Nutzer muss beim Löschen davon
erfahren. Stripe „detect duplicate cards“ (Fingerabdruck nur als Merkmal). OWASP ASVS V2
(Account lifecycle).

## §G17 Wer Kosten verursacht, zahlt — jede kostenpflichtige Leistung hat einen Zahler und eine Grenze  [A]

Jede Leistung, die beim Anbieter Geld kostet (Video-Minuten, Speicher, Mails, Datenbank, Aufrufe, Zahlungs-
gebühren), hat in der Projekt-Doku eine Zeile: **Leistung → Kosten beim Anbieter → wer sie auslöst → wer sie
bezahlt → Grenze am Server → Beleg Datei:Zeile.** Darum:

1. **Der Zahler ist eine bezahlte Handlung, kein Zustand.** Ein Vorteil (kommissionsfrei, Raum offen, mehr
   Speicher) hängt an einem bezahlten Beleg für genau diesen Zeitraum, nie an einem Feld, das der Nutzer setzen,
   löschen oder im richtigen Moment umschalten kann (Modell wechseln, Profil verbergen, Feld entfernen).
2. **Die Leistung endet mit der Bezahlung.** Dauer, Menge und Größe kommen aus dem bezahlten Objekt (§G4), nie
   aus einem Feld, das der Browser schreibt. Nachlauf ist kurz und benannt.
3. **Ein Mindestbetrag je Einheit** deckt die Stückkosten (z. B. Mindestprovision je Stunde): ein Preis von
   1 Cent darf die volle Leistung nicht freischalten.
4. **Was niemand bezahlt, hat eine Mengengrenze** (§G10): Mails, Dateien, Nachrichten, Aufrufe je Nutzer und
   Zeitraum. Dazu eine Notbremse für das ganze Projekt (Budget-Alarm, der abschaltet).
5. **Was außerhalb der Plattform bezahlt wird, nutzt die Plattform nicht umsonst:** kostenpflichtige Teile
   (Raum, Speicher) nur mit Beleg; Kontakt außerhalb wird nicht verboten, aber offen benannt (Fairness-Hinweis).
6. **Eine neue Leistung ohne Zeile in der Tabelle ist ein Audit-Befund HOCH.** Das Audit prüft je Zeile: Kann
   ein Nutzer die Leistung bekommen, ohne den Zahler auszulösen?

Grund: 14 Wege, die Plattform fast umsonst zu nutzen, fanden sich in EINER Suche — jeder hing an einem Zustand
statt an einem bezahlten Beleg (Modell im Tagestakt wechseln, Abo + verborgen, Feld löschen, 1-Cent-Preis,
Raumdauer aus einem Browser-Feld, Raum bleibt nach dem Ende offen; Beleg: myLangSite L1–L14, 2026-11-25).
Quelle: OWASP API4:2023 (Unrestricted Resource Consumption, „Denial of Wallet“), API6:2023 (Unrestricted Access
to Sensitive Business Flows), OWASP WSTG-BUSL-05 (Function usage limits), FinOps Foundation „Unit Economics“.

---

## Anhang — Pflege

Neue Regel nur mit Beleg (Befund aus einem Projekt) und Quelle. Geändert wird nur diese Datei.

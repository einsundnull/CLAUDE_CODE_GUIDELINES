---
name: ai-training
description: "Use whenever a task trains, tunes or evaluates a learning agent — neuroevolution, reinforcement learning, self-play, rewards/fitness/penalties, a trainer script, brains/weights, champions, or behaviour like fleeing/hiding/not fighting after training (German: KI trainieren, Training, Belohnung, Reward, Strafe, Trainer, Gehirn, Generationen). Loads the universal AI-training rules: reward checks before training, behaviour metrics, abort rules, self-play opponent pools."
---

# AI Training

Die Regeln stehen an EINER Stelle, im Guidelines-Repo. Diese Datei verweist nur darauf.

1. Lies ganz: `C:\Users\pc\Documents\CLAUDE_CODE_GUIDELINES\universal\AI_TRAINING_UNIVERSAL.md`
   (Zitat: „TRAINING §Tn“).
2. Lies im Projekt den **Trainings-Steckbrief** (TRAINING §T11) in `<Projekt>\doc\GUIDELINES.md`.
   Fehlt er: anlegen, bevor am Training etwas geändert wird.
3. Vor jedem Trainingslauf mit neuer oder geänderter Belohnung:
   - Belohnungs-Prüfung mit Test-Fliegern (§T4) — schlägt sie fehl, wird NICHT trainiert.
   - Probelauf (§T6), Kennzahlen ansehen (§T5).
   - Abbruch-/Warn-Regeln aktiv (§T7).
4. Gelerntes erst übernehmen, wenn es gegen Vergleichsgegner gemessen besser ist (§T9).

Geändert werden die Regeln nur in der Repo-Datei, nie hier.

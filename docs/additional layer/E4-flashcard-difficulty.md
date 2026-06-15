# E4: Flashcard Recall Difficulty + SM-2 Blend

Goal: stop treating every flashcard the same. Give each card an intrinsic recall
difficulty (1 to 5) at generation, then blend it with the student SM-2 schedule so
hard cards start tighter and ease faster only when the student proves recall.

Depends on: E0. Flag: `FEATURE_FC_DIFFICULTY`.

AI calls: one, at flashcard generation time only, inside the existing generation
job. Never on the review path.

---

## 1. Data model

No new table. Use existing JSON columns.

- `flashcards.metadata` already exists. Store `recallDifficulty: 1..5` there at
  generation (the column already holds `cardType`, so add a key, no migration).
- `student_flashcard_progress.metadata` already exists. The blend reads
  `recallDifficulty` from the parent card; it does not need its own column.

## 2. Generation-time rating

Edit `lib/flashcard-generator.ts`. The generator already calls Gemini once per
chapter to produce cards. Extend the output schema so each card carries
`recallDifficulty` (1 easy recall to 5 hard recall), judged from the card type and
the source KO difficulty and bloom level. Deterministic prior: seed the request
with the KO `difficulty` (easy 2, medium 3, hard 4) and let the model adjust within
plus or minus 1, validated by Zod. No extra call, the value rides the existing one.

Validate in the generator: integer 1 to 5, default 3 when missing.

## 3. SM-2 blend

Edit `lib/flashcard-scheduler.ts` (the existing SM-2 implementation). Today every
card starts at box 1 with the same interval. Change the seed and the ease step to
read `recallDifficulty`:

1. Initial interval seed: `firstIntervalDays = clamp(4 - recallDifficulty, 1, 3)`.
   Difficulty 5 reviews tomorrow, difficulty 1 waits 3 days.
2. Ease growth on a correct review: scale the SM-2 interval multiplier by
   `1 + (3 - recallDifficulty) * 0.1`, so easy cards grow faster, hard cards grow
   slower. Keep the result inside the existing SM-2 bounds.
3. On a wrong review, the existing reset to box 1 stays, but the next interval uses
   the difficulty-seeded `firstIntervalDays`, not a flat 1.

Keep all changes inside the scheduler so the blend is one tested function. Pure
math, no AI on review.

## 4. UI

Edit `app/courses/[id]/flashcard/flashcard-client.tsx`. Show a small difficulty
indicator on the card back (1 to 5 dots or a `Badge`, `rounded-md`, never pill).
Do not change the deck flow. Behind `FEATURE_FC_DIFFICULTY`.

## 5. Files

Edit:
- `lib/flashcard-generator.ts` (emit and store `recallDifficulty`)
- `lib/flashcard-scheduler.ts` (difficulty-seeded SM-2 blend)
- `app/courses/[id]/flashcard/flashcard-client.tsx` (indicator)
- `lib/env.ts` (`FEATURE_FC_DIFFICULTY`)

Create:
- `scripts/seed-fc-difficulty.ts` (assert seed intervals and ease scaling for
  difficulty 1, 3, 5; parity within plus or minus 1 day)

## 6. Gate (see TEST-METRICS.md E4)

| Id | Check |
|---|---|
| E4.1 | New cards persist a valid `recallDifficulty` 1 to 5, default 3 on missing |
| E4.2 | First interval matches `clamp(4 - difficulty, 1, 3)` for difficulty 1, 3, 5 |
| E4.3 | Correct-review interval growth scales by the difficulty factor, within SM-2 bounds |
| E4.4 | Wrong review reschedules using the difficulty seed, not flat 1 |
| E4.5 | Review path makes zero Gemini calls |
| E4.6 | Flag off: scheduler behaves exactly as the current SM-2 |

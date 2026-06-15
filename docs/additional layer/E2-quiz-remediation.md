# E2: Quiz Remediation Surfacing

Goal: replace generic "the correct answer is..." remediation with the embedded
view: mastery change for the concept, the named misconception, the prerequisite
root cause, and a concrete review plan with a time estimate. All deterministic.

Depends on: E0, E1. Flag: `FEATURE_REMEDIATION`.

AI calls: none. Misconception text comes from E1, mastery from E0.

---

## 1. Mastery before and after

The student must see the delta the screenshot was missing
(`Before 82, After 68`). Implementation:

1. At attempt start (`app/api/quiz/attempts/route.ts` create), snapshot current
   `masteryScore` for every concept covered by the quiz into the attempt row.
   Reuse `student_quiz_attempts` JSON columns: store `{conceptName: score}` under
   a new key in `questionsSnapshot` metadata, or add a small JSON column
   `masteryBefore` to `student_quiz_attempts`. Prefer the explicit column.
2. After submit and after the mastery recompute runs, read `masteryAfter` from
   `student_concept_mastery`. Delta = after minus before.

Schema (optional column, preferred):

```ts
masteryBefore: text("mastery_before", { mode: "json" })
  .$type<Record<string, number>>(),
```

## 2. Root cause from the graph

For each weak concept in the attempt (after-score under 60), call E0
`getLearningContext`. If `blockedBy` is non-empty, the root cause is the lowest
mastery prerequisite chain. Build a deterministic line:

```text
Concept: Integral Tentu (54)
Likely root cause: Antiturunan (22), Aljabar Dasar (31)
Recommended review: 2 modules, about 12 minutes
```

Time estimate is deterministic: `minutes = blockedByCount * 4 + weakConceptCount * 3`
(tune in the spec, keep it a pure formula, no AI).

## 3. Detected misconception

From E1: for each wrong question, if the selected option is tagged, show the
misconception card:

```text
Misconception detected
You treated sqrt(x^2) = x
Correct: sqrt(x^2) = |x|
Review: Akar Kuadrat, Misconception 4
```

Pull the exact text from the E1 deterministic feedback payload, do not regenerate.

## 4. UI

Edit the existing review surface, do not build a new one:
- `components/course/attempt-review.tsx` and
  `app/courses/[id]/my-results/[submissionId]/review-client.tsx`.

Add three blocks above the existing per-question list, behind `FEATURE_REMEDIATION`:
1. Mastery delta row per concept: concept name, before, after, delta colored with
   `text-status-success` (up) or `text-status-error` (down), bar per globals 2.4.
2. Misconception cards (E1), one per tagged wrong answer.
3. Root cause and review plan, with the `reviewHref` deep links and the time
   estimate. Buttons use `Button` from `components/ui/button`.

States: loading skeleton, empty (all correct shows a short "no weak concepts"
line), error per UI-STD 2.5. No new card nesting.

## 5. Files

Edit:
- `db/schema.ts` (`masteryBefore` column), `db:generate`, `db:migrate`
- `app/api/quiz/attempts/route.ts` (snapshot mastery at start)
- `app/api/quiz/attempts/[id]/route.ts` (expose delta and remediation in the
  attempt response, computed deterministically)
- `components/course/attempt-review.tsx`
- `app/courses/[id]/my-results/[submissionId]/review-client.tsx`
- `lib/env.ts` (`FEATURE_REMEDIATION`)

Create:
- `lib/remediation.ts` (pure builder: attempt + E0 + E1 to a remediation payload,
  so the API and any test share one function)
- `scripts/seed-remediation.ts`

## 6. Gate (see TEST-METRICS.md E2)

| Id | Check |
|---|---|
| E2.1 | Mastery before is snapshotted at start, after is read post recompute, delta correct |
| E2.2 | Root cause lists only prerequisites under 40, ordered lowest first |
| E2.3 | Time estimate matches the formula exactly |
| E2.4 | Misconception card text equals the E1 payload, zero Gemini calls in the whole flow |
| E2.5 | All-correct attempt shows the empty state, no root cause block |
| E2.6 | Flag off: the current review UI renders unchanged |

# E1: Distractor to Misconception Binding + Distractor Analytics

Goal: bind every wrong option in an MCQ to the misconception it represents, so
remediation can name the misconception deterministically (no per-attempt LLM),
and aggregate per-option selection rates so the system and the tutor know which
misconceptions a cohort holds.

Depends on: E0. Flag: `FEATURE_MISCONCEPTION`.

AI calls: one, at generation time only (inside the existing question generation
job), to tag distractors. Never on the student request path.

---

## 1. Data model

### 1.1 `ai_question_bank.distractorMap` (new column)

Add to `aiQuestionBank` in `db/schema.ts`:

```ts
distractorMap: text("distractor_map", { mode: "json" })
  .$type<Array<{
    optionIndex: number;
    kind: "misconception" | "calc_error" | "unit_error" | "vocab_swap" | "none";
    misconceptionKoId: string | null;   // FK target, nullable
    label: string;                       // short id-language label
  }>>()
  .$defaultFn(() => []),
```

One entry per non-correct option. `misconceptionKoId` points to a
`type = 'misconception'` KO in the same concept when one matches; null otherwise.
Backward compatible: empty array means "not tagged", surfaces fall back to current
behavior.

### 1.2 `question_option_stats` (new table)

Aggregate counters, updated on quiz submit. One row per (question, optionIndex).

```ts
export const questionOptionStats = sqliteTable("question_option_stats", {
  id: text("id").primaryKey(),
  questionId: text("question_id").notNull()
    .references(() => aiQuestionBank.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  optionIndex: integer("option_index").notNull(),
  selectedCount: integer("selected_count").default(0).notNull(),
  totalAttempts: integer("total_attempts").default(0).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow().notNull(),
}, (t) => [
  unique("uq_qos_question_option").on(t.questionId, t.optionIndex),
  index("idx_qos_question").on(t.questionId),
]);
```

## 2. Generation-time tagging

Edit `lib/question-generator.ts` (and the prompt builders it uses). For the
`misconception_detection` blueprint the generator already knows which KO the
question came from. Extend the generation output schema so each option carries a
`distractorKind` and, when `kind = "misconception"`, the generator must reference
the misconception by the source misconception KO id available in the batch
context. Deterministic mapping first: if an option text matches a known
misconception KO for the concept (string or embedding match, reuse the embedding
helper from `lib/ko-extractor.ts`), bind it without spending a new call. Only fall
back to the existing generation call output for the kind label.

Write `distractorMap` in the same transaction that writes the question row
(`lib/question-generator.ts` DB write step). Validate it in
`lib/question-validator.ts`: array length equals option count minus correct count,
every `optionIndex` in range, `misconceptionKoId` (when set) exists and is a
`misconception` KO.

## 3. Analytics update on submit

Edit the quiz submit handler `app/api/quiz/attempts/[id]/route.ts` (or the
service it calls). On a completed attempt, for each answered question, increment
`question_option_stats`: `totalAttempts + 1` for the question, `selectedCount + 1`
for each chosen option. Use one upsert per (question, option), batched. Pure SQL,
no AI. Guard against double counting on resubmit (only count on the first
transition to `completed`).

## 4. Deterministic feedback path

Edit `lib/mistake-feedback.ts`. Before the LLM batch, for each wrong question read
`distractorMap`. If the student's selected index maps to a tagged misconception,
build the feedback payload deterministically:

- `misconceptionName` = the misconception KO title (or `label`).
- `whyWrong` = first paragraph of the misconception KO content.
- `correctApproach` = the correct option plus the linked `definition` or `formula`
  KO summary from E0.
- `reviewHref` from E0.

Only fall through to the existing Gemini batch for questions whose selected option
has no tag. This cuts LLM usage and removes the "correct answer is..." generic copy.
Keep the existing KV cache for the LLM fallback path.

## 5. Admin distractor analytics view

Extend the existing admin AI area (`app/admin/ai/*`, mirror an existing table page).
Per question, show the four option bars with percent selected and the bound
misconception label, sorted by `selectedCount` desc. Read-only. UI-STD bars from
globals 2.4. No new chart library beyond recharts.

## 6. Files

Edit:
- `db/schema.ts` (add column + table), then `db:generate`, `db:migrate`
- `lib/question-generator.ts` (emit and persist `distractorMap`)
- `lib/question-validator.ts` (validate `distractorMap`)
- `lib/mistake-feedback.ts` (deterministic-first path)
- `app/api/quiz/attempts/[id]/route.ts` (option stats upsert)
- `lib/env.ts` (`FEATURE_MISCONCEPTION`)
- admin AI page (analytics table)

Create:
- `scripts/seed-misconception.ts` (one question, tagged distractors, simulated
  selections to assert percentages and deterministic feedback)

## 7. Gate (see TEST-METRICS.md E1)

| Id | Check |
|---|---|
| E1.1 | New questions persist a valid `distractorMap`, validator rejects malformed |
| E1.2 | Selecting a tagged distractor yields deterministic feedback with no Gemini call |
| E1.3 | Untagged distractor still uses the LLM fallback, KV cache intact |
| E1.4 | Option stats reach the seeded percentages, no double count on resubmit |
| E1.5 | Admin view shows per-option percent and bound misconception |
| E1.6 | Flag off: questions generate without tags, feedback path unchanged |

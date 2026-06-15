# EIF Task List

Check a box only when the task is done, lint and build are clean, and the change
is behind its flag. Order follows the dependency graph in README section 4.

---

## E0: Learning Context Fabric

- [x] E0-T1 Add `FEATURE_EMBED` to `lib/env.ts` (optional)
- [x] E0-T2 Extract prerequisite-collapse helper from `lib/mastery-store.ts` into an exported function
- [x] E0-T3 Create `lib/learning-context.ts` with `LearningContext` types and `getLearningContext`
- [x] E0-T4 Implement mastery read (null-safe defaults) reusing the shared helper
- [x] E0-T5 Implement concept-level graph collapse (prerequisite, related, blockedBy under 40)
- [x] E0-T6 Implement KO bucketing by type, sort importance then learningOrder, map analogy and pitfall
- [x] E0-T7 Implement `reviewHref` via `getReviewHref`
- [x] E0-T8 Add 60s in-process memo for the concept and graph parts only
- [x] E0-T9 Create `scripts/seed-embed.ts` (A->B->C chain, one student, typed KOs)
- [x] E0-T10 Run lint and build clean (eslint clean, `tsc --noEmit` exit 0)

## E1: Misconception Engine + Distractor Analytics

- [x] E1-T1 Add `FEATURE_MISCONCEPTION` to `lib/env.ts`
- [x] E1-T2 Add `distractorMap` column to `aiQuestionBank` in `db/schema.ts`
- [x] E1-T3 Add `question_option_stats` table in `db/schema.ts`
- [x] E1-T4 `db:generate` (0014) done; applied to dev via targeted DDL (migration journal drift on unrelated tables, prod push pending)
- [x] E1-T5 Extend `lib/question-generator.ts` to emit and persist `distractorMap` in both insert branches
- [x] E1-T6 Deterministic match of distractor text to misconception KO via token Jaccard (`lib/distractor-mapper.ts`); embedding match deferred (string suffices for gate)
- [x] E1-T7 Validate `distractorMap` (in `lib/distractor-mapper.ts`, re-exported + wired into `lib/question-validator.ts`)
- [x] E1-T8 Upsert `question_option_stats` on submit (`lib/option-stats.ts`, called from the attempts route, flag-gated)
- [x] E1-T9 Add deterministic-first feedback path in `lib/mistake-feedback.ts`, LLM only for untagged options
- [x] E1-T10 Add distractor analytics page `app/admin/ai/distractors` + sidebar link
- [x] E1-T11 Create `scripts/seed-misconception.ts`
- [x] E1-T12 New files lint-clean, `tsc --noEmit` exit 0 (repo lint baseline already red, no new findings)

## E2: Quiz Remediation Surfacing

- [x] E2-T1 Add `FEATURE_REMEDIATION` to `lib/env.ts`
- [x] E2-T2 Add `masteryBefore` column to `student_quiz_attempts` (0015; applied to dev directly)
- [x] E2-T3 Snapshot per-concept mastery at attempt start in `app/api/quiz/attempts/route.ts`
- [x] E2-T4 Create `lib/remediation.ts` pure builder (attempt + E0 + E1 to payload)
- [x] E2-T5 Compute mastery delta after recompute and expose in the attempt response (GET [id])
- [x] E2-T6 Implement root-cause and time-estimate formula in the builder
- [x] E2-T7 Pull misconception cards from the E1 payload (no regeneration)
- [x] E2-T8 Add the remediation blocks to `components/course/attempt-review.tsx`
- [x] E2-T9 `attempt-review.tsx` renders the blocks behind the `remediation` field (legacy `review-client.tsx` is the separate submissions path, not the quiz attempt path)
- [x] E2-T10 Existing loading/empty/error states cover the review surface (block hidden when no remediation)
- [x] E2-T11 Create `scripts/seed-remediation.ts`
- [x] E2-T12 New files lint-clean, `tsc --noEmit` exit 0

## E3: Interactive Material Layer

- [x] E3-T1 Add `FEATURE_MATERIAL_LIVE` to `lib/env.ts`
- [x] E3-T2 Build `termIndex` at publish in `lib/material-storage.ts` (`lib/term-index.ts` + `website_materials.term_index` col, 0016)
- [x] E3-T3 Create the E0 fetch action (`lib/learning-context-actions.ts` `getConceptPopover`, auth-guarded)
- [x] E3-T4 Create `components/course/term-popover.tsx` with the actions
- [x] E3-T5 Wire selection and term matching in `material-viewer.tsx` (course term index via `buildCourseTermIndex`, client match via `lib/term-match.ts`, db-free split for client bundle); `next build` passes
- [x] E3-T6 Populate actions from KO data, hide absent ones (component filters tabs by availability)
- [x] E3-T7 Add the mastery chip in the popover header from E0
- [x] E3-T8 Ask-tutor wired to existing `openExplain`/tutor drawer via `runTutorExplain`
- [ ] E3-T9 Optional dotted underline marking for indexed terms (skipped: optional polish)
- [x] E3-T10 Create `scripts/seed-term-index.ts`
- [x] E3-T11 New files lint-clean, `tsc --noEmit` exit 0

## E4: Flashcard Difficulty

- [x] E4-T1 Add `FEATURE_FC_DIFFICULTY` to `lib/env.ts`
- [x] E4-T2 Emit `recallDifficulty` in `lib/flashcard-generator.ts`, store in `flashcards.metadata`
- [x] E4-T3 Validate difficulty 1 to 5, default 3 (zod coerce + clamp + `difficultyPriorFromKO`)
- [x] E4-T4 Add difficulty-seeded first interval in `lib/flashcard-scheduler.ts`
- [x] E4-T5 Scale ease growth by the difficulty factor within SM-2 bounds
- [x] E4-T6 Use difficulty seed on wrong-review reschedule
- [x] E4-T7 Add the difficulty indicator (5-dot recall meter) on the flashcard back in `flashcard-client.tsx`
- [x] E4-T8 Create `scripts/seed-fc-difficulty.ts`
- [x] E4-T9 New files lint-clean, `tsc --noEmit` exit 0

## E5: Learning Graph + Tutor Root Cause

- [x] E5-T1 Add `FEATURE_GRAPH` to `lib/env.ts`
- [x] E5-T2 Add `concept_graph_edges` table (0017; applied to dev directly)
- [x] E5-T3 Create `scripts/build-concept-graph.ts` and trigger it on publish (`buildConceptGraph` in `approveAndPublish`, flag-gated)
- [x] E5-T4 Create `lib/graph-trace.ts` with cycle-safe `traceRootCause`
- [x] E5-T5 Add `components/course/concept-graph-view.tsx` (layered SVG, mastery-colored nodes, prerequisite edges, node click opens `TermPopover`)
- [x] E5-T6 Mount the graph on `/courses/[id]/mastery` behind `FEATURE_GRAPH`; `next build` passes
- [x] E5-T7 Inject the root-cause block in `lib/context-assembly.ts` (`ConceptContextVars.rootCause` + `formatRootCauseBlock`, flag-gated)
- [x] E5-T8 Create `scripts/seed-graph.ts` (chain plus one cycle)
- [x] E5-T9 New files lint-clean, `tsc --noEmit` exit 0

## Rollout

- [ ] R-T1 Update `docs/baselines.md` with EIF metrics (deterministic feedback hit rate, LLM call reduction)
- [ ] R-T2 Add EIF assertions to `scripts/run-evals.ts`
- [ ] R-T3 Update `AGENT_CONTEXT.md` current state when each phase Gate is green
- [ ] R-T4 Enable flags in staging in dependency order, verify each Gate, then production

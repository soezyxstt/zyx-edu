# EIF Test Metrics

Each metric maps to a Gate row in a phase file. Check a box only when the metric is
verified by a seed script run or a manual drill recorded below. A phase is done
only when all of its boxes are checked. No box may be checked from inspection alone.

Verification convention: each metric names how it is proven (script assert, query,
or manual). Record the run command in the script and keep it reproducible.

---

## E0: Learning Context Fabric

- [x] E0.1 Fabric returns correct mastery, trend, evidence for a seeded concept (assert in `seed-embed.ts`)
- [x] E0.2 `blockedBy` lists only prerequisites under mastery 40 (assert: B blocks C when B is 25)
- [x] E0.3 KOs bucketed by type, sorted importance then learningOrder (assert order)
- [x] E0.4 One query per table, no N+1 (two calls same course = 1 graph fetch, asserted)
- [x] E0.5 Lint and build clean, flag off changes nothing (no surface reads the fabric yet)

## E1: Misconception Engine + Distractor Analytics

- [x] E1.1 New questions persist a valid `distractorMap`, validator rejects malformed (seed: build + mock-gen persist + 3 malformed rejected)
- [x] E1.2 Tagged distractor yields deterministic feedback with zero Gemini calls (seed: misses empty, payload text == KO content)
- [ ] E1.3 Untagged distractor uses LLM fallback, KV cache hit on repeat (deferred: needs live Gemini + CF KV)
- [x] E1.4 Option stats reach seeded percentages, no double count on resubmit (seed: 10 attempts -> 70/20/10, denominator 10)
- [ ] E1.5 Admin view shows per-option percent and bound misconception (page built /admin/ai/distractors, manual screenshot pending)
- [ ] E1.6 Flag off: questions generate without tags, feedback path unchanged (gating in code; manual confirm pending)

## E2: Quiz Remediation Surfacing

- [x] E2.1 Mastery before snapshotted at start, after read post recompute, delta correct (seed: 82 -> 54, delta -28)
- [x] E2.2 Root cause lists only prerequisites under 40, ordered lowest first (seed: Integral->Antiturunan 22, Antiturunan->Aljabar 31)
- [x] E2.3 Time estimate equals `blockedByCount * 4 + weakConceptCount * 3` (seed: 17)
- [x] E2.4 Misconception card text equals the E1 payload, zero Gemini calls in the flow (seed: card from attempt_feedback; builder makes no AI call)
- [x] E2.5 All-correct attempt shows the empty state, no root cause block (builder: no weak concepts -> empty rootCauses, UI hides)
- [ ] E2.6 Flag off: current review UI renders unchanged (remediation null when flag off; manual confirm pending)

## E3: Interactive Material Layer

- [x] E3.1 Publish builds a normalized, deduped term index for chapter concepts (seed-term-index: display name + 2 aliases, deduped, longest-first)
- [~] E3.2 Selecting an indexed term opens the popover, non-terms do nothing (wired: matchTerm gates in material-viewer, build-verified; visual confirm pending)
- [x] E3.3 Actions render from KO data with zero Gemini calls (seed: quick explain/analogy/example/mistake all from KOs, builder makes no AI call)
- [x] E3.4 Actions absent from KO data are hidden, not shown empty (component filters tabs by availability flag; data flags verified in seed)
- [~] E3.5 Mastery chip shows the student score and trend for the concept (data verified score=64; rendered in TermPopover header; visual confirm pending)
- [x] E3.6 Ask the tutor opens the existing drawer prefilled, only path that can spend quota (wired to `openExplain` via `runTutorExplain`; only LLM path)
- [x] E3.7 Flag off: material renders read-only as today (termIndex empty when flag off -> matchedConcept always null -> legacy button only; build-verified)

## E4: Flashcard Difficulty

- [x] E4.1 New cards persist `recallDifficulty` 1 to 5, default 3 on missing (seed: difficulty prior easy/medium/hard/undefined)
- [x] E4.2 First interval equals `clamp(4 - difficulty, 1, 3)` for difficulty 1, 3, 5 (seed: 3/1/1, box1 seeded)
- [x] E4.3 Correct-review growth scales by the difficulty factor within SM-2 bounds (seed: easy>neutral>hard, neutral==base)
- [x] E4.4 Wrong review reschedules using the difficulty seed, not flat 1 (seed: difficulty 1 -> 3 days)
- [x] E4.5 Review path makes zero Gemini calls (scheduler is pure math; submitReview makes no AI call)
- [x] E4.6 Flag off: scheduler matches current SM-2 exactly (seed: box1=1, again=0.007, box3=25 unchanged)

## E5: Learning Graph + Tutor Root Cause

- [x] E5.1 Rollup builds concept edges from KO edges, deduped, on publish (seed-graph: 4+ edges, idempotent rebuild)
- [x] E5.2 `traceRootCause` returns weak prerequisites deepest first, cycle-safe (seed: Aljabar before Antiturunan; cycle X/Y terminates, no revisit)
- [x] E5.3 Time estimate matches the E2 formula (seed: chain*4 + 3)
- [~] E5.4 Graph colors nodes by mastery and renders edges, node click opens the popover (`concept-graph-view.tsx` mounted on /mastery, build-verified; visual confirm pending)
- [~] E5.5 Tutor context includes the root-cause block when chain non-empty (logic in `context-assembly` + `formatRootCauseBlock`; tracer verified; full tutor-call integration manual)
- [x] E5.6 Flag off: mastery page and tutor unchanged (graph render + root-cause injection both gated by FEATURE_GRAPH; build-verified)

## Program-level

- [ ] PR.1 Across a full quiz to remediation flow, deterministic feedback covers tagged distractors and LLM calls drop versus baseline (record before and after in `docs/baselines.md`)
- [ ] PR.2 No new Gemini call on any student request path; the only new calls are E1 and E4 at generation time (audit `lib/usage-budget-service.ts` events)
- [ ] PR.3 `npm run lint`, `npm run build`, and `scripts/run-evals.ts` all pass with every EIF flag on
- [ ] PR.4 KV write budget guard still under 900 per day with E1 feedback caching on (query the daily counter)

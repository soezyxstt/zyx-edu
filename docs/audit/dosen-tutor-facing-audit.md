# Audit: AI Teaching Assistant, Class Analytics, Misconception Analytics, Auto Quiz Generation, Exam Blueprint, Oral Exam Assistant, AI Grading Assistant

Scope: phase 5 of the 18-use-case audit (lecturer/teacher-facing). Status: scan + gap analysis complete, no code changed. This completes the scan pass across all four clusters.

## 1. AI Teaching Assistant

**Vision**: AI helps generate materials, questions, explanations, slides, diktat, exercises — largely automatically.

**Reality**: three of six sub-features are real and deployed: `lib/diktat-generator.ts` compiles chapters into structured diktat JSON (objectives/formulas/concepts/misconceptions/examples/glossary, ordered by learning order); `lib/material-generator.ts` converts KOs to Zyx Canonical Markdown via Gemini with a strict block-syntax prompt (has a mock mode for dev, real Gemini path for production); `lib/question-generator.ts` is a real blueprint-driven batch generator with a validation-repair loop, misconception-aware distractor tagging, and a 3-questions-per-KO cap, running as a background Inngest job via `lib/generation-pipeline.ts` (the correct async pattern, unlike the bundle-era issues audited in phase 1).

**Gap**: "explanations" exist (bundled into question generation's "whyWrong" feedback) but "slides" and a dedicated "exercises" generator do not — exercises only emerge incidentally as a KO `type` during extraction, there's no admin action that says "generate practice exercises for this chapter" the way there is for questions/diktat/materials.

**Subtasks**:
1. Decide if slides are in scope at all (no slide-rendering surface exists anywhere in the product yet — this would be a bigger addition than the others, likely lower priority than the gaps below).
2. If exercises are wanted as their own first-class generator (not just an incidental KO type), it can mostly reuse `question-generator.ts`'s blueprint/validation machinery with a different output shape, since that pipeline is already solid.

## 2. Class Analytics

**Vision**: "70% belum paham Integral Parsial" before teaching.

**Reality**: fully real, deterministic, well-built. `lib/cohort-analytics.ts`'s `getCohortAnalytics()` computes live class-wide mastery buckets (low/mid/high) per concept with a minimum-5-students floor to avoid noisy small-sample flags; `computeSnapshotPayload()` runs nightly via cron (`lib/inngest-functions.ts:420`), producing 4-week concept trend lines, most-missed questions, and a watchlist of at-risk students (2+ active interventions or declining on 3+ concepts), stored in `courseAnalyticsSnapshots`. The "70% don't understand X" claim is directly answerable from `bucketLow` counts.

**Gap**: none found — this is one of the most complete features in the whole audit.

**Subtasks**: none required; consider this validated.

## 3. Misconception Analytics

**Vision**: "62% of students think centripetal force is a new force" — aggregate, cohort-scale misconception detection.

**Reality**: per-attempt misconception *tagging* is real — `lib/distractor-mapper.ts`'s `buildDistractorMap()` uses Jaccard token-overlap (threshold 0.34) to match each wrong answer option to a misconception KO at question-generation time; `lib/mistake-feedback.ts` then deterministically (no LLM cost) surfaces that misconception's name when a student picks the tagged option. An admin "Distractor Analytics" page already shows per-question option-selection frequencies with misconception labels.

**Gap**: this is a clean, narrow gap with the same shape seen repeatedly in this audit — the *data* needed for the vision already exists (`distractorMap.misconceptionKoId` per question, real attempt records per student), but nothing aggregates it across the cohort. The current page is per-question; the vision is per-concept-across-the-class ("62% of everyone who got Newton's Laws questions wrong picked the centripetal-force misconception").

**Subtasks**:
1. Add a cohort-level aggregation query: group quiz attempts by `misconceptionKoId` (joining through `distractorMap`) per concept/course, compute "% of wrong-answering students who hit this specific misconception." This is pure SQL aggregation over data that already exists — no new generation pipeline needed.
2. Surface it in `lib/cohort-analytics.ts`'s existing output alongside the mastery buckets, since that's already the natural home for "what's wrong with this class right now."

## 4. Auto Quiz Generation

**Vision**: "make a quiz for Chapter 4" -> balanced easy/medium/hard set.

**Reality**: real and background-job-driven (confirms phase 1's finding that this part of the pipeline is correctly async). `lib/question-blueprint-engine.ts` infers difficulty + Bloom level per KO type (formula -> apply/medium, misconception -> analyze/medium, concept_overview -> evaluate/hard), and `generateQuestionsForKOBatch()` batches by course+chapter into Gemini calls referencing each KO's blueprint, capped at 3 active questions per KO.

**Gap**: there's no explicit difficulty-ratio targeting ("30% easy / 50% medium / 20% hard") — the chapter's resulting question set's difficulty mix is an emergent property of whatever KO types happen to exist in that chapter, not a deliberate target the generator balances toward. In practice a KO-type-heavy chapter (e.g. lots of `formula` KOs) could skew the whole quiz toward one difficulty band.

**Subtasks**:
1. After generation, add a post-hoc balance check against the quiz template's `difficulty_proportions` (the same field already used by live quiz attempt selection in the student-facing Adaptive Quiz audit) and flag/backfill if a chapter is short on a needed difficulty band, rather than silently shipping whatever the KO-type distribution happens to produce.

## 5. Exam Blueprint

**Vision**: AI ensures a midterm/final covers all CLO/CPMK with correct Bloom/difficulty distribution.

**Reality**: **missing, and structurally blocked** — confirmed zero matches for "CLO"/"CPMK"/"curriculum" across `lib/` and `app/`. `lib/assessment-extractor.ts` classifies *past* exam questions by concept/pattern/difficulty (read-only analytics), and `question-blueprint-engine.ts` infers Bloom level from KO type, but neither can check or enforce coverage against a curriculum standard because — as found in the admin-infrastructure audit (item 3) — **there is no CPL/CPMK schema in this codebase at all.**

**Gap**: this is the same root cause as the admin-infrastructure cluster's deepest finding. Exam Blueprint cannot be meaningfully built before that schema gap is addressed; building it now would mean inventing ad-hoc coverage rules that get thrown away once a real CPL/CPMK layer exists.

**Subtasks**:
1. Do not start building Exam Blueprint until the CPL/CPMK/Sub-CPMK schema decision (flagged in `docs/audit/admin-knowledge-infrastructure-audit.md`, item 3) is made — this is a hard dependency, not a parallel track.
2. Once that schema exists, Exam Blueprint becomes largely a coverage-checking query (which CPMKs are touched by the selected questions' linked concepts) plus the Bloom-distribution logic that already exists in `question-blueprint-engine.ts` — most of the hard inference work is already built.

## 6. Oral Examination Assistant

**Vision**: live follow-up question suggestions during a student's oral presentation.

**Reality**: confirmed absent — zero matches for "oral"/"presentation"/"lisan"/"ujian lisan" anywhere in the codebase. No data model, no UI, no pipeline.

**Gap**: genuine net-new feature, no existing foundation to build on (unlike most other gaps in this audit). Would need: a way to capture/transcribe what the student just said (live or per-segment), and a prompt that generates a probing follow-up question from that transcript plus the relevant KO/concept content (which *does* already exist as a reusable input).

**Subtasks**: out of scope for incremental fixes — flag as a standalone future feature requiring its own design pass (transcript capture is the unsolved part; the "ask a good follow-up question grounded in KO content" half is a straightforward reuse of the existing tutor/Gemini prompting patterns).

## 7. AI Grading Assistant

**Vision**: for essay questions, AI gives a rubric + initial score + reasoning; teacher reviews/overrides.

**Reality**: confirmed essay grading is **100% manual** today. `app/(tutor)/tutor/[courseId]/grading/grading-client.tsx` displays the essay text and a `pending_review` status; a teacher manually enters the score (`gradeSubmissionAction`). Only multiple-choice/short-answer questions are auto-graded. Zero matches for "rubric" anywhere in the codebase.

**Gap**: genuine net-new feature. Unlike most gaps in this audit, there's no nearby reusable machinery for the *scoring* half — though the misconception/distractor analysis patterns from items 3 and the mistake-feedback "explain why wrong" patterns from the student-tutor audit are a reasonable template for the "reasoning" half (AI explaining what's weak/strong about a specific answer is structurally similar to AI explaining why a quiz answer was wrong).

**Subtasks**:
1. Scope this as: AI proposes a rubric breakdown + draft score + reasoning, written into the same `pending_review` flow that already exists, with the teacher's manual override remaining the final word — i.e. augment the existing manual-grading UI rather than replacing it. This keeps it consistent with AGENT_CONTEXT.md's "AI quota spent on tutoring/feedback/content generation" framing (grading feedback is a defensible use of that quota) while not removing teacher control.

## Cross-cluster observation (final, across all 4 phases)

Across all ~24 use cases scanned this session (excluding the upload pipeline from phase 1, already fixed), a consistent shape emerges: **most gaps are not "broken" or "fake" — they're "the hard infrastructure already exists, but nobody built the specific aggregation/assembly/preview layer the vision describes on top of it."** Concrete recurring examples: misconception data exists per-attempt but isn't aggregated cohort-wide (this phase); knowledge-graph edges exist but aren't queried cross-course (admin-infra phase); prerequisite ordering exists but isn't exposed as a career-path or deadline-driven planner (student-tutor + active-recall phases); staleness is tracked but never previewed before a save (admin-infra phase).

There is exactly **one deep structural blocker** found across the entire audit: the missing CPL/CPMK/Sub-CPMK learning-outcome schema, which caps both Exam Blueprint (this phase) and Curriculum Gap Detection (admin-infra phase) regardless of how much feature code gets written around it. And there are exactly **two genuine net-new features with no existing foundation to build on**: Oral Examination Assistant and AI Grading Assistant (both this phase) — both require new analysis surfaces (transcript capture, essay-answer scoring) the codebase has never had any version of, unlike everything else in this audit which had at least a partial building block already in place.

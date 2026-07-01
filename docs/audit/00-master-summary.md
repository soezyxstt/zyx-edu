# Zyx 18-Use-Case Audit — Master Summary

This indexes the full scan-and-gap-analysis pass requested across the platform's use cases. Each linked doc follows the same format: current implementation (with file:line evidence) -> gap vs. vision -> subtask list. No code was changed by the scan itself; phase 1's pipeline fixes (already implemented this session) are the one exception.

## Documents

1. [knowledge-factory-pipeline-audit.md](knowledge-factory-pipeline-audit.md) — Knowledge Factory, One-Click Course Creation, Auto Quiz Generation (admin upload pipeline). **Fixed this session**: incremental bundle reimport, KO diffing, version-gated staleness cascades (see `lib/bundle-importer.ts`).
2. [student-personalization-tutor-audit.md](student-personalization-tutor-audit.md) — Personal Learning Companion, AI Tutor, Mastery-Based Learning, AI Study Planner, Adaptive Quiz, Explain My Mistakes.
3. [active-recall-and-exploration-audit.md](active-recall-and-exploration-audit.md) — Active Recall Ecosystem, Concept Explorer, Learning Timeline, Career-Oriented Learning.
4. [dosen-tutor-facing-audit.md](dosen-tutor-facing-audit.md) — AI Teaching Assistant, Class Analytics, Misconception Analytics, Auto Quiz Generation (lecturer side), Exam Blueprint, Oral Examination Assistant, AI Grading Assistant.
5. [admin-knowledge-infrastructure-audit.md](admin-knowledge-infrastructure-audit.md) — Cross-Course Knowledge Graph, Academic Search Engine, Automatic Curriculum Mapping, Curriculum Gap Detection, Impact Analysis, Multi-AI Workspace, Continuous Improvement.

Institution-level use cases (digitizing institutional knowledge, cross-semester consistency, accreditation reporting) were not scanned separately — they're downstream consequences of items 18 (Curriculum Mapping/Gap Detection) and largely blocked on the same schema gap (see below), not separate code paths.

## What's actually solid (validated, no action needed)

- **Class Analytics** (cohort-analytics.ts) — fully real, deterministic, well-built. The cleanest pass in the whole audit.
- **Learning Timeline** — fully wired event-log -> mastery-history -> weekly-reflection pipeline.
- **Mastery-Based Learning** — genuinely per-concept, deterministic, with trend + blocked-by computation.
- **Explain My Mistakes** — real hybrid (deterministic misconception match + cached LLM + background job), correct async pattern.
- **AI Study Planner**'s core ordering logic (topological sort over prerequisites) and **Class Analytics**' cron pipeline are both better-built than the product surface around them currently exposes.

## The one deep structural blocker

**There is no CPL -> CPMK -> Sub-CPMK learning-outcome layer anywhere in `db/schema.ts`.** This single gap caps two otherwise-unrelated features regardless of how much feature code is added around them:
- Exam Blueprint (dosen-facing) — cannot check Bloom/CPMK coverage without outcomes to check against.
- Curriculum Gap Detection (admin-facing) — can only ever mean "material vs. KO gap," never "did we teach/test what's required."

This needs a schema decision (a `learningOutcomes`-style table + a join table to concepts, mirroring the existing `assessmentObjectConcepts` pattern) before either feature can meaningfully start. Recommend treating this as its own scoped project, not a subtask of either feature.

## The recurring pattern (most gaps, in order of how often it showed up)

Across ~24 use cases scanned, the dominant finding was **not** "broken" or "fake" — it was: *the hard infrastructure already exists one layer down, but nobody built the specific aggregation, assembly, or preview surface the vision describes on top of it.* Concrete instances:

| Vision feature | Infrastructure that already exists | What's missing |
|---|---|---|
| Misconception Analytics (cohort-scale) | Per-attempt misconception tagging (`distractor-mapper.ts`) | Aggregation across students/concepts |
| Concept Explorer | Full concept/relationship/KO-type data model | A single-concept assembly page |
| Career-Oriented Learning | Prerequisite topological sort (`study-path-service.ts`) | A profession -> target-concepts mapping + entry point |
| Cross-Course Knowledge Graph | Global concept registry | Cross-course edge queries (edges are course-scoped) |
| Impact Analysis (preview before save) | Real diff computation (`lib/bundle-importer.ts`, built this session) | Surfacing that diff as a pre-publish preview UI |
| Continuous Improvement (content quality) | `questionOptionStats`, `qualityScore`/`useCount` columns | The job that actually computes into those columns |
| AI Study Planner (deadline-driven) | Ordered steps + per-step time estimates | Deadline input + day-bucketing of existing estimates |

This is good news in one sense (most of these are assembly work, not new R&D) and a warning in another: the platform has been consistently building deep/backend capability faster than it exposes that capability to users — the opposite failure mode from the upload pipeline in phase 1, where the surface UI was actively lying about what the (broken) backend did.

## Genuine net-new features (no existing foundation)

Only two items in the entire audit have *no* partial building block to extend:
- **Oral Examination Assistant** — needs live transcript capture, which nothing in the codebase has ever done.
- **AI Grading Assistant** (essay rubric/score/reasoning) — needs essay-answer quality scoring, structurally different from the existing right/wrong + misconception-match grading.

Everything else audited has at least a partial foundation already in place.

## Confirmed non-bugs (corrected from earlier assumptions in this session)

- PDF upload being archive-only (never parsed) is **by design** — PDFs are for student reading, not knowledge extraction. Canonical Markdown / MTD is the only parsed input. (Corrected after initial phase-1 audit draft.)
- Gemini-only AI routing ("Multi-AI Workspace" gap) is a deliberate cost-control architecture per AGENT_CONTEXT.md's quota rules, not an oversight — flagged as future-scope, not a near-term fix.

## Suggested next priority order

1. **CPL/CPMK schema decision** — unblocks two features and is the only item where delay compounds (more content gets added on top of the flat hierarchy the longer it waits).
2. **Adaptive Quiz** — currently the most overstated feature name in the product (fully static difficulty proportions); reusing existing mastery data to bias difficulty per-attempt is a contained fix.
3. **Misconception Analytics cohort aggregation** and **Class-Analytics-adjacent content-quality flagging** — both pure SQL aggregation over data that already exists, no new generation pipeline, high leverage for low effort.
4. **Impact Analysis preview** — the diff engine already exists from this session's bundle-importer work; this is a UI-exposure task, not new logic.
5. Everything else in the "recurring pattern" table, roughly in the order a product owner cares about them — none of these are technically risky, they're all scoped assembly work.

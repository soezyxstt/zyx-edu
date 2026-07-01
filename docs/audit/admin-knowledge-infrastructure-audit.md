# Audit: Cross-Course Knowledge Graph, Academic Search Engine, Curriculum Mapping, Gap Detection, Impact Analysis, Multi-AI Workspace, Continuous Improvement

Scope: phase 4 of the 18-use-case audit (admin/institution-facing, cluster 1 of 1 for this group). Status: scan + gap analysis complete, no code changed.

## 1. Cross-Course Knowledge Graph

**Vision**: a concept like "Integral" used in Calculus, Physics, Control, and Robotics should be one connected node across all four courses.

**Reality**: `concepts`/`conceptLocalizations` are genuinely global (no `courseId`), so the *registry* is already cross-course-capable — `lib/ko-extractor.ts`'s concept-resolution step (audited earlier) already reuses a global concept by canonical name/alias/embedding match regardless of which course is being ingested. But `lib/graph-trace.ts`'s `buildConceptGraph()` builds `conceptGraphEdges` **scoped by a single courseId** (the edges table itself has a `courseId` column with a unique constraint including it), and `concept-graph-view.tsx` only ever renders one course's edge set. So the same global concept can exist as 4 disconnected node-clusters, one per course, with no edges between them.

**Gap**: the hard part (a shared concept registry) is already done. What's missing is purely the edge layer: nothing currently asks "does this concept also appear in other courses, and if so, what edges exist there too."

**Subtasks**:
1. Add a course-agnostic graph query mode: given a `conceptId`, pull `conceptGraphEdges` across *all* courseIds that touch it (not just one), for any UI that wants the "this concept everywhere" view (e.g. a future Concept Explorer page, see the other audit).
2. This is additive — keep the existing per-course graph for the per-course mastery view; don't merge the two views, just add a cross-course query path.

## 2. Academic Search Engine

**Vision**: admin searches "Eigenvalue" and gets every material across 12 courses.

**Reality**: a real search exists (`lib/site-search.ts` + `lib/site-search-index.ts`, Fuse.js, weighted by title/keywords/content) but it's a **student-facing command-palette search**, indexing course materials/quizzes for navigation — not an admin cross-course content-lookup tool.

**Gap**: no admin-facing version of this exists at all. The underlying index-building approach in `site-search-index.ts` is reusable, but there's no admin route or UI for it.

**Subtasks**:
1. Reuse `site-search-index.ts`'s indexing approach (or extend it) for an admin search surface that explicitly spans all courses, surfaces which course/chapter each hit belongs to, and isn't trying to be a student navigation aid.

## 3. Automatic Curriculum Mapping (CPL -> CPMK -> Sub-CPMK -> Concept -> KO -> Assessment)

**Vision**: a traceable accreditation-style chain.

**Reality**: **missing entirely, confirmed by direct schema inspection** — no CPL, CPMK, or Sub-CPMK concept exists anywhere in `db/schema.ts`. The real hierarchy today is flat: `courses -> chapters -> knowledgeObjects -> concepts`, and assessment linkage stops at `assessmentObjectConcepts`/`assessmentObjectKos` (concept/KO level, no learning-outcome container above that).

**Gap**: this is the most foundational gap found across the whole audit — every other "coverage" or "gap detection" feature in this cluster is bottlenecked by the fact that there's no CPL/CPMK layer to check coverage *against*. Without it, "curriculum gap detection" can only ever mean "material vs. KO gap," never "did we actually teach/test what the accreditation body requires."

**Subtasks**:
1. This needs a real schema decision before any code: a `learningOutcomes` table (or `cpl`/`cpmk`/`subCpmk` as a small hierarchy) with a join table linking outcomes to concepts (reusing the existing `assessmentObjectConcepts`-style pattern). This is a multi-week structural addition, not a quick fix — flag it as its own project rather than a subtask of something else.
2. Until that exists, don't let "curriculum mapping" or "gap detection" UI imply CPL/CPMK coverage — be explicit in any admin-facing copy that current coverage checks are material-to-KO only (see item 4).

## 4. Curriculum Gap Detection

**Vision**: "CPMK #5 has never been tested" / "this concept never appears in any material."

**Reality**: `lib/ko-coverage-auditor.ts`'s `verifyKOCoverage()` is real but narrowly scoped: given **one chapter's** AST, it checks whether KOs are actually represented in the compiled material (direct concept-block mapping, LaTeX formula matching, Jaccard-similarity text coverage for objectives/summaries), writing a `coverageStatus`/`coverageReport` onto that one `websiteMaterials` row.

**Gap**: this audits "did we forget to mention a KO we already extracted," which is useful but is not what the vision describes. It cannot answer "is there a concept with zero KOs anywhere" (that would need a course/curriculum-wide concept inventory diff) or anything about assessment coverage of outcomes (blocked on item 3's missing CPL/CPMK layer).

**Subtasks**:
1. A genuinely new, separate check: "concepts in the global registry with zero active KOs in this course" — cheap to build today (`concepts` minus `knowledgeObjects.conceptId` distinct, scoped by course) and doesn't depend on the CPL/CPMK gap.
2. Assessment-coverage gap detection ("this concept/KO has zero assessment objects") is also buildable today using the existing `assessmentObjectConcepts`/`assessmentObjectKos` join tables — this doesn't require the CPL/CPMK layer, only outcome-level gap detection does.

## 5. Impact Analysis

**Vision**: admin edits a definition, sees *before saving* exactly what else will need updating.

**Reality**: the staleness-cascade mechanism (`isStale` on `websiteMaterials`/`flashcardSets`/`diktats`/`aiQuestionBank`, version bumps on `masterTeachingDocuments`) is real and — per the Knowledge Factory audit and this session's bundle-importer work — now consistently gated on whether content actually changed. But it is **entirely reactive**: staleness is set *after* a save commits, never previewed before.

**Gap**: this is the cleanest distinction in this whole cluster — "impact analysis" as described requires a dry-run preview, and the codebase only has post-hoc marking. The bundle importer built earlier this session already computes a real diff (KOs added/updated/retired, whether the chapter's derivedHash changed, whether cascade will fire) *before* committing the transaction, and can already run as a true dry-run that rolls back — that's almost exactly the primitive "impact preview" needs.

**Subtasks**:
1. Expose the existing bundle-importer dry-run diff (`ChapterImportResult.diff`) as an admin-facing "what will change" preview before publish, for the bundle path. This is largely already built; it just isn't surfaced as a preview UI.
2. For the live MTD-extraction path (`lib/ko-extractor.ts`), there's no equivalent dry-run today — extraction always commits. Adding a preview there would need the same kind of "compute diff, then decide to commit" restructuring already done in `lib/bundle-importer.ts` this session.

## 6. Multi-AI Workspace

**Vision**: different AI providers each take an editorial role in a pipeline (e.g. Gemini extracts, Claude audits, GPT improves pedagogy).

**Reality**: confirmed Gemini-only. `lib/ai-router.ts` defines 14 distinct *use cases* (KO_EXTRACTION, KO_VALIDATION, QUESTION_REVIEW, DIKTAT_AUDIT, MISTAKE_FEEDBACK, etc.) each routed through a fallback chain of **Gemini model tiers** (flash-lite -> flash -> higher tier on quota exhaustion). No other provider (OpenAI, Anthropic, Llama, Mistral) appears anywhere in the codebase. This is honestly multi-*model*, not multi-*provider*.

**Gap**: this is a deliberate, reasonable architecture for cost control (AGENT_CONTEXT.md's quota rules), but it doesn't match the "different AI does different editorial work" vision. Note: per [CLAUDE.md]'s own constraints, this audit itself is being produced by a different model than the one that would do the work, which is an instance of exactly the kind of multi-model editorial pipeline the vision describes — worth knowing the pattern is achievable, just not built into the *product* yet.

**Subtasks**:
1. This is a genuine future-scope item, not a near-term fix — multi-provider routing means adding a provider-abstraction layer to `lib/gemini.ts`'s call sites, which is a meaningful rewrite. Don't start this without a concrete reason (e.g. a specific use case where Gemini is measurably worse) since `ai-router.ts`'s existing use-case-based routing already gives a clean seam to add a second provider later if/when needed.

## 7. Continuous Improvement

**Vision**: aggregate usage data to flag low-quality questions, ambiguous/confusing materials, hardest concepts, suboptimal learning-path ordering, and surface recommendations to admins.

**Reality**: the *student performance* half is solid — `studentConceptMastery`, `flashcardReviews`, `studentQuizAttempts`, `questionOptionStats` (per-option selection counts, enabling real distractor analysis), and daily `courseAnalyticsSnapshots` all exist and are populated. `aiQuestionBank` even has `qualityScore`/`useCount` columns. But nothing computes into those columns or surfaces a *content-quality* recommendation — there's no job that says "question Q23 is too easy (90%+ first-try correct)," "option B is a dead distractor (0% selection)," or "concept X has unusually low class-wide mastery."

**Gap**: the data needed for this already exists (`questionOptionStats` in particular is exactly the right shape for distractor-quality analysis). What's missing is the analysis layer that turns raw stats into flagged recommendations — this is squarely a "Zero-AI Feature" candidate per AGENT_CONTEXT.md (it's aggregation + thresholding, not generation), so it shouldn't need any LLM calls to build.

**Subtasks**:
1. A deterministic SQL job (cron, like the existing `courseAnalyticsSnapshotCron`) that flags: questions with first-attempt correct-rate > 90% or < 20% (miscalibrated), distractors with near-zero selection rate (dead distractor), and concepts with class-wide average mastery below a threshold (hardest concepts) — write findings into `aiQuestionBank.qualityScore` and a small admin-facing flagged-content list.
2. Wire up the already-existing but currently-dead `useCount` field (also dead per item 5 of the student-tutor audit's Adaptive Quiz section) as part of this same pass, since it's needed input for "is this question over/under-used."

## Cross-cluster observation

This cluster has the platform's single deepest structural gap: the **missing CPL/CPMK learning-outcome layer** (item 3) is a blocker that quietly limits items 4 and (partially) 7 from ever fully matching their vision, no matter how much code gets written around them — it's a schema decision, not a feature to build incrementally. Everything else in this cluster follows the same pattern as the earlier audits: real, reusable lower-level infrastructure (global concept registry, per-course graph edges, distractor stats, the bundle-importer's diff engine) that's one assembly/exposure layer away from matching the vision, plus one deliberate architectural choice (Gemini-only) that's being described in the vision as a limitation but functions today as a reasonable cost-control decision.

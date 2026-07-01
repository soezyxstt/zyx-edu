# Audit: Active Recall Ecosystem, Concept Explorer, Learning Timeline, Career-Oriented Learning

Scope: phase 2 of the 18-use-case audit (student-facing, cluster 2 of 4). Status: scan + gap analysis complete, no code changed.

## 1. Active Recall Ecosystem

**Vision**: every learning activity should be able to spawn or reprioritize a flashcard — asking the tutor a question creates a card; missing the same thing repeatedly raises its review priority.

**Reality**: the core spaced-repetition machinery is real and complete. `flashcards`/`flashcardSets`/`studentFlashcardProgress`/`flashcardReviews` tables exist; `lib/flashcard-generator.ts` generates 7 typed card variants (definition, formula, parameter_recognition, derivation, cloze, misconception, engineering_application) from Knowledge Objects via Gemini; `lib/flashcard-scheduler.ts` + `lib/flashcard-actions.ts` implement real SM-2 (ease factor, interval, repetitions, lapses, due date).

**Gap**: the "ecosystem" half — activity *feeding back into* flashcards — doesn't exist. `lib/tutor-actions.ts` only launches review of existing cards, never creates new ones from a tutor conversation. Quiz mistakes write to `learningEvents` and trigger mistake-feedback generation, but nothing reads repeated-mistake history to boost a flashcard's priority or spawn a new one. The vision's two signature behaviors (tutor-Q&A -> flashcard, repeated miss -> priority bump) are both unbuilt; everything else downstream of "a flashcard already exists" works.

**Subtasks**:
1. On tutor conversation turns that resolve a specific KO/concept (already resolvable via the existing concept-ranking/drilldown components), offer or auto-create a flashcard for that KO if one doesn't exist yet.
2. On `learningEvents` showing >=2 incorrect attempts on the same KO/concept within a window, surface that card earlier (e.g. pull its `dueDate` forward) rather than waiting for normal SM-2 decay — gate behind a flag so it stays deterministic per AGENT_CONTEXT.md's "no AI for streaks/recommendations" rule.

## 2. Concept Explorer

**Vision**: a Wikipedia-style page per concept — prerequisites, misconceptions, applications, formulas, examples, videos, papers, simulations, related concepts.

**Reality**: every piece of *data* the vision needs already exists somewhere — `concepts`/`conceptLocalizations`, `knowledgeRelationships` (typed: prerequisite/related/extends/example_of/misconception_of), `conceptGraphEdges` (precomputed rollup), and KO `type` already distinguishes definition/formula/example/misconception. The mastery page (`app/(student)/courses/[id]/mastery/page.tsx`) renders a *list/graph* view of concepts with mastery + prerequisite edges (`components/course/concept-graph-view.tsx`), and tutor-side components (`concept-ranking.tsx`, `concept-drilldown.tsx`) rank weak concepts.

**Gap**: there is no single-concept detail route at all — no `/concept/[slug]` page, no API endpoint that assembles "everything about concept X" from the KOs/relationships that already reference it. The vision is a one-page aggregation view; the data model already supports it but nobody assembles it. Videos/papers/simulations have no schema representation anywhere (not even a stub field), so those three sections are missing at the data layer, not just the UI layer.

**Subtasks**:
1. Add `app/(student)/courses/[id]/concept/[slug]/page.tsx` + a backing API/query that, given a concept, pulls: its KOs grouped by type (definition/formula/example/misconception), `knowledgeRelationships` rows where it's source or target (split into prerequisites/related/extends), and student's own mastery score for it.
2. Defer videos/papers/simulations until there's an actual content source for them — don't build empty UI sections; flag this as a content-acquisition gap, not a code gap.

## 3. Learning Timeline

**Vision**: monthly study-hours chart + mastery growth over time.

**Reality**: this is the one fully real, fully wired item in this cluster. `learningEvents` (append-only) -> `lib/reflection-service.ts` (`computeWeeklyReflection`) -> `studentConceptMasteryHistory` daily snapshots -> `weeklyReflections` -> `app/(student)/profile/reflections/page.tsx`. Entirely deterministic SQL, consistent with AGENT_CONTEXT.md's zero-AI-for-analytics rule. `/api/student/mastery/history` already returns a 28-day per-concept timeline.

**Gap**: minor — material-completion events (`eventType: 'material_completed'`) are defined in the schema but no caller was found writing them, so "time spent reading materials" likely doesn't feed the timeline today, only quizzes/flashcards/tutor activity. Not a structural problem, just an incomplete event source.

**Subtasks**:
1. Verify whether any reading-progress code (`app/api/student/material-progress/*`) actually emits a `material_completed` learningEvent; if not, wire it so the timeline reflects reading time, not just quiz/flashcard activity.

## 4. Career-Oriented Learning

**Vision**: student says "I want to be a Control Engineer" -> ordered concept list (Laplace -> State Space -> PID -> Kalman Filter -> MPC).

**Reality**: this feature does not exist in any form — no career/profession table, no UI, no matching code (confirmed via broad grep for career/profession/cita-cita/jalur karir, which only matched unrelated "study path" code).

**What already exists that this could be built on**: `lib/study-path-service.ts` already does real topological sorting of concepts by `knowledgeRelationships` prerequisite edges (Kahn's algorithm, with cycle handling) plus mastery-aware sequencing — but it's course-generic, the same path for every student in a course, with no profession dimension. `conceptGraphEdges` + `lib/graph-trace.ts` already traverse prerequisite chains cross-concept.

**Gap**: this is a genuine net-new feature, not a fix. The hard part (prerequisite-aware ordering) is already solved by `study-path-service.ts`; what's missing is (a) a mapping from "profession" to a target set of concepts, which likely has to be curated/admin-defined per career path rather than AI-inferred from scratch, and (b) a UI entry point for the student to declare a career goal.

**Subtasks**:
1. Decide whether career-path concept sets are hand-curated by admins (a new `careerPathTemplates` table: career name -> target concept list) or AI-suggested once and then admin-approved — given AGENT_CONTEXT.md's AI-quota philosophy (AI spent only on tutoring/feedback/content generation), curated-by-admin is more consistent with the existing architecture than a live AI call per student.
2. Reuse `study-path-service.ts`'s topological sort directly against a career's target concept set instead of a course's full concept set — this is mostly a new entry point into existing logic, not new sequencing logic.

## Cross-cluster observation

Three of these four (Active Recall, Concept Explorer, Career-Oriented Learning) share the same shape of gap: the **hard infrastructure already exists** (SM-2 scheduler, knowledge graph + relationships, prerequisite topological sort) but the **specific user-facing assembly/entry-point that the vision describes was never built on top of it**. Learning Timeline is the exception — it's the one item in this cluster that's actually finished end-to-end. This suggests the codebase's "deep" layers (data model, scheduling, graph traversal) are ahead of its "surface" layer (pages that actually expose that depth to users) for this part of the product, the opposite problem from the Knowledge Factory pipeline audited earlier (where the surface UI lied about what the deep layer did).

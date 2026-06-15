# E5: Navigable Concept Graph + Tutor Root Cause

Goal: turn the stored concept graph into something the student and the tutor use.
A navigable course graph that colors each concept by mastery, and a tutor that
traces failures to their prerequisite root cause instead of only explaining the
current question.

Depends on: E0, E1. Flag: `FEATURE_GRAPH`.

AI calls: none for the graph. The tutor LLM call is the existing one; E5 only
enriches its context deterministically.

---

## 1. Concept-level graph rollup

`knowledge_relationships` stores edges at the KO level. E0 already collapses them
to concept level on demand. For the graph view, precompute a course-level rollup so
the page loads fast.

Add table `concept_graph_edges` (course-level, rebuilt on KO publish):

```ts
export const conceptGraphEdges = sqliteTable("concept_graph_edges", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  sourceConcept: text("source_concept").notNull(),
  targetConcept: text("target_concept").notNull(),
  type: text("type").$type<"prerequisite" | "related">().notNull(),
}, (t) => [
  index("idx_cge_course").on(t.courseId),
  unique("uq_cge_edge").on(t.courseId, t.sourceConcept, t.targetConcept, t.type),
]);
```

Build it in a deterministic job (extend `lib/inngest-functions.ts` or a script
`scripts/build-concept-graph.ts`) that reads `knowledge_relationships`, collapses
to concept names, dedupes, and upserts. Trigger on material or KO publish.

## 2. Root-cause tracer (shared function)

New file `lib/graph-trace.ts`:

```ts
export async function traceRootCause(
  studentId: string, courseId: string, conceptName: string
): Promise<{ chain: Array<{ concept: string; mastery: number }>;
            estimatedMinutes: number }>;
```

Walk prerequisite edges from `concept_graph_edges` (or E0 graph), depth first,
following only prerequisites whose mastery is under 40, deepest first. Return the
ordered weak chain plus the same time formula as E2. Pure, no AI. Cycle-safe with a
visited set (the graph may contain cycles; the seed must include one).

## 3. Navigable graph view

Extend the existing `components/course/concept-map.tsx` (already present) rather
than building a new component. Render concepts as nodes colored by mastery
(`bg-status-success` high, `bg-muted` unknown, `bg-status-error` low), edges from
the rollup. Clicking a node opens the E0 popover from E3 (reuse `term-popover.tsx`)
or links to the material. Keep it on `/courses/[id]/mastery` next to the existing
mastery list, behind `FEATURE_GRAPH`. recharts or a simple SVG layout, no new
library.

## 4. Tutor enrichment

Edit `lib/context-assembly.ts` (the function that builds tutor context). When the
asked concept (already resolved in the tutor flow) has a non-empty root-cause chain
from `traceRootCause`, inject a short deterministic block into the system context:

```text
Student mastery on Integral Tentu is 54 and declining.
Weak prerequisites: Antiturunan 22, Aljabar Dasar 31.
If the question depends on these, address the prerequisite first.
```

This changes only the context string. The tutor still makes one LLM call as today;
no extra quota. The result is the tutor answering with the root cause, as the
critique asked.

## 5. Files

Edit:
- `db/schema.ts` (`concept_graph_edges`), `db:generate`, `db:migrate`
- `lib/inngest-functions.ts` (rebuild on publish) or `lib/material-storage.ts`
- `components/course/concept-map.tsx` (mastery coloring, edges, click to popover)
- `app/courses/[id]/mastery/page.tsx` (mount the graph behind the flag)
- `lib/context-assembly.ts` (inject root-cause block)
- `lib/env.ts` (`FEATURE_GRAPH`)

Create:
- `lib/graph-trace.ts`
- `scripts/build-concept-graph.ts`
- `scripts/seed-graph.ts` (chain plus one cycle, assert trace order and cycle safety)

## 6. Gate (see TEST-METRICS.md E5)

| Id | Check |
|---|---|
| E5.1 | Rollup builds concept edges from KO edges, deduped, on publish |
| E5.2 | `traceRootCause` returns weak prerequisites deepest first, cycle-safe |
| E5.3 | Time estimate matches the E2 formula |
| E5.4 | Graph view colors nodes by mastery and renders edges, node click opens the popover |
| E5.5 | Tutor context includes the root-cause block when the chain is non-empty, one LLM call only |
| E5.6 | Flag off: mastery page and tutor unchanged |

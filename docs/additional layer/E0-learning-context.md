# E0: Learning Context Fabric

Goal: one deterministic assembler that, given a student and a concept (or KO, or
chapter), returns the unified learning state every surface needs. This is the
spine of the program. No surface should query mastery, the concept graph, or KO
content directly after this phase; they all call the fabric.

Depends on: P1A mastery live (`student_concept_mastery`, `learning_events`,
`knowledge_relationships` populated). Flag: `FEATURE_EMBED`.

AI calls: none.

---

## 1. Data model

No new tables. E0 reads existing tables only. One optional helper column:

- `knowledge_objects.metadata` already exists (JSON). E0 reads an optional
  `analogy` and `pitfall` key if present; it does not require them. No schema change.

If a per-concept rollup is needed for speed later, add it in E5, not here.

## 2. New file: `lib/learning-context.ts`

Export one function and its types.

```ts
export interface LearningContextKO {
  id: string;
  type: "definition" | "formula" | "example" | "misconception"
      | "exercise" | "summary" | "objective" | "concept_overview";
  title: string;
  content: string;       // markdown + latex
  importance: "high" | "medium" | "low";
  analogy?: string;      // from ko.metadata.analogy if present
  pitfall?: string;      // from ko.metadata.pitfall if present
}

export interface LearningContext {
  conceptName: string;
  conceptId: string | null;
  mastery: {
    score: number;        // 0..100, null-safe default 0
    confidence: number;   // 0..100
    trend: "improving" | "stable" | "declining" | null;
    evidenceCount: number;
  };
  blockedBy: string[];           // prerequisite concepts under mastery 40
  prerequisites: string[];       // all prerequisite concepts, ordered
  related: string[];             // related concepts
  kos: {
    definition: LearningContextKO[];
    formula: LearningContextKO[];
    example: LearningContextKO[];
    misconception: LearningContextKO[];
    other: LearningContextKO[];
  };
  reviewHref: string;            // material deep link for this concept
}

export async function getLearningContext(
  studentId: string,
  courseId: string,
  key: { conceptName: string } | { koId: string }
): Promise<LearningContext>;
```

Behavior:

1. Resolve `conceptName` and `conceptId`. If `key.koId`, read the KO row first.
2. Mastery: read `student_concept_mastery` for (student, course, concept). Reuse
   the prerequisite and `blockedBy` logic already in `lib/mastery-store.ts`
   (`getMastery`); extract the graph walk into a shared helper so both files use
   it, do not duplicate. Default to score 0, confidence 0, trend null when no row.
3. Graph: from `knowledge_relationships` collapse KO-level edges to concept level
   (prerequisite, related) for the concept, same collapse `getMastery` already does.
4. KOs: read active `knowledge_objects` for the concept in the course, bucket by
   `type`, sort by `importance` then `learningOrder`. Map `analogy` and `pitfall`
   from `metadata`.
5. `reviewHref`: reuse `getReviewHref(courseId, conceptName)` from
   `lib/mistake-feedback.ts`.

Constraints: one batched query per table, no N+1. Pure function of DB state, no
randomness, no AI. Safe to call on the request path.

## 3. Caching

Read-mostly. Wrap the concept-to-KO and graph parts in an in-process memo keyed by
(courseId, conceptName) with a 60 second TTL, since KOs change only on publish.
Do not cache the mastery part (per student, changes often). Do not use KV here
(KV write budget is for E1 and feedback).

## 4. New file: `lib/learning-context.test.ts` (or script `scripts/seed-embed.ts`)

Follow the repo seed-script convention (see `scripts/seed-mastery.ts`). Seed one
course, three concepts A to B to C with prerequisite edges A->B->C, one student
with mastery A 80, B 25, C 10, and KOs of each type per concept. Assert the fabric
output shape and the three numeric facts in TEST-METRICS E0.

## 5. Files

Create:
- `lib/learning-context.ts`
- `scripts/seed-embed.ts`

Edit:
- `lib/mastery-store.ts` (extract prerequisite collapse into an exported helper,
  e.g. `collapsePrereqsToConcepts`, reused by the fabric; no behavior change)
- `lib/env.ts` (add `FEATURE_EMBED` optional)

## 6. Gate (see TEST-METRICS.md E0)

| Id | Check |
|---|---|
| E0.1 | Fabric returns correct mastery, trend, evidence for a seeded concept |
| E0.2 | `blockedBy` lists only prerequisites under mastery 40 |
| E0.3 | KOs bucketed by type, sorted importance then learningOrder |
| E0.4 | One query per table, verified by query log count in the seed script |
| E0.5 | `npm run lint` and `npm run build` clean, flag off changes nothing |

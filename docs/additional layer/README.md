# Additional Layer: Embedded Intelligence Fabric (EIF)

Status: PLAN ONLY. Nothing is built until a phase Gate table is green.

This program does not add a new AI model and does not rebuild the AI generation
pipeline. It adds the missing layer that fuses the existing adaptive backend
into the three content surfaces (material, quiz, flashcard) so the AI stops
feeling like a separate feature and becomes part of the product.

Read before any phase: [globals.md](../globals.md), [AGENT_CONTEXT.md](../AGENT_CONTEXT.md),
`db/schema.ts`, `lib/env.ts`. Money rule 7 in globals applies: every layer here
is deterministic SQL plus rules, except the two generation-time touches noted in
E1 and E4 (allowed because they run at content generation, not per request).

---

## 1. What already exists (do not rebuild)

The original critique assumed there is no student model, no concept graph, no
misconception engine, and no recommendation engine. Most of that is already
present at the data and service layer, gated behind feature flags:

| Capability | Where it lives | State |
|---|---|---|
| Student mastery state | `lib/mastery-store.ts`, `student_concept_mastery`, `learning_events` | built, flag `FEATURE_MASTERY` |
| Mastery trend (7-day) | `recomputeTrends`, `student_concept_mastery_history` | built |
| Concept graph edges | `knowledge_relationships` (prerequisite, related, extends, example_of, misconception_of) | built at KO level |
| Prerequisite block detection | `getMastery().blockedBy` in `lib/mastery-store.ts` | built |
| Daily recommendations + streak | `lib/recommendation-service.ts`, `lib/streak-service.ts` | built, flags `FEATURE_TODAY` |
| Quiz mistake feedback | `lib/mistake-feedback.ts`, `attempt_feedback` | built, flag `FEATURE_FEEDBACK` |
| Intervention rules engine | `lib/intervention-service.ts`, `interventions` | built |
| Study paths | `lib/study-path-service.ts`, `study_paths` | built, flag `FEATURE_STUDY_PATH` |
| Cohort analytics | `lib/cohort-analytics.ts`, `lib/analytics-service.ts` | built |
| Grounded tutor + memory | `lib/tutor-rag.ts`, `lib/context-assembly.ts`, `tutor_chat_messages` | built, flag `FEATURE_TUTOR_RAG` |
| Material pedagogical containers | `:::concept`, `:::misconception`, `:::formula`, etc. via `lib/markdown-compiler.ts`, `lib/ast-validator.ts` | built |
| Mastery and path UI | `components/course/concept-map.tsx`, `dashboard-weak-concepts.tsx`, `study-path-timeline.tsx`, `/courses/[id]/mastery`, `/courses/[id]/path` | built |

## 2. The real gap

The pieces exist but are not wired into the moment of learning. Symptoms:

1. Quiz remediation still shows "the correct answer is..." instead of mastery
   change, the specific misconception, and the prerequisite root cause.
2. The misconception KO type and the `misconception_detection` blueprint exist,
   but a chosen distractor is not bound to the misconception it represents, so
   feedback cannot name the misconception without an LLM call.
3. No distractor analytics. Per-option selection rates are never aggregated, so
   the system cannot say "72 percent of students hold misconception X".
4. Material is read-only. Selecting a term does not surface the KO data that
   already exists (definition, example, common mistake, quiz me).
5. Every flashcard is treated the same. There is no per-card recall difficulty
   feeding SM-2.
6. The concept graph is stored but never used as a navigable graph or as a
   tutor root-cause tracer ("you failed Integral, likely root cause: Antiderivative").

## 3. The layer: six phases

One new program, phases E0 to E5. E0 is the shared spine every surface reads.

| Order | File | Phase | Depends on | Flag |
|---|---|---|---|---|
| 1 | [E0-learning-context.md](E0-learning-context.md) | Learning Context Fabric (shared assembler) | P1A mastery live | `FEATURE_EMBED` |
| 2 | [E1-misconception-engine.md](E1-misconception-engine.md) | Distractor to misconception binding + distractor analytics | E0 | `FEATURE_MISCONCEPTION` |
| 3 | [E2-quiz-remediation.md](E2-quiz-remediation.md) | Quiz remediation surfacing (mastery delta + root cause) | E0, E1 | `FEATURE_REMEDIATION` |
| 4 | [E3-interactive-material.md](E3-interactive-material.md) | Interactive material layer (highlight to KO actions) | E0 | `FEATURE_MATERIAL_LIVE` |
| 5 | [E4-flashcard-difficulty.md](E4-flashcard-difficulty.md) | Flashcard recall difficulty + SM-2 blend | E0 | `FEATURE_FC_DIFFICULTY` |
| 6 | [E5-learning-graph.md](E5-learning-graph.md) | Navigable concept graph + tutor root-cause | E0, E1 | `FEATURE_GRAPH` |

Task list and test metrics live in separate files:
- [TASKS.md](TASKS.md): every implementation task, checkbox per task.
- [TEST-METRICS.md](TEST-METRICS.md): every Gate, checkbox per metric.

## 4. Dependency graph

```text
E0 (Learning Context Fabric)
 ├─ E1 (Misconception + distractor analytics)
 │   ├─ E2 (Quiz remediation)
 │   └─ E5 (Learning graph + root cause)
 ├─ E3 (Interactive material)
 └─ E4 (Flashcard difficulty)
```

E2, E3, E4, E5 are parallel-ok once their dependencies are green.

## 5. Execution rules for this program

1. Mirror the repo phase format. A phase is done only when every box in its file
   and in TASKS.md is checked and its Gate table in TEST-METRICS.md is green.
2. Schema changes: edit `db/schema.ts` only, then `npm run db:generate`, then
   `npm run db:migrate`. Never hand-edit `drizzle/`.
3. After each edit batch: `npm run lint` and `npm run build`, both clean.
4. Each phase ships behind its flag in `lib/env.ts` (add as optional). Flag absent
   or `0` means the layer is invisible and the surface falls back to current behavior.
5. Zero new Gemini calls except: E1 generation-time distractor tagging and E4
   generation-time difficulty rating. Both run inside existing generation jobs,
   not on the student request path.
6. UI follows UI-STD in globals section 2. No pills, no nested cards, no em or en
   dashes, mastery bars use the section 2.4 spec.

## 6. Design principle

Every surface reads the same `LearningContext` (E0). That single object is what
makes the AI and the material "one thing": the tutor, the quiz remediation, the
material popover, and the flashcard scheduler all answer from the same student
model and the same concept graph, so the student sees one coherent system
instead of separate features.

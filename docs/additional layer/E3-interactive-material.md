# E3: Interactive Material Layer

Goal: make reading the material an entry point into the knowledge graph. When a
student selects a known term, show a popover with deterministic actions sourced
from KO data, not a blank chat box. The tutor chat becomes the escalation, not the
first step.

Depends on: E0. Flag: `FEATURE_MATERIAL_LIVE`.

AI calls: none for the popover. Tutor chat (existing, `FEATURE_TUTOR_RAG`) is the
only escalation and is unchanged.

---

## 1. Term index per material

To know which selected text is a concept, build a term index at material publish
time.

Edit `lib/material-storage.ts` publish step (`approveAndPublish`): for the
chapter's concepts, collect display names plus aliases from `concept_localizations`
and write a `termIndex` into `website_materials.structuredContent` (the AST JSON
already lives there) or into the material `metadata`. Shape:

```ts
termIndex: Array<{ term: string; conceptId: string; conceptName: string }>;
```

Normalize terms lowercase, dedupe, longest match wins. This is deterministic and
runs only at publish, so no request-time cost.

## 2. Selection to actions

Edit `components/course/material-viewer.tsx` and
`components/course/markdown-renderer.tsx`.

On text selection (or tap on a marked term), match the normalized selection against
`termIndex`. On a hit, open a popover (`Sheet` on mobile, small popover on desktop,
both from existing primitives) with actions, each populated from E0
`getLearningContext(studentId, courseId, {conceptName})`:

| Action | Source | Shown when |
|---|---|---|
| Quick explain | first `definition` KO content, trimmed | always on hit |
| Analogy | `ko.analogy` (E0) | only if present |
| Example | first `example` KO | only if present |
| Common mistake | first `misconception` KO | only if present |
| Quiz me | deep link to a quiz filtered to the concept | always |
| Ask the tutor | opens `components/course/tutor-drawer.tsx` prefilled with the concept | always |

No LLM is called to fill the first five. "Ask the tutor" is the only path that may
spend quota, and only when the student clicks it.

A small mastery chip in the popover header shows the student current score and
trend for that concept (from E0), so the material reflects the student state.

## 3. Marking terms (optional, recommended)

To make terms discoverable without guessing, the renderer may underline indexed
terms with a subtle `border-b border-dotted border-border`. Keep it quiet, no
color floods, respects reduced motion. Gate this behind the same flag.

## 4. Data fetch

The popover fetches E0 context through a thin route, for example
`app/api/learning-context/route.ts`, or a server action, returning the
`LearningContext` for one concept. Cache per the E0 60 second memo. Use
`@tanstack/react-query` only if polling is needed; a single fetch on open is enough.

## 5. Files

Create:
- `app/api/learning-context/route.ts` (or a server action in `lib/learning-context-actions.ts`)
- `components/course/term-popover.tsx`
- `scripts/seed-term-index.ts` (verify index build at publish)

Edit:
- `lib/material-storage.ts` (build `termIndex` at publish)
- `components/course/material-viewer.tsx`
- `components/course/markdown-renderer.tsx`
- `lib/env.ts` (`FEATURE_MATERIAL_LIVE`)

## 6. Gate (see TEST-METRICS.md E3)

| Id | Check |
|---|---|
| E3.1 | Publish builds a normalized, deduped term index for chapter concepts |
| E3.2 | Selecting an indexed term opens the popover, non-terms do nothing |
| E3.3 | First five actions render from KO data with zero Gemini calls |
| E3.4 | Actions absent from KO data are hidden, not shown empty |
| E3.5 | Mastery chip shows the student score and trend for the concept |
| E3.6 | Ask the tutor opens the existing drawer prefilled, only path that can spend quota |
| E3.7 | Flag off: material renders read-only as today |

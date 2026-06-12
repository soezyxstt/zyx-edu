# P1A: Persistent Mastery Foundation

Goal: persistent per-concept mastery rows become the single source of truth. Every later phase reads `student_concept_mastery`; nothing recomputes mastery per request anymore.

Flag: `FEATURE_MASTERY=1`. Depends on: P0. Read `globals.md` first.

Excluded on purpose (these are P1B): history, trends, prerequisites, blocked detection.

## Progress
- [ ] Read-before-coding done
- [ ] Schema migrated (2 tables)
- [ ] Backend done (events, worker, API)
- [ ] Frontend done (widget)
- [ ] Out of code done
- [ ] Deliverables done
- [ ] Gate green

## Read before coding
| File | Why |
|---|---|
| `lib/analytics-service.ts` | Contains `calculateCourseMastery` (M_mu 0 to 100 + confidence). Reuse this math verbatim |
| `db/schema.ts` | Column helper style, existing `knowledge_objects`, attempt tables |
| `lib/inngest-functions.ts` and `lib/inngest.ts` | Worker registration pattern to copy |
| `app/api/quiz/attempts/[id]/route.ts` (submission path) | Where quiz grading finishes: insertion point for events |
| `lib/flashcard-actions.ts` | Where a review session ends: insertion point for events |
| `app/dashboard/actions.ts` | Where progress completion is written: insertion point for events |
| `components/course/dashboard-weak-concepts.tsx` | Widget you migrate to the new table |

## Files to create
| File | Purpose |
|---|---|
| `lib/learning-events.ts` | `recordLearningEvent(s)` insert helper, the only writer to `learning_events` |
| `lib/mastery-store.ts` | Recompute affected concepts via `AnalyticsService` math, upsert `student_concept_mastery`; export `getMastery(studentId, courseId)` |
| `app/api/student/mastery/route.ts` | GET endpoint, session-guarded |
| `scripts/seed-mastery.ts` | Seeds 5 test students with known answer patterns; prints expected vs stored scores |

## Files to edit
| File | Change |
|---|---|
| `db/schema.ts` | Add 2 tables (backend spec) |
| quiz submission handler | After grading: insert one `learning_events` row per question (correctness 0 or 1, concept from question tags/KO link), then send 1 Inngest event `mastery/recompute.requested` |
| `lib/flashcard-actions.ts` | On session end: 1 event row per reviewed card (correctness from grade: Again 0, Hard 0.5, Good/Easy 1), then 1 recompute event |
| `app/dashboard/actions.ts` | On material completion: 1 event row (`material_completed`, correctness null) |
| `lib/inngest-functions.ts` | Register `mastery-recompute-worker` |
| `components/course/dashboard-weak-concepts.tsx` | Swap on-the-fly computation for one select on `student_concept_mastery` (lowest 5 scores with evidenceCount >= 3) |
| `lib/env.ts` | Add `FEATURE_MASTERY` |

## Do not touch
`lib/analytics-service.ts` internals (wrap, do not rewrite), `lib/flashcard-scheduler.ts`, leaderboard scoring, `app/admin/*`.

## Backend spec
1. Table `learning_events`: `id` (pk, follow schema id style), `studentId` (fk user), `courseId` (fk courses), `conceptName` (text, nullable), `koId` (fk nullable), `eventType` (text: `quiz_answer | flashcard_review | material_completed | tutor_question`), `correctness` (real, nullable), `weight` (real, default 1), `createdAt`. Index `(studentId, courseId, createdAt)` and `(studentId, conceptName)`.
2. Table `student_concept_mastery`: `id`, `studentId`, `courseId`, `conceptName`, `masteryScore` (integer 0 to 100), `confidence` (integer 0 to 100), `evidenceCount` (integer), `trend` (text, nullable, written by P1B only), `lastEvidenceAt`, `updatedAt`. Unique `(studentId, courseId, conceptName)`.
3. Worker `mastery-recompute-worker` on event `mastery/recompute.requested {studentId, courseId}`: call existing mastery math, upsert all concepts for that pair. One Inngest event per SESSION (quiz submit, flashcard session end), never per answer.
4. `GET /api/student/mastery?courseId=`: auth required, enrollment checked, returns `{ concepts: [{conceptName, masteryScore, confidence, evidenceCount, lastEvidenceAt}] }` sorted ascending by score. P1B adds fields additively; do not version the route.

## Frontend spec
Screen: dashboard weak concepts widget (edit `components/course/dashboard-weak-concepts.tsx`).
- Layout: section heading `h2 text-h6 font-heading` "Weak concepts", `border-b border-border pb-2 mb-3`. Below: `divide-y divide-border` rows, max 5.
- Row: `py-3 flex items-center gap-4`. Left: concept name `text-body-base font-medium` (truncate). Right (fixed `w-40`): mastery bar per UI-STD 2.4 plus score figure `text-body-sm text-muted-foreground tabular-nums` like `34`.
- Bar fill color: `bg-status-error` when score < 40, `bg-status-warning` 40 to 69, `bg-primary` >= 70.
- States per UI-STD 2.5. Empty copy: "No weak concepts yet. Take a quiz to start tracking." with no CTA button.
- Motion: rows use list stagger per UI-STD 2.4. Bar width animates on mount.
- Leave a commented slot after the score figure for the P1B trend icon. Nothing else changes visually.

## Out of code
- [ ] After 1 week, check Inngest dashboard usage: must project under 50k steps/mo.

## Deliverables
- [ ] 2 tables migrated (dev + prod).
- [ ] 3 instrumented write paths (quiz, flashcard, material).
- [ ] Worker registered and visible in Inngest dashboard.
- [ ] API route live.
- [ ] Widget migrated.
- [ ] `scripts/seed-mastery.ts` committed.

## Gate
| Done | # | Test | Steps | Pass when |
|---|---|---|---|---|
| [ ] | 1A.1 | Freshness | Submit a quiz as test student, poll table | `updatedAt` within 2 min |
| [ ] | 1A.2 | Event coverage | Do 1 quiz, 1 flashcard session, 1 material completion | 3 eventType values present in `learning_events` |
| [ ] | 1A.3 | Math parity | `npx tsx scripts/seed-mastery.ts` | Stored vs on-the-fly scores within ±2 points, 5/5 students |
| [ ] | 1A.4 | Write amplification | Submit a 10-question quiz | Exactly 1 Inngest run triggered |
| [ ] | 1A.5 | Widget cost | Load dashboard with devtools | 1 query for the widget, 0 Gemini calls |
| [ ] | 1A.6 | Visual | Dashboard at 1280 px and 380 px, light and dark | Bars colored by threshold, skeleton on throttled network, no layout shift |

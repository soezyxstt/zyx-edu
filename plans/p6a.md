# P6A: Tutor Analytics MVP

Goal: the flagship intelligence demo. A tutor opens a course and sees: enrolled count, active count, most problematic concepts ranked, mastery distributions, intervention counts. One page, live SQL, zero AI.

Flag: `FEATURE_TUTOR_ANALYTICS=1`. Depends on: P1A only (`parallel-ok`, pull forward for demos). Intervention panel renders a dash before P4 exists. Read `globals.md` first.

## Progress
- [ ] Read-before-coding done
- [ ] Backend done (4 queries, guarded route)
- [ ] Frontend done (tutor area, selector, analytics page)
- [ ] Demo seed done + screenshot saved
- [ ] Out of code done
- [ ] Gate green

## Read before coding
| File | Why |
|---|---|
| `db/schema.ts` | `tutor_courses`, `enrollments`, `user.role` |
| `lib/auth-redirect.ts` | Role guard patterns |
| `components/admin-sidebar.tsx` + `app/admin/page.tsx` | Layout pattern to mirror for the tutor area |
| `lib/mastery-store.ts` | Read paths |

## Files to create
| File | Purpose |
|---|---|
| `lib/cohort-analytics.ts` | 4 aggregate queries (backend spec) |
| `app/tutor/layout.tsx` | Teacher-role guard + minimal chrome (reuse admin pattern) |
| `app/tutor/page.tsx` | Course selector (list of `tutor_courses` rows as divider rows) |
| `app/tutor/[courseId]/page.tsx` | The analytics page |
| `app/api/tutor/analytics/route.ts` | Guarded JSON endpoint |
| `components/tutor/concept-ranking.tsx`, `components/tutor/distribution-bar.tsx` | Page pieces |
| `scripts/seed-demo-cohort.ts` | 20 fake students, 2 deliberately weak concepts. THE pitch dataset, reproducible on demand |

## Files to edit
| File | Change |
|---|---|
| `lib/env.ts` | `FEATURE_TUTOR_ANALYTICS` |
| `components/navbar.tsx` or profile dropdown | "Teaching" link visible to `teacher` role only |

## Do not touch
Admin AI portal, student pages, enrollment logic.

## Backend spec
1. Guard: session role `teacher` with a `tutor_courses` row for the courseId, or `admin`. Otherwise 403.
2. Queries (all on P1A tables, min-evidence rule: a concept appears only when >= 5 distinct students have evidence):
   a. Weakest concepts: avg masteryScore ascending, with student count and avg, limit 10.
   b. Distribution per concept: counts in buckets 0-29, 30-59, 60-100.
   c. Active students: distinct studentIds with `learning_events` in last 7 days, vs enrolled total.
   d. Interventions: active count grouped by concept (0/absent pre-P4).
3. Live queries are fine at MVP scale. P6B adds snapshots; do not build them now.

## Frontend spec
Screen: `app/tutor/[courseId]/page.tsx`. Four sections, dividers, no cards, no recharts here (plain divs render faster and read cleaner at this size).
- Section 1 headline: course title `h1 text-h4 font-heading`; under it one line `flex gap-8`: each stat = figure `font-heading text-h3 font-bold tabular-nums` + label below `text-body-sm text-muted-foreground` ("enrolled", "active this week"). Plain figures, no boxes.
- Section 2 "Most problematic concepts": heading per UI-STD, then ranked `divide-y divide-border` rows: `py-3 grid grid-cols-[2rem_1fr_auto_8rem] items-center gap-4`.
  - Rank `text-h6 font-heading text-muted-foreground tabular-nums`.
  - Concept name `text-body-base font-medium` + `text-body-sm text-muted-foreground` "{n} students".
  - Avg mastery figure `tabular-nums`.
  - Distribution mini-bar: `flex h-1.5 w-32 rounded-md overflow-hidden`: three segments sized by bucket %, colors `bg-status-error`, `bg-status-warning`, `bg-primary`. Bucket counts as `title` attr.
- Section 3 "Mastery distribution": same rows for ALL evidenced concepts (not just weakest), bar `w-48`, sorted ascending.
- Section 4 "Active interventions": rows concept + `Badge variant="secondary"` count. Pre-P4: single muted line "Available after the feedback phase ships".
- Motion: sections in `<Reveal>`. Rank rows stagger.
- States: skeleton 4 sections; empty (no evidence yet): "Analytics appear once students take quizzes."
- Course selector page: divider rows, course title + enrolled count + `ArrowRight size-4`.

## Out of code
- [ ] Role audit in production: tutors have `teacher` role + `tutor_courses` rows.
- [ ] Run `scripts/seed-demo-cohort.ts` against a scratch DB and screenshot the page for pitch material.

## Deliverables
- [ ] Tutor area (layout, selector, analytics page), endpoint, 4 queries, demo seed.

## Gate
| Done | # | Test | Steps | Pass when |
|---|---|---|---|---|
| [ ] | 6A.1 | Accuracy | Seed demo cohort | The 2 engineered weak concepts rank top-2 |
| [ ] | 6A.2 | Scope | Tutor of course A requests course B | 403 |
| [ ] | 6A.3 | Noise guard | Concept with 4 evidenced students | Absent from every panel |
| [ ] | 6A.4 | Cost | Load page 10x | 0 AI calls, p95 < 1 s |
| [ ] | 6A.5 | Demo | Fresh DB + seed + 1 command | Presentable page, screenshot saved |
| [ ] | 6A.6 | Visual | Both themes, 380 px | Tri-color bars sum to full width, figures aligned `tabular-nums` |

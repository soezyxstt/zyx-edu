# P1B: Mastery Intelligence Layer

Goal: mastery becomes an evolving signal: daily history, trends, prerequisite-aware blocking. Unblocks P4 rule 2, PWR growth math, P5 locking, P6B trends.

Flag: extends `FEATURE_MASTERY` (no new flag). Depends on: P1A. Read `globals.md` first.

## Progress
- [ ] Read-before-coding done
- [ ] Schema migrated (history table)
- [ ] Cron + trend + blocking done
- [ ] API extended (additive)
- [ ] Frontend done (widget trend/blocked, concept map)
- [ ] Gate green

## Read before coding
| File | Why |
|---|---|
| `lib/mastery-store.ts` (P1A) | You extend it |
| `db/schema.ts` | `knowledge_relationships` (type `prerequisite`) |
| `lib/inngest-functions.ts` | Cron registration pattern (the 5-min vector cron) |
| `components/course/dashboard-weak-concepts.tsx` | Commented trend slot from P1A |
| `components/course/course-sub-nav.tsx` | Tab registration for the new page |

## Files to create
| File | Purpose |
|---|---|
| `app/api/student/mastery/history/route.ts` | Snapshot series for sparklines |
| `app/courses/[id]/mastery/page.tsx` | Concept map page |
| `components/course/concept-map.tsx` | Grouped concept list component |
| `scripts/seed-trends.ts` | Backdated snapshots producing improving/stable/declining |

## Files to edit
| File | Change |
|---|---|
| `db/schema.ts` | Add `student_concept_mastery_history` |
| `lib/inngest-functions.ts` | Daily cron `mastery-snapshot-cron` (off-peak, e.g. 19:00 UTC) |
| `lib/mastery-store.ts` | Trend computation + `blockedBy` resolution; extend API payload |
| `app/api/student/mastery/route.ts` | Additive fields `trend`, `blockedBy` |
| `components/course/dashboard-weak-concepts.tsx` | Fill the trend slot + blocked chip |
| `components/course/course-sub-nav.tsx` | Add "Mastery" tab |

## Do not touch
P1A event writers, `learning_events` shape, P2 plan builder (reads new fields later via P5 only).

## Backend spec
1. `student_concept_mastery_history`: `studentId`, `courseId`, `conceptName`, `masteryScore`, `confidence`, `snapshotDate` (text yyyy-mm-dd). Unique `(studentId, conceptName, snapshotDate)`. Insert-or-ignore for idempotency.
2. Cron: snapshot every `student_concept_mastery` row belonging to students with activity in the last 30 days. Then set `trend` on the live row vs the snapshot 7 days back: diff >= +5 `improving`, <= -5 `declining`, else `stable`. Null when no 7-day-old snapshot.
3. Blocking (computed, not stored): concept A blocked when any prerequisite B (via `knowledge_relationships`) has mastery < 40 for this student. API rows gain `trend: string|null` and `blockedBy: string[]`.
4. History route: `GET /api/student/mastery/history?courseId=&conceptName=` returns `{points: [{date, masteryScore}]}` last 28 days.

## Frontend spec
Screen A: weak concepts widget (edit).
- Trend icon right of score: `TrendingUp size-3.5 text-status-success`, `TrendingDown size-3.5 text-status-error`, `Minus size-3.5 text-muted-foreground`. Tooltip-free.
- Blocked chip under the name when `blockedBy.length > 0`: `Badge variant="outline"` with `Lock size-3` + "needs {first prereq}", `text-muted-foreground`.

Screen B: concept map, route `app/courses/[id]/mastery/page.tsx`.
- Shell: `CoursePageShell` + sub-nav tab "Mastery". Page title per UI-STD 2.3.
- Grouped by chapter: chapter label `h2 text-body-sm font-semibold uppercase tracking-wide text-muted-foreground mt-8 mb-2` + `border-b border-border`.
- Concept rows: `divide-y divide-border`; row `py-3 grid grid-cols-[1fr_auto_auto] items-center gap-4` (mobile: `grid-cols-[1fr_auto]`, trend joins the score cell).
  - Col 1: name `text-body-base font-medium`; if blocked add the Lock chip below (`mt-1`).
  - Col 2: mastery bar `w-32` per UI-STD 2.4, same threshold colors as P1A, score `tabular-nums`.
  - Col 3: trend icon.
  - No evidence yet: bar replaced by `text-body-sm text-muted-foreground` "no data".
- Motion: chapter groups wrapped in `<Reveal>`; rows static.
- States: skeleton mirrors 2 chapter groups x 4 rows; empty: "Knowledge map appears after your first quiz."

## Out of code
- [ ] Check Inngest dashboard after first week: snapshot cron adds about 30 steps/day, confirm.

## Deliverables
- [ ] History table + cron + trend writes.
- [ ] API additive fields, history endpoint.
- [ ] Widget trend/blocked, concept map page + tab.
- [ ] `scripts/seed-trends.ts`.

## Gate
| Done | # | Test | Steps | Pass when |
|---|---|---|---|---|
| [ ] | 1B.1 | Accrual | 3 cron runs (trigger manually via Inngest dev) | 3 rows per evidenced concept |
| [ ] | 1B.2 | Trend | `npx tsx scripts/seed-trends.ts` | improving/stable/declining all correct |
| [ ] | 1B.3 | Blocking | Seed prereq < 40 | Dependent concept returns `blockedBy` with the prereq |
| [ ] | 1B.4 | Idempotent | Trigger cron twice same day | No duplicate rows |
| [ ] | 1B.5 | Compatibility | P2 + P3 smoke (dashboard, tutor ask) | No breakage from additive fields |
| [ ] | 1B.6 | Visual | Concept map both themes, 380 px | Groups, bars, lock chips, trend icons, skeleton |

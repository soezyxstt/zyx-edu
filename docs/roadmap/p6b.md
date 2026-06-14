# P6B: Advanced Cohort Intelligence

Goal: P6A grows into a diagnostic workbench: snapshots, 4-week trends, drill-downs, watchlist, one-click remediation actions.

Flag: extends `FEATURE_TUTOR_ANALYTICS`. Depends on: P6A, P1B, P4. Read `globals.md` first.

## Progress
- [x] Read-before-coding done
- [x] Schema migrated (`course_analytics_snapshots`)
- [x] Cron extension + refresh endpoint done
- [x] Frontend done (sparklines, drill-down, watchlist, actions)
- [ ] Gate green

## Read before coding
| File | Why |
|---|---|
| `lib/cohort-analytics.ts`, `app/tutor/[courseId]/page.tsx` | What you extend |
| `lib/inngest-functions.ts` | The P1B daily cron you extend (do NOT add a new cron) |
| `db/schema.ts` | `ai_question_bank` usage/correct counters |
| Weekly-generate flow (`app/api/quiz/weekly-generate/`) | Prefill contract for the action button |

## Files to create
| File | Purpose |
|---|---|
| `components/tutor/concept-drilldown.tsx` | Sheet with distribution, trend, missed questions |
| `components/tutor/watchlist-table.tsx` | Student watchlist |
| `scripts/seed-cohort-history.ts` | 4 weeks of backdated snapshots |

## Files to edit
| File | Change |
|---|---|
| `db/schema.ts` | `course_analytics_snapshots`: `courseId`, `date`, `payload` (json), unique pair |
| `lib/inngest-functions.ts` | Extend the P1B cron: after student snapshots, build per-course payloads |
| `lib/cohort-analytics.ts` | Page reads snapshot; refresh-now recompute; new aggregates (backend spec) |
| `app/tutor/[courseId]/page.tsx` | Sparklines, drill-down triggers, watchlist section, actions |

## Do not touch
P6A query signatures (additive only), question bank lifecycle, diktat flow.

## Backend spec
1. Snapshot payload adds: per-concept 4-week trend series (weekly avg from history), most-missed bank questions per concept (lowest correct rate, min 5 attempts), watchlist (students with >= 2 active interventions OR declining on >= 3 concepts), engagement (quiz participation %, flashcard adherence % = done reviews / due reviews, 7 days).
2. Page reads latest snapshot; header shows "Updated {relative time}" + Refresh button calling an on-demand recompute endpoint (same code path as cron, single course, target < 10 s).
3. Action: per-concept "Generate remediation quiz" navigates to the existing weekly-generate UI with `?tags={conceptTags}&courseId=` prefilled. No new generation code.

## Frontend spec
- Section 2 rows gain: sparkline cell `w-20 h-6` recharts `LineChart` (line `stroke` uses `var(--primary)`, dot off, axes off, tooltip off) + row click opens drill-down Sheet.
- Drill-down Sheet (`sm:max-w-lg`): concept name `text-h6 font-heading`; distribution bar (P6A component, full width); 4-week trend `LineChart` `h-24` with month-day ticks `text-body-sm`; "Most missed" list: `divide-y divide-border`, question prompt truncated 2 lines + correct-rate `tabular-nums text-status-error`; footer `Button variant="outline" size="sm"` "Generate remediation quiz".
- Watchlist section: plain semantic table: columns Student, Declining concepts (comma list, max 3 + "+n"), Last active (relative). Rows `text-body-sm`. Empty: "No students need attention."
- Header meta row: "Updated 2 h ago" `text-body-sm text-muted-foreground` + Refresh `Button variant="ghost" size="sm"` with `RefreshCw size-4` (spins while pending).

## Out of code
None.

## Deliverables
- [ ] Snapshot table + cron extension, refresh endpoint, drill-down, watchlist, action prefill, seed.

## Gate
| Done | # | Test | Steps | Pass when |
|---|---|---|---|---|
| [ ] | 6B.1 | Freshness | View after cron; press Refresh | Snapshot < 26 h; refresh < 10 s |
| [ ] | 6B.2 | Load | Page view | Snapshot read only, no heavy aggregate, p95 < 500 ms |
| [ ] | 6B.3 | Watchlist | Seed 2-intervention student + healthy student | Only the first appears |
| [ ] | 6B.4 | Trend | `scripts/seed-cohort-history.ts` | Sparkline matches seeded deltas |
| [ ] | 6B.5 | Action | Click remediation button | Weekly-generate opens with tags prefilled, end-to-end publishable |
| [ ] | 6B.6 | Visual | Drill-down sheet, watchlist, 380 px, dark | Sparklines themed via tokens, sheet scrolls |

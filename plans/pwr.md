# PWR: Weekly Learning Reflection

Goal: every active student gets a Monday recap: completed counts, mastery growth, most improved concept, streak. Fully deterministic, zero AI.

Flag: `FEATURE_REFLECTION=1`, `FEATURE_REFLECTION_EMAIL` (default off). Depends on: P1A (events), P1B (history deltas), P2 (streak). `parallel-ok` with P5. Read `globals.md` first.

## Progress
- [ ] Read-before-coding done
- [ ] Schema migrated (`weekly_reflections`)
- [ ] Cron + service + route done
- [ ] Frontend done (panel, archive)
- [ ] Gate green

## Read before coding
| File | Why |
|---|---|
| `lib/inngest-functions.ts` | Cron pattern |
| `db/schema.ts` | History + streak tables |
| `app/dashboard/page.tsx` | Panel slot (under banner, above Today) |
| `app/profile/page.tsx` | Where the archive route hangs |

## Files to create
| File | Purpose |
|---|---|
| `lib/reflection-service.ts` | Weekly aggregation |
| `app/api/student/reflections/route.ts` | GET latest + archive |
| `components/dashboard/weekly-reflection.tsx` | Dashboard panel |
| `app/profile/reflections/page.tsx` | Archive list |
| `scripts/seed-reflection.ts` | Scripted week: 4 quizzes, 82 reviews, 6 modules, +11 mastery |

## Files to edit
| File | Change |
|---|---|
| `db/schema.ts` | `weekly_reflections`: `id`, `studentId`, `weekStart` (text yyyy-mm-dd, Monday), `payload` (json), `createdAt`, unique `(studentId, weekStart)` |
| `lib/inngest-functions.ts` | Cron Monday 06:00 local (store as UTC equivalent) |
| `app/dashboard/page.tsx` | Panel slot |
| `lib/env.ts` | `FEATURE_REFLECTION`, `FEATURE_REFLECTION_EMAIL` |

## Do not touch
Streak update logic, mastery math, email templates elsewhere.

## Backend spec
1. Cron, per student with >= 1 event in the past 7 days (inactive students get NO row, no guilt content):
   - `completed`: counts grouped by eventType (quiz submissions by distinct attempt, flashcard reviews by row, modules by `material_completed` rows).
   - `masteryGrowth`: sum over concepts evidenced this week of (latest snapshot minus snapshot 7 days earlier).
   - `mostImproved`: concept with max positive delta (ties: higher evidence).
   - `streak`: copy current + longest from `student_streaks`.
2. Insert-or-ignore on the unique pair (idempotent).
3. Email branch only when `FEATURE_REFLECTION_EMAIL=1` AND weekly active count <= 90 (Resend free cap 100/day). In-app is the primary channel; do not build the email template until the flag is ever turned on.

## Frontend spec
Screen A: dashboard panel, visible Monday through Wednesday or until dismissed (dismissal stored in `localStorage` key `reflection-dismissed-{weekStart}`).
- Container: section (NOT a filled card): `border-y border-border py-5 my-8`. Heading row: `h2 text-h6 font-heading` "Your week" + dismiss `Button variant="ghost" size="icon"` with `X size-4`.
- Hero figure: `font-heading text-h3 font-bold text-status-success tabular-nums` "+{masteryGrowth}" with `text-body-sm text-muted-foreground` "mastery points" beside. Growth <= 0: render the completed counts as hero instead and omit the growth figure entirely (never show a negative hero).
- Stat line under hero: `flex flex-wrap gap-x-8 gap-y-1 text-body-sm text-muted-foreground mt-2`: "{q} quizzes", "{f} flashcards", "{m} modules", "{s} day streak". Plain text, no boxes.
- Most improved: `text-body-base mt-2`: "Most improved: " + concept `font-medium` + inline `TrendingUp size-3.5 text-status-success`.
- Motion: panel enters `animate-in fade-in slide-in-from-bottom-2 duration-300` once per mount.

Screen B: archive `app/profile/reflections/page.tsx`: `divide-y divide-border` rows: week label `text-body-sm font-medium` ("Jun 2 to Jun 8") + the stat line + growth figure right-aligned. Empty: "Reflections appear after your first active week."

## Out of code
- [ ] Check the Monday Inngest run count once (about 1 batch + 1 step per 50 students).

## Deliverables
- [ ] Table, cron, service, route, panel, archive, seed.

## Gate
| Done | # | Test | Steps | Pass when |
|---|---|---|---|---|
| [ ] | WR.1 | Math | `npx tsx scripts/seed-reflection.ts` | Payload exactly {4, 82, 6, +11, correct concept} |
| [ ] | WR.2 | Zero AI | Trigger cron | Gateway flat |
| [ ] | WR.3 | Idempotent | Trigger cron twice | No duplicate rows |
| [ ] | WR.4 | Inactive skip | Student with 0 events | No row |
| [ ] | WR.5 | Negative week | Seed net negative growth | Hero shows counts, no negative figure |
| [ ] | WR.6 | Visual | Panel Monday state, dismiss, archive with 2 weeks | Dismissal persists across reload |

# ZYX Academy — Master Technical Plan

> **Vision target:** evolve ZYX from an AI-assisted LMS into an AI-native **Learning Operating System** — a platform that models what each student knows, diagnoses gaps, and actively drives them toward mastery.
>
> **How to use this document:** execute phases in order. Each phase has an **individual goal**, a **Frontend / Backend / Out-of-Code** work breakdown, and **test metrics** that must pass before moving to the next phase. Every external service chosen here has a free tier; the free-tier limits are listed so you know exactly when you'd outgrow them.
>
> ⚠️ This is a plan only. No code is written by this document.

---

## 0. Current-State Audit (what already exists — do NOT rebuild)

Verified against the codebase on 2026-06-11:

| Capability from the vision | Status | Where it lives today |
|---|---|---|
| Knowledge decomposition (courses → chapters → Knowledge Objects with type, Bloom level, difficulty, importance) | ✅ Done | `db/schema.ts` (`knowledge_objects`, `knowledge_relationships`), `lib/ko-extractor.ts`, `lib/knowledge-service.ts` |
| RAG pipeline (chunking → Gemini embeddings → Pinecone, namespace per course) | ✅ Done | `lib/ingestion-parser.ts`, `lib/pinecone.ts`, `lib/inngest-functions.ts` (vector sync outbox + cron) |
| AI quiz generation (RAG → Gemini → question bank → curation → templates → attempts with deep snapshots) | ✅ Done | `lib/question-generator.ts`, `lib/question-validator.ts`, `app/api/quiz/*`, `app/admin/ai/*` |
| Flashcards + SM-2 spaced repetition (ease factor, boxes, overdue scaling, safety floor) | ✅ Done | `lib/flashcard-scheduler.ts`, `lib/flashcard-actions.ts`, `lib/flashcard-generator.ts` |
| Study guide (diktat) generation → Puppeteer PDF → CDN | ✅ Done | `lib/diktat-*.ts` |
| Website material generation (KOs → Markdown `:::blocks` → AST → React renderer) | ✅ Done | `lib/material-generator.ts`, `lib/markdown-compiler.ts`, `components/course/markdown-renderer.tsx` |
| AI tutor chat drawer (Gemini, 30 req/day budget) | ⚠️ Partial | `components/course/tutor-drawer.tsx`, `lib/usage-budget-service.ts` — **no RAG grounding, no source citations, no caching** |
| Mastery scoring per concept (M_mu 0–100 + confidence) | ⚠️ Partial | `lib/analytics-service.ts` — **computed on the fly, never persisted; no history; no prerequisite-aware propagation** |
| Weak-concept surface on dashboard | ⚠️ Partial | `components/course/dashboard-weak-concepts.tsx` — surfaces weaknesses but **gives no actionable "do these 3 things today" plan** |
| Database: SQLite (dev) / Turso (prod) | ✅ Done | `lib/db/index.ts` (libsql driver) — matches the vision stack already |
| Cloudflare AI Gateway routing for Gemini | ⚠️ Scaffolded | `lib/gemini.ts` routes through `CF_AI_GATEWAY_URL` when set — **gateway itself not yet created/configured** |
| R2 storage | ⚠️ Scaffolded | `R2_*` env vars in `lib/env.ts` — **no bucket, no upload path uses it; UploadThing is live** |
| Learning streak | ❌ Missing | only a placeholder string in `lib/site-search-index.ts` |
| Daily recommendation engine ("Today: 12 flashcards, 1 quiz, 1 module") | ❌ Missing | — |
| KV response/RAG cache | ❌ Missing | — |
| Per-question "why was I wrong" AI feedback | ❌ Missing | quiz review shows correct answer + static explanation only |
| Adaptive companion (repeated-failure detection → proactive intervention) | ❌ Missing | — |
| Personalized study paths | ❌ Missing | — |
| Tutor cohort analytics ("most problematic concepts across 200 students") | ❌ Missing | admin analytics are content-ops metrics, not pedagogy metrics |
| Cloudflare Vectorize | ❌ Missing | Pinecone in use |
| Real-time classroom (Durable Objects live quiz) | ❌ Missing | — |

**Consequence:** Phases below focus on the deltas. Roughly: Phases 1–5 = intelligence layer (mastery → recommendations → adaptive loop), Phase 6 = tutor side, Phases 7–8 = infrastructure migrations, Phase 9 = realtime, Phase 10 = hardening.

---

## 1. Service & Free-Tier Inventory (decide once, never re-litigate)

| Concern | Service | Free-tier limits (verify at signup — limits drift) | When you outgrow it |
|---|---|---|---|
| LLM generation | **Gemini 2.5 Flash** (existing key) | ~10 RPM, ~250 requests/day, 250k TPM on free tier | Paid Gemini tier or Flash-Lite for cheap calls |
| Embeddings | **Gemini `text-embedding-004`** (existing) | ~1,500 requests/day | Batch + cache aggressively first |
| AI observability / caching / failover | **Cloudflare AI Gateway** | Free: unlimited proxying, 100k logged requests/mo retained | Pay for longer log retention |
| Edge KV cache | **Cloudflare Workers KV** | Free: 100k reads/day, 1k writes/day, 1k deletes/day, 1 GB | Note the **1k writes/day** — design cache writes to stay under this (Phase 3) |
| Object storage | **Cloudflare R2** | 10 GB storage, 1M Class A + 10M Class B ops/mo, **zero egress fees** | Pay per GB after 10 GB |
| Vector DB (current) | **Pinecone Serverless Starter** | 2 GB storage, 1 project, 5 indexes | Migrate to Vectorize (Phase 8) |
| Vector DB (target) | **Cloudflare Vectorize** | Free: 30M queried vector dims/mo, 5M stored dims | At 768-dim vectors ≈ 6,500 stored vectors free — check your KO count before migrating |
| Realtime | **Cloudflare Durable Objects (SQLite-backed)** | Available on Workers **Free** plan: 100k requests/day, 13k GB-s compute/day | Workers Paid $5/mo |
| Database | **Turso** (already wired) | Free: 5 GB total storage, 500M row reads/mo, 10M row writes/mo | Turso paid; schema already libsql-compatible |
| Background jobs | **Inngest** (existing) | Free: 50k step runs/mo, 5 concurrent | Move heavy crons to Cloudflare Cron Triggers (free) |
| File uploads (current) | **UploadThing** (existing) | Free: 2 GB | Phase 7 migrates to R2 |
| Hosting | **Vercel Hobby** (assumed current) | Standard hobby limits; serverless fn 10s default timeout | Long AI jobs must stay in Inngest, never in route handlers |
| Email | **Resend** (existing) | 100 emails/day, 3k/mo | — |

**Standing decisions (locked in so execution never stalls):**

1. **Stay on Turso/SQLite.** Already migrated; vision agrees. Do not return to Postgres.
2. **Pinecone stays until Phase 8.** All new retrieval code MUST go through a vector-store adapter interface (defined in Phase 3) so the Vectorize swap is a config change, not a rewrite.
3. **UploadThing stays until Phase 7.** New *AI-generated* assets (study guide PDFs) start writing to R2 in Phase 7; user uploads migrate last.
4. **All Gemini traffic goes through AI Gateway from Phase 0 onward.** No direct-to-Google calls except the local-dev fallback already in `lib/gemini.ts`.
5. **Every phase ships behind a feature flag** (simple env var, e.g. `FEATURE_RECOMMENDATIONS=1`) so a broken phase can be disabled in production without a revert.

---

## Phase 0 — Infrastructure Activation & Baseline

**Goal:** every external service in the inventory is provisioned, keys are in `.env`, the AI Gateway proxies 100% of Gemini traffic, and you have baseline numbers to compare every later phase against.

**Duration estimate:** 1–2 days. **No new product features.**

### Out-of-Code
- [ ] **Cloudflare account** (free): create at dash.cloudflare.com if not existing.
- [ ] **AI Gateway**: Dashboard → AI → AI Gateway → Create Gateway, name `zyx-edu`. Copy the gateway URL for the *Google AI Studio* provider format: `https://gateway.ai.cloudflare.com/v1/{account_id}/zyx-edu/google-ai-studio`. Set `CF_AI_GATEWAY_URL` in `.env` and in Vercel project env. Enable **logging** on the gateway; leave caching OFF for now (Phase 3 turns it on deliberately).
- [ ] **Workers KV**: Dashboard → Storage & Databases → KV → Create namespace `zyx-ai-cache`. Note the namespace ID. (Used in Phase 3; created now so the account-level API token below can be scoped once.)
- [ ] **R2**: Dashboard → R2 → Create bucket `zyx-edu-assets` (location: APAC). Create R2 API token (Object Read & Write). Fill `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL` (enable public dev URL or attach custom domain) — env keys already exist in `lib/env.ts`.
- [ ] **Cloudflare API token** for Workers/KV REST access from Next.js: My Profile → API Tokens → Create Token → permissions: `Workers KV Storage: Edit`. Record `CF_ACCOUNT_ID`, `CF_KV_NAMESPACE_ID`, `CF_API_TOKEN` (these become new env vars in Phase 3).
- [ ] **Turso production DB**: confirm `TURSO_CONNECTION_URL` + `TURSO_AUTH_TOKEN` are set in Vercel and `drizzle-kit push` has been run against it. If prod DB doesn't exist yet: `turso db create zyx-edu`, `turso db tokens create zyx-edu`.
- [ ] **Pinecone**: confirm `PINECONE_API_KEY` + `PINECONE_INDEX_NAME` set (768 dims, cosine) — flagged as needed in project memory.
- [ ] **Wrangler CLI**: `bun add -g wrangler`, `wrangler login`. (Needed Phases 8–9; install now to surface auth issues early.)
- [ ] **Baseline capture** (record in a `docs/baselines.md` table): Vercel analytics p75 load time for `/dashboard`; count of Gemini requests/day from AI Gateway after 48h; Turso row reads/day from Turso dashboard; Pinecone record count.

### Backend
- Verify `lib/gemini.ts` gateway routing works end-to-end once `CF_AI_GATEWAY_URL` is set (it's already coded — this is a config test, not a code task).
- Add the three new env vars (`CF_ACCOUNT_ID`, `CF_KV_NAMESPACE_ID`, `CF_API_TOKEN`) to the `lib/env.ts` schema as optional strings.

### Frontend
- None.

### Test Metrics (exit criteria)
| Metric | Target | How to measure |
|---|---|---|
| Gemini traffic visible in AI Gateway | 100% of tutor-drawer + generation requests appear in gateway logs | Trigger 5 AI tutor questions + 1 question-generation job; count log entries in CF dashboard |
| Prod DB reachable | `drizzle-kit push` clean, app boots on Vercel with Turso | Deploy preview, load `/dashboard` |
| R2 round-trip | Upload + fetch a test object via `aws4fetch`/S3 SDK from a local script | One-off script, then delete the object |
| Baseline doc exists | `docs/baselines.md` committed with 4 numbers filled in | File review |

---

## Phase 1 — Persistent Mastery Model & Knowledge Graph Completion

**Goal:** the platform can answer, *from a database row and not an on-the-fly computation*: "what does student X currently know, per concept, with history over time?" This is the substrate every later phase reads from.

**Why first:** recommendations (P2), adaptive interventions (P4), study paths (P5), and tutor analytics (P6) all read mastery state. Computing it live per request (current `analytics-service.ts` behavior) cannot scale to a dashboard hit per student per day and gives no time-series.

### Backend
1. **New tables** (Drizzle migration):
   - `student_concept_mastery`: `(id, studentId, courseId, conceptName, masteryScore 0–100, confidence 0–100, evidenceCount, trend ('improving'|'stable'|'declining'), lastEvidenceAt, updatedAt)` — unique index on `(studentId, courseId, conceptName)`.
   - `student_concept_mastery_history`: append-only daily snapshots `(studentId, conceptName, courseId, masteryScore, confidence, snapshotDate)` — unique on `(studentId, conceptName, snapshotDate)`.
   - `learning_events`: unified evidence ledger `(id, studentId, courseId, conceptName?, koId?, eventType ('quiz_answer'|'flashcard_review'|'material_completed'|'tutor_question'), correctness real?, weight real, createdAt)`. Quiz submission, flashcard grading, and material completion handlers each insert rows here (small write added to 3 existing code paths).
2. **Mastery recompute worker** (Inngest):
   - Event-driven: `mastery/recompute.requested {studentId, courseId}` fired after every quiz submission and flashcard session end → recompute only affected concepts using existing `AnalyticsService.calculateCourseMastery` logic, upsert into `student_concept_mastery`.
   - Cron (daily, off-peak): snapshot all active students' rows into `..._history`; compute `trend` by comparing 7-day-old snapshot.
3. **Prerequisite propagation rule:** when concept A has prerequisite B (`knowledge_relationships`, type `prerequisite`) and B's mastery < 40, cap A's *displayed* readiness and mark A as `blocked_by: B` in the mastery API response (computed in service layer; not stored).
4. **Refactor `dashboard-weak-concepts` + leaderboard weak-concept queries** to read from `student_concept_mastery` instead of recomputing.
5. **API**: `GET /api/student/mastery?courseId=` → list of `{conceptName, masteryScore, confidence, trend, blockedBy[]}`; tutor/admin variant `GET /api/admin/mastery?courseId=&aggregate=true` for Phase 6.

### Frontend
- Dashboard "Weak Concepts" widget upgraded to show: mastery bar (0–100), trend arrow, and "blocked by" prerequisite chips (use `rounded-md` badges — **no pills**).
- New course-page section "Concept Map" (route `app/courses/[id]/mastery/`): vertical list grouped by chapter; each concept = name + mastery bar + trend. Typography-and-divider layout per the design system (no card grids).

### Out-of-Code
- None (uses existing Turso + Inngest).
- Watch Inngest free-tier step count after enabling recompute events for a week (dashboard → Usage). Budget: recompute fires ≤ 2 steps per quiz/flashcard session; with 50k free steps/mo that supports ~20k sessions/mo.

### Test Metrics
| Metric | Target | How to measure |
|---|---|---|
| Mastery freshness | `student_concept_mastery.updatedAt` within 2 min of a quiz submission | Seed script: submit a quiz as a test student, poll the table |
| Dashboard query cost | Weak-concepts widget makes **0** live Gemini/aggregate calls; 1 indexed select | Inspect query logs / code review |
| History accrual | After 3 daily crons, 3 snapshot rows per (student, concept) | Count rows in `..._history` |
| Correctness regression | New stored scores match old on-the-fly scores ±2 points for 5 seeded students | Comparison script run once before cutover |
| Prereq blocking | Seeded student with `Basic Integration < 40` sees `Integration by Parts` flagged `blocked_by` | API response assertion |

---

## Phase 2 — Daily Recommendation Engine + Learning Streak (Student Home)

**Goal:** a student who logs in knows in <5 seconds what to do today: streak count, weak concepts, and a concrete "Today's plan: N flashcards, 1 quiz, 1 module" — exactly the vision's Stage-1 dashboard. No searching, no guessing.

### Backend
1. **New tables**:
   - `student_streaks`: `(studentId pk, currentStreak, longestStreak, lastActiveDate)`. A day "counts" if ≥1 `learning_events` row exists for that date (uses Phase 1 ledger — no extra writes). Updated lazily on dashboard load: compare `lastActiveDate` with today/yesterday, increment or reset.
   - `daily_recommendations`: `(id, studentId, date, payload jsonb, completedItems jsonb, generatedAt)` — one row per student per day, cached so the plan is stable all day.
2. **Recommendation algorithm** (`lib/recommendation-service.ts`) — deterministic, **zero Gemini calls** (cost rule: recommendations are rule-based; only content *inside* them was AI-generated earlier):
   - Flashcards: count due cards from existing SM-2 scheduler (`student_flashcard_progress.nextReviewAt <= now`), cap display at 20.
   - Quiz: pick 1 published quiz template whose tags intersect the student's 3 lowest-mastery non-blocked concepts and which the student hasn't passed (score < 70 or unattempted).
   - Module: pick 1 `website_materials` chapter covering the lowest-mastery concept that the student hasn't completed (`student_chapter_progress`).
   - Priority order in payload: overdue flashcards → weak-concept quiz → module → (fallback when nothing weak: next unstarted chapter in course order).
3. **API**: `GET /api/student/today` → `{streak, recommendations[], completed[]}`; `POST /api/student/today/complete {itemId}` marks items done (also auto-marked by the underlying feature, e.g. finishing the flashcard session).

### Frontend
- **Dashboard hero rework** (`app/dashboard/page.tsx`): top strip = greeting + streak counter ("🔥 6-day streak" — text + count, `rounded-md` tag); below = "Today's Plan" as an ordered checklist (typography-first, divider-separated rows, each row: icon, title, count, CTA link, check state). Completed items get strikethrough + check.
- Streak also shown in `student-sidebar.tsx` footer.
- Empty states: brand-new student → "Start your first chapter" single CTA; all caught up → congratulatory state.

### Out-of-Code
- None.

### Test Metrics
| Metric | Target | How to measure |
|---|---|---|
| Plan generation cost | 0 Gemini requests per dashboard load | AI Gateway logs flat while loading dashboard 20× |
| Plan stability | Same payload all day (regenerated only at local midnight or on data change like quiz completion) | Load dashboard 3× across an hour, diff payloads |
| Streak correctness | 3 seeded scenarios pass: consecutive days increments; 1-day gap resets to 1; same-day repeat no-ops | Seed script with manipulated `learning_events` dates |
| Latency | `/api/student/today` p95 < 300 ms (warm) | 50-request local `autocannon`/script run |
| Relevance | Recommended quiz tags ∩ bottom-3 mastery concepts ≠ ∅ for 5 seeded students | Assertion script |

---

## Phase 3 — Grounded AI Tutor (RAG + Citations) with KV Cache

**Goal:** the AI tutor answers from *course materials* with citations ("According to Chapter 5… Related: Weekly Quiz #4, Q8"), not from generic model knowledge — and repeated questions cost zero Gemini calls via Cloudflare KV.

This implements the vision pipeline: **Question → KV cache → (miss) → vector search → context → Gemini → answer.**

### Backend
1. **Vector-store adapter** (`lib/vector-store.ts`): interface `{ query(namespace, embedding, topK, filter), upsert(...), delete(...) }` with a Pinecone implementation wrapping existing `lib/pinecone.ts`. **All retrieval call-sites (tutor, question generation) move to this interface.** This is the Phase-8 escape hatch.
2. **Tutor RAG pipeline** (`lib/tutor-rag.ts`), used by the tutor-drawer endpoint:
   - Normalize question (trim, lowercase, strip punctuation) → SHA-256 → KV cache key `tutor:{courseId}:{chapterId|all}:{hash}`.
   - **KV read** via Cloudflare REST API (`https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/storage/kv/namespaces/{CF_KV_NAMESPACE_ID}/values/{key}`). Hit → return cached `{answer, sources}` immediately, log `cache:hit` to `ai_usage_events` with 0 tokens.
   - Miss → embed question → adapter `query` (topK 6, course namespace, optional chapter filter) → hydrate chunks/KOs from DB → build prompt: system rules + retrieved context + student's 3 weakest concepts (Phase 1) for personalization → Gemini 2.5 Flash.
   - Response contract (Gemini JSON mode): `{answer: markdown, sources: [{type:'chapter'|'ko'|'question', id, label}], confidence}`. If retrieval returns 0 chunks above similarity threshold (0.5), answer with an honest "not covered in your course materials" + general explanation flagged as ungrounded.
   - **KV write** (TTL 7 days) only when confidence ≥ threshold. **Write budget guard:** KV free tier = 1,000 writes/day; track daily writes in a counter (KV key `meta:writes:{date}` or a DB counter) and skip cache-writes past 900/day — reads stay unlimited-ish (100k/day).
3. **Summarize-this-chapter** button pipeline: same cache-first flow with key `summary:{chapterId}:{materialVersion}` and a fixed prompt producing `{keyConcepts[], commonMistakes[], importantFormulas[], practiceRecommendations[]}`. Cache TTL = until material version changes (key embeds version, so stale entries simply expire by TTL 30 days).
4. **AI Gateway caching ON** for deterministic endpoints (gateway dashboard, Phase-0 gateway): enable with default TTL 1 h — second cache layer for free.
5. Keep the existing 30-requests/day budget (`usage-budget-service.ts`), but **cache hits don't count against the budget** (they cost nothing).

### Frontend
- `tutor-drawer.tsx`: render `sources[]` as a "Sources" footer under each answer — chapter links navigate to the material page, question sources link to the review page. Ungrounded answers get a subtle `text-muted-foreground` "general knowledge" notice.
- Material viewer (`material-viewer.tsx` / chapter page): "Summarize this chapter" button → renders the 4-section summary in a sheet/drawer using existing markdown renderer.
- Cache-hit answers render instantly — show them without the streaming/typing affordance.

### Out-of-Code
- [ ] Enable caching on the `zyx-edu` AI Gateway (Dashboard → AI Gateway → Settings → Cache, TTL 3600s).
- [ ] Confirm KV namespace + API token from Phase 0 work (one-off curl write/read/delete).
- [ ] After 1 week live: check KV analytics (reads, writes) and AI Gateway analytics (cache hit %, request count) against budgets.

### Test Metrics
| Metric | Target | How to measure |
|---|---|---|
| Cache correctness | Asking the same question twice: 2nd response identical, served < 500 ms, 0 Gemini calls | AI Gateway logs + response timing |
| Cache hit rate (steady state) | ≥ 30% of tutor requests after 2 weeks of real use | `ai_usage_events` cache:hit vs cache:miss ratio |
| Groundedness | For a 20-question eval set written from actual course chapters: ≥ 18 answers cite ≥ 1 correct source | Manual eval sheet (create `docs/tutor-eval.md` with the 20 Q/A pairs) |
| Honest fallback | 5 out-of-syllabus questions ("explain quantum chromodynamics") → all flagged ungrounded, none fabricate citations | Manual eval |
| KV write budget | < 900 writes/day | KV dashboard analytics |
| Latency (miss path) | p95 < 8 s end-to-end | Timing logs over 20 fresh questions |

---

## Phase 4 — Learning-Oriented Quiz Feedback + Adaptive Companion

**Goal:** after a quiz, the student gets *"why was my answer wrong"* explanations and a concrete next-step plan; after repeated failures on a concept, the platform proactively intervenes with a remediation bundle — the vision's "Attention: you have struggled with Integration by Parts for three consecutive quizzes."

### Backend
1. **Per-mistake AI feedback** (`lib/mistake-feedback.ts`):
   - On quiz submission, for each *incorrect* answer: cache-first (KV key `feedback:{questionId}:{hash(studentAnswer)}` — wrong answers cluster heavily, so hit rate is high) → miss: one batched Gemini call per submission (all mistakes in one prompt, JSON array out) producing per-question `{whyWrong, misconceptionName?, correctApproach (≤3 steps), reviewLink {chapterId|koId}}`.
   - Store in a new `attempt_feedback` table `(attemptId, questionSnapshotIndex, payload jsonb)` so the review page never regenerates.
   - Budget: counts as 1 request against the student's daily budget regardless of mistake count (single batched call).
2. **Strength/weakness summary per attempt:** computed deterministically from question→tag→concept mapping + correctness (no AI): `{strongAreas[], weakAreas[], recommendedNextSteps[]}` where next steps reuse the Phase-2 recommendation builders scoped to the attempt's weak concepts. Stored on the attempt row.
3. **Adaptive companion** (`lib/intervention-service.ts` + Inngest):
   - New table `interventions`: `(id, studentId, courseId, conceptName, reason, status ('active'|'dismissed'|'resolved'), payload jsonb {moduleId, quizTemplateIds[], flashcardCount}, createdAt, resolvedAt)`.
   - Trigger rule (evaluated in the Phase-1 mastery recompute worker, no new cron): concept has ≥ 3 consecutive quiz-evidence failures (from `learning_events`) **or** mastery < 30 with trend `declining` → create intervention (unique active per (student, concept)).
   - Remediation bundle assembled rule-based: the chapter module covering the concept + up to 2 matching quiz templates + due/new flashcards linked to the concept's KOs.
   - Resolution rule: mastery for the concept rises above 60 → auto-mark `resolved`.
4. **API**: `GET /api/student/interventions` (active list), `POST /api/student/interventions/[id]/dismiss`.

### Frontend
- **Results page rework** (`app/courses/[id]/my-results/[submissionId]/review-client.tsx` + quiz-attempt review): top = score + "Strong areas / Weak areas" two-column typographic list; per wrong question = collapsible "Why this was wrong" block (AI feedback, with misconception name as an h6 label) + "Review →" link; bottom = "Recommended next steps" checklist reusing Phase-2 row styling.
- **Dashboard intervention banner**: when an active intervention exists, a full-width attention strip (border-l accent, `bg-status-warning/10`, **not** a card pile): "You've struggled with *Integration by Parts* across 3 quizzes" + the 3-item remediation checklist + dismiss.
- Quiz player post-submit screen links straight into the feedback view.

### Out-of-Code
- None new. Watch Gemini free-tier daily request count in AI Gateway after launch (feedback generation adds ~1 call/quiz-submission; with 250 req/day free, budget ≤ 100 submissions/day before caching kicks in — acceptable for current scale; KV feedback cache reduces this fast).

### Test Metrics
| Metric | Target | How to measure |
|---|---|---|
| Feedback coverage | 100% of incorrect answers on a submitted quiz get stored feedback within 30 s | Seed: submit quiz with 4 wrong answers, poll `attempt_feedback` |
| Feedback cost | ≤ 1 Gemini call per submission; repeat wrong answer by 2nd student = 0 calls | AI Gateway logs |
| Intervention trigger accuracy | Seeded student failing concept X in 3 consecutive quizzes → exactly 1 active intervention for X, none for passed concepts | Seed script assertion |
| Intervention resolution | Raising mastery to >60 via seeded events auto-resolves it | Seed script assertion |
| No duplicate nags | Re-failing while an intervention is active creates no second row | Assertion |
| Review-page regeneration | Reloading results page = 0 Gemini calls | Gateway logs |

---

## Phase 5 — Personalized Study Paths

**Goal:** two students in the same course see different journeys: an ordered, prerequisite-respecting path of modules/quizzes/flashcards from their current mastery state to course completion — "what should I study next" answered for the whole course, not just today.

### Backend
1. **Path computation** (`lib/study-path-service.ts`) — deterministic graph algorithm, no AI:
   - Nodes = concepts (grouped KOs) per course; edges = `knowledge_relationships` type `prerequisite`.
   - Topological sort; within ready-set ordering: lowest mastery first, then chapter order, then importance.
   - Each path step = `{conceptName, status ('locked'|'available'|'in_progress'|'mastered'), actions: [module?, quiz?, flashcards?], estimatedMinutes}` (reading time from website-material metadata, +10 min per quiz, +30 s per flashcard).
   - `mastered` ≥ 70 mastery & confidence ≥ 50; `locked` = any prereq < 40.
2. **Persistence**: `study_paths` table `(studentId, courseId, pathJson, computedAt)` recomputed by the Phase-1 mastery worker when mastery changes (cheap: pure SQL + in-memory sort).
3. **Cycle guard**: relationship-graph cycle detection runs at path build; cycles logged to a new admin warning surface and broken by chapter order (deterministic tiebreak).
4. **API**: `GET /api/student/study-path?courseId=`.
5. Phase-2 recommendation engine upgraded to pull "module/quiz of the day" from the head of the study path (single source of truth for "next").

### Frontend
- New route `app/courses/[id]/path/` + course sub-nav tab "Study Path": vertical timeline (divider-connected, typography-first — explicitly *not* a card chain): each step shows concept, mastery bar, status, action links; locked steps show "unlocks after {prereq}".
- Dashboard course rows link to "Continue your path → {next concept}".

### Out-of-Code
- [ ] Content audit (human task): for each live course, verify `knowledge_relationships` prerequisite coverage — every chapter-2+ concept should have ≥ 1 prerequisite edge or a deliberate "entry point" marking. Without edges the path degrades to chapter order (acceptable fallback, but audit makes it *adaptive*). Track per-course coverage % in the admin KO screens.

### Test Metrics
| Metric | Target | How to measure |
|---|---|---|
| Personalization proof | Two seeded students (vision's Student A weak in *Volumes of Revolution*, Student B weak in *Integration by Parts*) get different step orders surfacing their own weakness earlier | Seed script, diff path JSONs |
| Prerequisite soundness | No path ever places a concept before an unmastered prerequisite (`locked` enforced) | Property-check script over 20 randomized mastery profiles |
| Determinism | Same mastery state → identical path on recompute | Recompute twice, diff |
| Compute cost | Path build < 200 ms for a 100-concept course; 0 AI calls | Timing log |
| Cycle safety | Seeded A→B→A relationship: path still builds, warning logged | Seed script |

---

## Phase 6 — Tutor Intelligence Dashboard

**Goal:** a tutor opening their course sees in one screen: "200 students; most problematic concepts: 1. Shell Method, 2. Integration by Parts…" — where to intervene, without reading submissions. (AI quiz generation and study-guide/diktat generation already exist — this phase adds the *diagnostic* layer and small UX glue.)

### Backend
1. **Cohort analytics** (`lib/cohort-analytics.ts`) reading Phase-1 tables — pure SQL aggregates:
   - Problematic concepts: avg mastery ascending, weighted by evidence count (min 5 students with evidence to appear).
   - Per-concept drill-down: mastery distribution buckets (0–30/30–60/60–100 counts), most-missed question-bank items (existing usage/correct counts), trend over last 4 weekly snapshots.
   - Student watchlist: students with ≥ 2 active interventions or declining trend across ≥ 3 concepts.
   - At-a-glance: active students (7-day), quiz participation rate, flashcard adherence (% of due reviews done).
2. **Nightly materialization**: `course_analytics_snapshots (courseId, date, payload jsonb)` built by the existing daily Inngest cron (extend it, don't add a new one) — tutor dashboard reads the snapshot, "Refresh now" button recomputes on demand.
3. **API**: `GET /api/tutor/analytics?courseId=` (role-guarded: `teacher` assigned via `tutor_courses`, or `admin`).
4. **Glue**: per-concept "Generate remediation quiz" button pre-fills the existing weekly-generate flow with the concept's tags; "most problematic concepts" links into the existing question-bank curation grid filtered by tag.

### Frontend
- New route `app/tutor/` (or extend admin pattern for `teacher` role): course selector → analytics page with sections separated by dividers/headings (no dashboard-card slop): **Problematic Concepts** (ranked list with mastery distribution mini-bars), **Student Watchlist** (table: name, declining concepts, last active), **Engagement** (3 plain stat figures), **Actions** (remediation-quiz + study-guide shortcuts into existing flows).
- Concept drill-down sheet: distribution, trend sparkline, most-missed questions with correct-rate %.

### Out-of-Code
- [ ] Role audit: ensure tutors have `teacher` role + `tutor_courses` rows in production data (admin task, existing screens).

### Test Metrics
| Metric | Target | How to measure |
|---|---|---|
| Diagnostic accuracy | Seeded cohort (20 students, deliberately weak on 2 known concepts) → those 2 concepts ranked top-2 | Seed script |
| Privacy/scope | Tutor of course A gets 403 on course B analytics | API test |
| Load cost | Dashboard reads snapshot only: 0 heavy aggregates, 0 AI calls on page view; p95 < 500 ms | Timing + query log |
| Actionability loop | "Generate remediation quiz" lands in weekly-generate with concept tags pre-filled and completes end-to-end | Manual walkthrough |
| Snapshot freshness | Snapshot < 26 h old, or refresh button produces a new one < 10 s | Dashboard check |

---

## Phase 7 — Storage Migration: UploadThing → Cloudflare R2

**Goal:** all *new* binary assets (diktat PDFs, future generated assets, then user uploads) live on R2 (10 GB free, zero egress) behind one storage interface; UploadThing free tier (2 GB) stops being a growth ceiling.

### Backend
1. **Storage adapter** (`lib/storage.ts`): `{ put(key, body, contentType), getSignedUrl(key)/publicUrl(key), delete(key) }` with R2 implementation via S3-compatible API (`@aws-sdk/client-s3` or lighter `aws4fetch`) using existing `R2_*` env vars. Key convention: `diktats/{courseId}/{diktatId}.pdf`, `uploads/{driveItemId}/{filename}`.
2. **Cutover order (safe → risky):**
   - a. Diktat PDF output (`lib/diktat-actions.ts` upload step) → R2. Old UploadThing URLs keep working; cleanup logic branches by URL prefix.
   - b. New admin-drive uploads (`drive_item`): add `storageProvider ('uploadthing'|'r2')` + `r2Key` columns; new uploads → R2 via presigned-PUT route (`POST /api/storage/presign`, admin-guarded); viewer resolves URL by provider.
   - c. Backfill migration script (`scripts/migrate-uploadthing-to-r2.ts`): stream each UploadThing file → R2, verify size/hash, update row, log; idempotent + resumable; run in batches. Delete from UploadThing only after a full verification pass (separate second script — never in the same run).
3. Material viewer / download links read through the adapter's URL resolver (one resolver function, used everywhere a file URL is rendered).

### Frontend
- Drive explorer upload path switches to presigned-PUT flow (progress bar via XHR upload events). No visual changes otherwise.

### Out-of-Code
- [ ] R2 bucket CORS rules: allow PUT/GET from the app origin(s) (R2 dashboard → bucket → Settings → CORS).
- [ ] Public access: enable R2 public dev URL or connect `assets.{yourdomain}` custom domain; set `R2_PUBLIC_URL`.
- [ ] After backfill verification: run the UploadThing deletion script, then downgrade/abandon UploadThing plan.
- [ ] Monitor R2 dashboard: storage GB + Class A ops vs free tier after 1 week.

### Test Metrics
| Metric | Target | How to measure |
|---|---|---|
| New-asset path | Freshly compiled diktat URL serves from R2 and renders in the PDF viewer | Compile one diktat end-to-end |
| Zero broken legacy links | 100% of pre-migration `drive_item`/diktat URLs still resolve (link-checker script over all DB file URLs, HTTP 200) | `scripts/check-file-links.ts` before & after |
| Backfill integrity | Byte-size (and hash where available) match for every migrated object; 0 unverified rows | Migration script report |
| Upload UX | 10 MB PDF upload via presigned flow succeeds with visible progress; key lands in DB | Manual test |
| Rollback | Flipping new-upload flag back to UploadThing works (adapter still has UT impl until cleanup) | Manual flag flip in preview |

---

## Phase 8 — Vector DB Migration: Pinecone → Cloudflare Vectorize (conditional)

**Goal:** retrieval runs on Vectorize, consolidating the stack on Cloudflare and removing the Pinecone dependency — **executed only if the size check passes.**

**Go/No-Go gate (do this first):** Vectorize free tier ≈ 5M stored dimensions = **~6,500 vectors at 768 dims**, and 30M queried dims/mo ≈ ~39k topK-aware queries. Count your vectors (Pinecone dashboard / `vector_sync_queue` completed rows). If stored vectors > ~5,500 or projected queries exceed the budget → **defer this phase** (Pinecone Starter's 2 GB is roomier) and revisit; everything else in this plan works unchanged thanks to the Phase-3 adapter.

### Backend
1. **Vectorize access path**: Vectorize has no public REST data-plane for Next.js — create a minimal **Cloudflare Worker** (`workers/vector-api/`) exposing `POST /query`, `POST /upsert`, `POST /delete` with a shared-secret header, bound to the Vectorize index. (~100 lines; this is also your first deployed Worker, paving Phase 9.)
2. **Adapter implementation**: `VectorizeStore` implementing the Phase-3 interface, calling the Worker. Namespace-per-course maps to Vectorize namespaces (supported) or a `courseId` metadata filter.
3. **Dual-write window**: env flag `VECTOR_STORE=pinecone|vectorize|dual`. In `dual`, the existing Inngest sync worker writes to both; reads stay on Pinecone.
4. **Backfill**: script re-syncs all KOs/chunks (re-embedding via existing `embedTexts`, or export vectors from Pinecone and re-upsert to skip embedding cost — prefer export to save Gemini quota).
5. **Read cutover**: shadow-compare first (log top-5 IDs from both stores for 50 real queries; overlap@5 ≥ 80%) → flip reads → 1 week soak → remove Pinecone writes.

### Frontend
- None.

### Out-of-Code
- [ ] `wrangler` deploy of `vector-api` Worker (free plan); create Vectorize index: `wrangler vectorize create zyx-edu --dimensions=768 --metric=cosine`.
- [ ] Secrets: `wrangler secret put SHARED_SECRET`; add matching env var to Vercel.
- [ ] Monitor Vectorize dashboard query-dimension usage weekly during soak.
- [ ] After soak: delete Pinecone index, remove keys.

### Test Metrics
| Metric | Target | How to measure |
|---|---|---|
| Go/No-Go | Documented vector count + monthly query estimate inside free tier | One-paragraph note in `docs/baselines.md` |
| Backfill parity | Vectorize record count == Pinecone record count | Both dashboards |
| Retrieval parity | overlap@5 ≥ 80% on a 50-query shadow set; tutor eval set (Phase 3) still scores ≥ 18/20 grounded | Shadow logs + re-run eval |
| Latency | Vectorize query path p95 ≤ Pinecone p95 + 100 ms | Timing logs |
| Clean removal | `grep -ri pinecone lib app` → only the dead adapter file scheduled for deletion | Code review |

---

## Phase 9 — Real-Time Classroom (Durable Objects Live Quiz)

**Goal:** a tutor starts a Live Quiz Session; up to 100 students join with a code, answer questions in sync, and watch a live leaderboard/presence — learning that feels like an event, not a static page.

### Backend (new Cloudflare Worker project: `workers/realtime/`)
1. **`LiveQuizRoom` Durable Object** (SQLite-backed — required for the free plan): holds `{sessionState ('lobby'|'question'|'reveal'|'ended'), currentQuestionIndex, deadlineTs, participants {userId, name, score, connected}, answers per question}`; persists state to DO storage on every transition so a DO restart mid-session recovers.
2. **WebSocket protocol** (use **WebSocket Hibernation API** — critical: hibernation makes idle connections free, keeping 100 sockets inside free-tier compute): client→server `join {token}`, `answer {questionIndex, choice, clientTs}`; server→client `lobby_update`, `question {prompt, options, deadline}` (**no correct answer sent until reveal**), `reveal {correctIndex, perOptionCounts}`, `leaderboard {top10, yourRank}`, `ended {finalBoard}`.
3. **Scoring** in the DO: base points + linear time bonus from server-received timestamp (never trust `clientTs` for scoring; it's diagnostics only).
4. **Auth handoff**: Next.js endpoint `POST /api/live/sessions` (tutor-only) creates a session row + 6-char join code, picks a published quiz template, snapshots its questions into the DO via an authenticated init call; `POST /api/live/join` validates the student session + enrollment and returns a short-lived signed token (HMAC, 60 s) the Worker verifies on WebSocket upgrade — the Worker never needs Better-Auth.
5. **Persistence on end**: DO posts final results back to a Next.js callback (shared secret) → rows in new `live_quiz_sessions` + `live_quiz_results` tables → feeds `learning_events` (Phase 1) so live answers update mastery too.
6. **Limits**: cap 150 participants/room (1 DO = 1 room is the scaling unit); rate-limit answer messages (1 per question per user).

### Frontend
1. **Tutor console** (`app/courses/[id]/live/host/`): create session → lobby with join code (large `font-heading` code) + live participant count → controls: start / next question / reveal / end → per-question answer-distribution bars → final leaderboard.
2. **Student view** (`app/courses/[id]/live/`): join-code entry → lobby → fullscreen question with countdown (reuse quiz-player option styling) → reveal (correct highlighted, your-answer marker) → animated leaderboard between questions (top 10 + "your rank: #23").
3. Shared `useLiveQuizSocket` hook: reconnect with exponential backoff; on reconnect server replays current state (state-sync message) so refresh mid-quiz recovers.
4. Connection indicator (1:1 circular dot — allowed `rounded-full`).

### Out-of-Code
- [ ] Deploy `workers/realtime` via wrangler (free plan; DOs must use `new_sqlite_classes` migration to be free-tier eligible).
- [ ] Route/domain: `realtime.{yourdomain}` or workers.dev subdomain; set `NEXT_PUBLIC_REALTIME_URL` + shared `LIVE_HMAC_SECRET` in both Vercel and `wrangler secret`.
- [ ] Load-test from a machine: scripted 100 WebSocket clients (e.g. `k6` or a Node script) joining one room, answering 10 questions.
- [ ] Monitor Workers free-tier daily request count during pilot (100k/day; each WS upgrade = 1 request, hibernated messages are cheap).

### Test Metrics
| Metric | Target | How to measure |
|---|---|---|
| Capacity | 100 simulated clients in 1 room: all receive each `question` broadcast within 1 s of send | Load-test script timestamps |
| Answer integrity | Correct answer never present in client traffic before `reveal` | Inspect WS frames in devtools |
| Recovery | Mid-question page refresh rejoins with state + score intact; DO eviction (redeploy mid-session) recovers from storage | Manual + redeploy test |
| Score correctness | Deterministic replay: scripted answer set produces expected leaderboard | Assertion in load-test |
| Persistence | Ended session → results rows + `learning_events` written; mastery recompute fires | DB assertion |
| Free-tier fit | Pilot day (3 sessions × 30 students) stays < 20% of daily Workers request quota | CF dashboard |

---

## Phase 10 — Hardening, Observability & Cost Control

**Goal:** the whole system is observable, budget-safe, and degrades gracefully — you can see every AI request, every cache hit, and every quota at a glance, and nothing user-facing breaks when a free tier throttles.

### Backend
1. **Admin Ops page** (`app/admin/ops/`) aggregating: Gemini req/day + cache-hit % (query AI Gateway GraphQL analytics API), KV read/write counters, `ai_usage_events` rollups per feature, Inngest failures (last 24 h via their API or a DB error log), vector sync queue depth, intervention/recommendation job health.
2. **Graceful degradation matrix** (implement + test each):
   - Gemini quota exhausted → tutor returns cached/ungrounded notice + "try again later"; feedback generation queues for retry via Inngest instead of failing the submission.
   - KV unreachable → silent cache bypass (timeout 1.5 s, log, continue).
   - Vector store down → tutor answers ungrounded with notice; question generation job fails visibly in admin jobs UI (already has status tracking).
   - Realtime Worker down → live pages show "sessions unavailable"; rest of app unaffected.
3. **Per-feature budget config** centralized (extend `usage-budget-service.ts`): tutor 30/day (existing), feedback 1/submission, summaries 5/day/user — all values in one config object, surfaced read-only on the Ops page.
4. **Eval regression harness**: `scripts/run-evals.ts` re-runs the Phase-3 tutor eval set + Phase-5 path property checks + Phase-2 streak scenarios against a seeded DB; run before each deploy of AI-touching code.

### Frontend
- Ops page (admin-only), typography-first stat layout; red/amber/green status text via `text-status-*` tokens.
- User-facing fallback states for each degradation row above (small `text-muted-foreground` notices, no error walls).

### Out-of-Code
- [ ] AI Gateway: create an authenticated gateway token for the analytics GraphQL API.
- [ ] Set up free uptime monitoring (e.g. UptimeRobot free / Cloudflare Health Checks) on: app root, `/api/student/today`, realtime Worker health route.
- [ ] Calendar reminder (monthly): review CF + Turso + Inngest + Gemini usage dashboards against the inventory table in §1; update `docs/baselines.md`.

### Test Metrics
| Metric | Target | How to measure |
|---|---|---|
| Observability completeness | Ops page shows live numbers for all 6 panels with < 5 min staleness | Visual check vs provider dashboards |
| Degradation drills | All 4 failure modes simulated (bad API key / blocked egress) → documented graceful behavior, 0 unhandled 500s | Drill checklist run once |
| Eval harness | `bun scripts/run-evals.ts` green in < 5 min, wired into pre-deploy habit | Run it |
| Quota headroom | Steady-state usage ≤ 60% of every free-tier line in §1 | Monthly review row in baselines doc |

---

## Phase Dependency Graph

```text
P0 Infra ─┬─→ P1 Mastery ─┬─→ P2 Recommendations + Streak ─→ P5 Study Paths
          │               ├─→ P4 Feedback + Interventions ──┘      │
          │               └─→ P6 Tutor Dashboard                   │
          ├─→ P3 RAG Tutor + KV  (independent of P1; do in parallel with P1/P2 if desired)
          ├─→ P7 R2 Migration    (independent; any time after P0)
          ├─→ P8 Vectorize       (requires P3's adapter; conditional on size gate)
          └─→ P9 Realtime        (requires P0 wrangler setup; P1 only for mastery write-back)
P10 Hardening — last, touches everything
```

**Recommended execution order:** P0 → P1 → P3 → P2 → P4 → P5 → P6 → P7 → P9 → P8(if gate passes) → P10. (P3 before P2 so the tutor improvements ship early and KV plumbing exists for P4's feedback cache.)

## Risk Register

| Risk | Phase | Mitigation already in plan |
|---|---|---|
| Gemini free tier (≈250 req/day) too small once feedback + summaries launch | 3, 4 | KV + Gateway caching, batched feedback calls, rule-based (0-AI) recommendation/path engines; budget config in P10 |
| KV 1k writes/day ceiling | 3 | write-budget guard skips cache writes past 900/day (reads unaffected) |
| Vectorize free tier too small for corpus | 8 | explicit Go/No-Go gate; adapter makes deferral free |
| Sparse prerequisite edges → study paths degrade to chapter order | 5 | content audit task + graceful fallback; coverage % visible in admin |
| Durable Objects free tier specifics shift | 9 | SQLite-backed DOs required; load test before pilot; feature-flagged |
| UploadThing→R2 backfill data loss | 7 | verify-before-delete two-script policy, idempotent + resumable migration, link-checker before/after |
| Inngest 50k steps/mo with new mastery events | 1 | event batching (1 recompute per session, not per answer); monitor usage week 1 |

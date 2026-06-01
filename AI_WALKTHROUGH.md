# ZYX Academy — AI Assessment Ecosystem Walkthrough

Complete setup guide and task checklist for the AI-powered quiz generation system.

---

## Architecture at a Glance

```
Material Text
    └─► Ingestion Parser (chunk 1000–2000 chars, 15% overlap)
            └─► Gemini text-embedding-004 (768-dim vectors)
                    └─► Pinecone (vector index, namespaced per course)
                            └─► Generation Pipeline (Gemini Flash, RAG)
                                    └─► Question Bank (ai_question_bank)
                                            └─► Quiz Templates
                                                    └─► Student Attempts
```

---

## Phase Checklist

### Phase A — Database Foundation
- [x] Added 8 new enums to `db/schema.ts`
- [x] Added 7 new tables to `db/schema.ts`
  - [x] `ai_material_instances`
  - [x] `ai_material_instance_sections`
  - [x] `ai_material_instance_chunks`
  - [x] `ai_generation_jobs`
  - [x] `ai_question_bank`
  - [x] `quiz_templates`
  - [x] `student_quiz_attempts`
- [x] Indexes: GIN on `tags`, partial on completed attempts, selection composite index
- [x] Migration generated → `drizzle/0003_cultured_vin_gonzales.sql`
- [x] Migration applied to live database via `drizzle-kit push`

### Phase B — Ingestion Parser
- [x] Created `lib/ingestion-parser.ts`
  - [x] Heading-based section splitting (`##` / `###`)
  - [x] Chunk sizing: 1,000–2,000 chars with 15% sliding overlap
  - [x] Sentence-boundary-aware break points
  - [x] Short remainder merging (prevents tiny trailing chunks)

### Phase C — Gemini Integration
- [x] Extended `lib/gemini.ts`
  - [x] `embedText(text)` — single 768-dim vector via `text-embedding-004`
  - [x] `embedTexts(texts[])` — parallel batch embedding
  - [x] `withGeminiRetry(fn)` — exponential backoff (1s–30s, max 5 retries)

### Phase D — Pinecone Sync Engine
- [x] Installed `@pinecone-database/pinecone` v7
- [x] Created `lib/pinecone.ts`
  - [x] Namespace per course: `course_{courseId}`
  - [x] `upsertChunkVector` — embed + upsert on chunk create
  - [x] `updateChunkVector` — re-embed + overwrite on chunk edit
  - [x] `deleteChunkVector` — single vector delete
  - [x] `deleteSectionVectors` — batch delete by ID list
  - [x] `queryChunks` — Top-K cosine similarity search

### Phase E — Generation Pipeline
- [x] Created `lib/generation-pipeline.ts`
  - [x] `startGenerationJob` — creates DB job row, fires pipeline async
  - [x] Job workflow: `pending → processing → completed / failed`
  - [x] Pinecone Top-K retrieval → PostgreSQL chunk hydration
  - [x] Gemini Flash structured JSON generation
  - [x] Zod schema validation with one auto-retry on malformed output
  - [x] Token usage tracked in `ai_generation_jobs.token_usage`
- [x] `POST /api/admin/material-instances` — ingest raw text
- [x] `GET  /api/admin/material-instances` — list instances
- [x] `POST /api/admin/generation-jobs` — start generation job
- [x] `GET  /api/admin/generation-jobs` — list jobs
- [x] `GET  /api/admin/generation-jobs/[id]` — poll single job status

### Phase F — Question Bank API
- [x] `GET /api/admin/questions` — list with filters (course, status, difficulty)
- [x] `PUT /api/admin/questions` — bulk status transition
- [x] `GET /api/admin/questions/[id]` — single question
- [x] `PUT /api/admin/questions/[id]` — edit prompt, options, explanation, tags
- [x] `DELETE /api/admin/questions/[id]` — soft-retire (preserves historical attempts)

### Phase G — Admin UI
- [x] Updated `app/admin/page.tsx` — 3 new AI management cards added
- [x] `app/admin/ai/materials/` — upload raw text, browse instances
- [x] `app/admin/ai/jobs/` — create jobs, refresh status, view error logs
- [x] `app/admin/ai/questions/` — filter, bulk-select, publish/retire questions

### Phase H — Daily Quiz (Zero Cost)
- [x] `GET  /api/quiz/daily` — pulls 5 published questions (2 easy, 2 medium, 1 hard)
- [x] `POST /api/quiz/daily` — submit answers, auto-grade, save deep snapshot
- [x] Increments `use_count` on answered questions
- [x] No Gemini or Pinecone calls — pure DB query

### Phase I — Weekly Quiz (Cost-Aware)
- [x] `POST /api/quiz/templates` — create a named quiz template
- [x] `GET  /api/quiz/templates` — list (students see free only)
- [x] `POST /api/quiz/weekly-generate` — smart routing:
  - If bank has ≥ N published questions → create template immediately (no Gemini)
  - If bank has < N → trigger generation pipeline, return `jobId` for polling
- [x] `POST /api/quiz/attempts` — start attempt, build question set from bank, deep snapshot
- [x] `GET  /api/quiz/attempts` — list student's own attempts
- [x] `GET  /api/quiz/attempts/[id]` — get single attempt
- [x] `POST /api/quiz/attempts/[id]` — submit answers, auto-grade

### Phase J — Leaderboard Integration
- [x] `app/courses/[id]/leaderboard/page.tsx` — live query on `student_quiz_attempts`
- [x] `app/leaderboard/page.tsx` — global `/leaderboard` page (per enrolled course)
- [x] Trophy link added to student sidebar
- [x] Phase 1 strategy: direct dynamic aggregation (no cache, no materialized view)

### Phase K — Analytics & Monitoring
- [x] `GET /api/admin/analytics` — returns:
  - Question bank breakdown by `review_status` with avg quality score
  - Generation job stats: count, total tokens, questions generated
  - Attempt stats: count by status, average score

---

## Setup Tasks (Action Required)

### 1. Create a Pinecone Account & Index

- [ ] Sign up at https://app.pinecone.io
- [ ] Create a new **Serverless** index with these settings:
  - **Name**: anything (e.g. `zyx-edu`)
  - **Dimensions**: `768`
  - **Metric**: `Cosine`
  - **Cloud**: any region (ap-southeast-1 recommended for latency)
- [ ] Copy your **API Key** from the Pinecone dashboard

### 2. Add Environment Variables

Open `.env` and fill in:

```env
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=zyx-edu
```

Then restart the dev server:

```bash
npm run dev
```

### 3. Verify the Setup

Run a quick sanity check by opening the app and navigating to:

- `/admin` — confirm the 3 new AI cards appear (Materi AI, Generasi Soal, Bank Soal)
- `/admin/ai/materials` — page loads without errors
- `/leaderboard` — page loads (will show empty state if no attempts yet)

---

## Admin Workflow

### Step 1 — Ingest a Material

Go to **Admin → Materi AI** → click "Tambah Materi"

Fill in:
- **Kursus**: select the target course
- **Tipe Sumber**: `markdown` for pasted text
- **Judul Materi**: e.g. "Limit dan Kekontinuan — Bab 3"
- **Ringkasan**: short description for the AI context
- **Teks Materi Lengkap**: paste your Markdown content. Use `##` and `###` headings to divide sections.
- **Keywords**: comma-separated topic tags

Click **"Simpan & Ingest ke Pinecone"**. The system will:
1. Parse the text into sections + chunks
2. Save to PostgreSQL
3. Fire async Pinecone vector upserts in the background

### Step 2 — Generate Questions

Go to **Admin → Generasi Soal** → click "Buat Job Baru"

Fill in:
- **Kursus**: must match the course from Step 1
- **Topik / Query**: natural language topic (e.g. "Limit fungsi trigonometri")
- **Difficulty**: Mixed / Easy / Medium / Hard
- **Jumlah Soal Target**: e.g. 20 (generates 2× for curation)

Click **"Jalankan Pipeline"**. The job starts in the background. Click the **↻** refresh button to poll its status. When `completed`, the questions are in the bank.

### Step 3 — Review & Publish Questions

Go to **Admin → Bank Soal**

- Filter by **Generated** to see newly created questions
- Click the expand arrow (▼) on any question to read the full prompt, options, and explanation
- Tick checkboxes to select questions
- Click **→ published** to make them live for student quizzes

Questions must be **published** before they appear in any quiz.

### Step 4 — Create a Quiz Template (Weekly Quiz)

Call the API or build a UI trigger:

```bash
POST /api/quiz/weekly-generate
{
  "courseId": "your-course-id",
  "title": "Kuis Minggu 3 — Limit",
  "topic": "Limit fungsi",
  "targetCount": 10,
  "difficulty": "mixed"
}
```

Response:
- `mode: "bank_reuse"` + `templateId` → ready immediately
- `mode: "generation_triggered"` + `jobId` → wait for generation, then create template

---

## Student Workflow

### Daily Quiz
1. The student navigates to the dashboard
2. System auto-selects 5 published questions from enrolled courses
3. Student answers and submits
4. Score is recorded in `student_quiz_attempts`
5. Result appears on `/leaderboard`

### Weekly / Chapter Quiz
1. Student navigates to `/courses/[id]/quiz`
2. Sees published quiz templates
3. Starts an attempt: `POST /api/quiz/attempts { templateId }`
4. Answers questions (correct indices are hidden server-side)
5. Submits: `POST /api/quiz/attempts/[id]` with their answers
6. Gets score back immediately

---

## Question Lifecycle

```
generated  (AI output, unreviewed)
    │
    ▼
reviewed   (admin has read and approved quality)
    │
    ▼
published  ◄──── active in quizzes ────►  flagged (reported for issues)
    │
    ▼
retired    (soft-deleted, kept for historical attempt records)
```

Only **published** questions appear in quiz selection queries.  
**Retired** questions are excluded from selection but preserved so old attempt snapshots still make sense.

---

## Cost Model

| Action | Gemini API | Pinecone |
|--------|-----------|---------|
| Ingest material | ✅ embeddings only (`text-embedding-004`) | ✅ upserts |
| Generate questions | ✅ Flash + embeddings | ✅ query |
| Daily quiz | ❌ zero cost | ❌ zero cost |
| Weekly quiz (bank reuse) | ❌ zero cost | ❌ zero cost |
| Weekly quiz (new generation) | ✅ Flash + embeddings | ✅ query |

---

## Leaderboard Scaling Roadmap

| Phase | When | Implementation |
|-------|------|---------------|
| **Phase 1 (current)** | < 5,000 students | Direct `SELECT AVG(score)` on attempts table |
| **Phase 2** | 5,000–20,000 students | PostgreSQL Materialized View, refreshed hourly |
| **Phase 3** | > 20,000 students | `user_leaderboard_stats` table updated on attempt completion |

---

## New Routes Summary

| Route | Method | Who | Description |
|-------|--------|-----|-------------|
| `/api/admin/material-instances` | GET, POST | Admin | Browse / ingest materials |
| `/api/admin/generation-jobs` | GET, POST | Admin/Teacher | List / start generation jobs |
| `/api/admin/generation-jobs/[id]` | GET | Admin/Teacher | Poll job status |
| `/api/admin/questions` | GET, PUT | Admin/Teacher | List questions, bulk status update |
| `/api/admin/questions/[id]` | GET, PUT, DELETE | Admin/Teacher | Single question CRUD |
| `/api/admin/analytics` | GET | Admin | Question bank + job + attempt metrics |
| `/api/quiz/daily` | GET, POST | Student | Fetch daily questions / submit |
| `/api/quiz/templates` | GET, POST | All / Admin | List templates / create |
| `/api/quiz/weekly-generate` | POST | Admin/Teacher | Cost-aware weekly quiz creation |
| `/api/quiz/attempts` | GET, POST | Student | List attempts / start new attempt |
| `/api/quiz/attempts/[id]` | GET, POST | Student | Get attempt / submit answers |
| `/admin/ai/materials` | page | Admin | Material instance manager |
| `/admin/ai/jobs` | page | Admin | Generation job dashboard |
| `/admin/ai/questions` | page | Admin | Question bank curation UI |
| `/leaderboard` | page | Student | Global per-course leaderboard |

---

## Files Created / Modified

### New Files
- `lib/ingestion-parser.ts`
- `lib/pinecone.ts`
- `lib/generation-pipeline.ts`
- `app/api/admin/material-instances/route.ts`
- `app/api/admin/generation-jobs/route.ts`
- `app/api/admin/generation-jobs/[id]/route.ts`
- `app/api/admin/questions/route.ts`
- `app/api/admin/questions/[id]/route.ts`
- `app/api/admin/analytics/route.ts`
- `app/api/quiz/daily/route.ts`
- `app/api/quiz/templates/route.ts`
- `app/api/quiz/weekly-generate/route.ts`
- `app/api/quiz/attempts/route.ts`
- `app/api/quiz/attempts/[id]/route.ts`
- `app/admin/ai/materials/page.tsx`
- `app/admin/ai/materials/materials-client.tsx`
- `app/admin/ai/jobs/page.tsx`
- `app/admin/ai/jobs/jobs-client.tsx`
- `app/admin/ai/questions/page.tsx`
- `app/admin/ai/questions/questions-client.tsx`
- `app/leaderboard/page.tsx`
- `drizzle/0003_cultured_vin_gonzales.sql`

### Modified Files
- `db/schema.ts` — 7 new tables, 8 new enums
- `lib/env.ts` — added `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`
- `lib/gemini.ts` — added `embedText`, `embedTexts`, `withGeminiRetry`
- `app/admin/page.tsx` — 3 new AI management cards
- `app/courses/[id]/leaderboard/page.tsx` — live DB query
- `components/student-sidebar.tsx` — Trophy / Peringkat nav link
- `.env` — placeholder comments for Pinecone keys

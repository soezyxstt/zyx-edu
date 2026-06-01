# Technical Implementation Roadmap: AI-Powered Assessment Ecosystem (Revised)
**Target System:** ZYX Academy  
**Author:** Senior Technical Lead  

This document details the revised, dependency-ordered technical implementation roadmap for the AI assessment ecosystem. Each phase builds upon validated backend APIs and pipelines before constructing the UI layer to prevent premature design assumptions and minimize structural refactoring.

---

## 1. Sequence Diagram of Phases

```
[ Phase A: Database Foundation ]
               │
               ▼
[ Phase B: Material Instance System ]
               │
               ▼
[ Phase C: Gemini Integration ] ────► [ Phase D: Pinecone Integration (Sync) ]
                                                   │
                                                   ▼
                                    [ Phase E: Generation Pipeline ]
                                                   │
                                                   ▼
                                    [ Phase F: Question Bank System ]
                                                   │
                                                   ▼
                                    [ Phase G: Tutor & Admin UI ]
                                                   │
                                                   ▼
                                    [ Phase H: Progress-Linked Daily Quiz ]
                                                   │
                                                   ▼
                                    [ Phase I: Cost-Aware Weekly Quiz ]
                                                   │
                                                   ▼
                                    [ Phase J: Leaderboard Integration ]
                                                   │
                                                   ▼
                                    [ Phase K: Analytics & Monitoring ]
```

---

## 2. Phase-by-Phase Roadmap

### Phase A: Database Foundation
*   **Goals**: Deploy PostgreSQL schema migrations for the AI Knowledge Domain without impacting the existing Learning Content Domain.
*   **Affected Files**:
    *   [db/schema.ts](file:///d:/ZYX/web/zyx-edu/db/schema.ts) (Add new AI structures)
*   **New Tables**:
    *   `ai_material_instances` (summaries, keywords, objectives)
    *   `ai_material_instance_sections`
    *   `ai_material_instance_chunks`
    *   `ai_generation_jobs`
    *   `ai_question_bank` (review_status: generated, reviewed, published, flagged, retired)
    *   `quiz_templates`
    *   `student_quiz_attempts` (questions_snapshot storing full JSON objects)
*   **New APIs**: None.
*   **Testing Strategy**:
    *   Execute mock schema generation and dry-run migrations against local PostgreSQL databases.
*   **Deployment Considerations**:
    *   Deploy migrations during off-peak hours. Maintain backward-compatible defaults.

---

### Phase B: Material Instance System
*   **Goals**: Build the content parser that reads raw material sources and splits them into sections and chunks (1,000–2,000 characters, 15% overlap) in PostgreSQL.
*   **Affected Files**: None (create ingestion helper `/lib/ingestion-parser.ts`).
*   **New Tables**: None.
*   **New APIs**:
    *   `/api/admin/material-instances` (POST - parse raw text into database chunks)
*   **Testing Strategy**:
    *   Assert character length limits on output chunks and check for overlapping text slices at borders.
*   **Deployment Considerations**:
    *   Avoid blocking the main thread by executing heavy parsing asynchronously.

---

### Phase C: Gemini Integration
*   **Goals**: Establish Gemini Embedding API calls (`@google/genai`) to generate 768-dimensional coordinate vectors.
*   **Affected Files**: None (create SDK wrapper `/lib/gemini.ts`).
*   **New Tables**: None.
*   **New APIs**: None.
*   **Testing Strategy**:
    *   Verify API returns valid, correctly formatted 768-dimension coordinate floats.
*   **Deployment Considerations**:
    *   Implement rate limit triggers to handle API key quotas safely.

---

### Phase D: Pinecone Integration (Sync Engine)
*   **Goals**: Deploy the Pinecone vector search client and implement the **Pinecone Chunk Sync Engine** to synchronize changes between PostgreSQL and Pinecone.
*   **Sync Rules**:
    *   *Create*: Every new chunk creationupserts the embedding vector into Pinecone.
    *   *Update*: Every chunk content update triggers a re-embedding call and updates the vector coordinates in Pinecone.
    *   *Delete*: Every chunk deletion triggers a deletion request in Pinecone.
*   **Affected Files**: None (create client helper `/lib/pinecone.ts`).
*   **New Tables**: None.
*   **New APIs**: None.
*   **Testing Strategy**:
    *   Verify Pinecone indexes are correctly updated on create, update, and delete actions.
*   **Deployment Considerations**:
    *   Enforce metadata filters (e.g., matching `course_id`) during search indexing to restrict query boundaries.

---

### Phase E: Generation Pipeline
*   **Goals**: Implement the asynchronous AI generation job pipeline, using background tasks to generate and validate question banks.
*   **Generation Workflow**:
    ```
    Tutor Request ──► Create Job ──► Queue Job ──► Embed Query ──► Pinecone Search ──►
    Hydrate Text Chunks ──► Gemini Flash ──► Validate JSON Schema ──► Save Question Bank ──► Complete Job
    ```
*   **Affected Files**: None (create pipeline helper `/lib/generation-pipeline.ts`).
*   **New Tables**: None (uses `ai_generation_jobs`).
*   **New APIs**:
    *   `/api/admin/generation-jobs` (POST - creates generation requests, GET - lists active jobs)
    *   `/api/admin/generation-jobs/[id]` (GET - returns specific job logs and errors)
*   **Testing Strategy**:
    *   Unit test failed generations (force Gemini API to timeout) and verify retry logic.
    *   Test JSON Schema validation triggers for corrupted formatting.
*   **Deployment Considerations**:
    *   Run generation API loops on serverless runtimes with extended timeout configurations.

---

### Phase F: Question Bank
*   **Goals**: Set up the central repository for approved questions, tracking statistics and moderation flags.
*   **Affected Files**: None.
*   **New Tables**: None.
*   **New APIs**:
    *   `/api/admin/questions` (GET/PUT/DELETE - curation controls)
*   **Testing Strategy**:
    *   Verify question state logic (`generated` ➔ `reviewed` ➔ `published` ➔ `flagged` ➔ `retired`). Ensure `retired` questions are excluded from search but remain accessible to historical attempt records.
*   **Deployment Considerations**: None.

---

### Phase G: Tutor/Admin UI
*   **Goals**: Build administrative control interfaces for managing material instances, checking generation logs, and approving question pools.
*   **Affected Files**:
    *   [app/admin/page.tsx](file:///d:/ZYX/web/zyx-edu/app/admin/page.tsx) (Add admin navigation hooks)
    *   [app/admin/files/page.tsx](file:///d:/ZYX/web/zyx-edu/app/admin/files/page.tsx) (Update file drive actions)
*   **New Tables**: None.
*   **New APIs**: None.
*   **Testing Strategy**:
    *   Assert that only users with role `admin` or `teacher` are allowed write access to these administration pages.
*   **Deployment Considerations**: None.

---

### Phase H: Progress-Linked Daily Quiz
*   **Goals**: Deliver automated Daily Quizzes to students, selecting questions dynamically from sections they have unlocked in their progress check logs.
*   **Selection Workflow**:
    ```
    Student Login ──► Check Progress Table ──► Find Completed Chapters ──►
    Query Question Bank (Filter by Completed Chapters) ──► Random Selection ──► Start Attempt
    ```
*   **Affected Files**:
    *   [app/dashboard/page.tsx](file:///d:/ZYX/web/zyx-edu/app/dashboard/page.tsx) (Daily quiz dashboard popup)
*   **New Tables**: None.
*   **New APIs**:
    *   `/api/quiz/daily` (GET - pull progress-linked questions, POST - calculate score and save deep attempt snapshots)
*   **Testing Strategy**:
    *   Verify that a student who has only completed Chapter 1 is never presented with questions from Chapter 3.
*   **Deployment Considerations**:
    *   Optimize tag lookups using database GIN indexes to handle concurrent student logins during peak hours.

---

### Phase I: Cost-Aware Weekly Quiz
*   **Goals**: Deploy tutor-triggered template quizzes that leverage the Question Bank to minimize API costs.
*   **Budget Workflow**:
    ```
    Tutor Quiz Request (Topic, Count N)
               │
               ▼
    Check Approved Question Bank (Has >= N questions?)
         ├── Yes ──► Create Quiz Template (Bypass Pinecone & Gemini)
         └── No  ──► Query Pinecone ──► Call Gemini ──► Generate Pool ──► Curate Template
    ```
*   **Affected Files**:
    *   [app/courses/[id]/quiz/page.tsx](file:///d:/ZYX/web/zyx-edu/app/courses/[id]/quiz/page.tsx) (Weekly quiz list)
*   **New Tables**: None.
*   **New APIs**:
    *   `/api/quiz/templates` (POST - creates template configurations)
    *   `/api/quiz/weekly-generate` (POST - runs Generation Pipeline only if target query criteria cannot be met by the existing bank)
*   **Testing Strategy**:
    *   Verify that requests for topics with existing questions successfully bypass Gemini API calls.
*   **Deployment Considerations**: None.

---

### Phase J: Leaderboard Integration
*   **Goals**: Connect student quiz attempt scores dynamically to the existing course leaderboard.
*   **Affected Files**:
    *   [app/courses/[id]/leaderboard/page.tsx](file:///d:/ZYX/web/zyx-edu/app/courses/[id]/leaderboard/page.tsx) (Dynamic score calculations)
*   **New Tables**: None.
*   **New APIs**: None.
*   **Testing Strategy**:
    *   Profile dynamic calculations under load. Verify that in-progress attempts are ignored.
*   **Deployment Considerations**:
    *   Ensure partial indexes are deployed on completed attempts. Plan to transition to materialized views once student threshold values are crossed.

---

### Phase K: Analytics & Monitoring
*   **Goals**: Implement tracing tools to monitor question bank quality, API execution spend, and system failures.
*   **Affected Files**: None (create tracing helper `/lib/monitoring.ts`).
*   **New Tables**: None.
*   **New APIs**:
    *   `/api/admin/analytics` (GET - returns question usage rates, accuracy metrics, and API spend)
*   **Testing Strategy**:
    *   Test aggregate queries on metrics like question failure reports, token usage, and accuracy logs.
*   **Deployment Considerations**: None.

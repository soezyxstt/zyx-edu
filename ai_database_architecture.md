# Database Architecture Design: AI-Powered Assessment Ecosystem (Revised)
**Target System:** ZYX Academy  
**Author:** Senior Database Architect  

This revised database design integrates updates to support multi-chunk embeddings, metadata summary structures, difficulty weight proportions, full lifecycle logging, deep snapshots, queue execution tracking, and a long-term leaderboard performance roadmap.

---

## 1. Final System State Diagram

This diagram displays the data flow mapping learning materials to Pinecone vector spaces and tracing tutor requests to attempt outcomes:

```
Learning Domain
    ↓
ai_material_instances ──(Metadata: Summary, Learning Objectives, Keywords)
    ↓
ai_material_instance_sections
    ↓
ai_material_instance_chunks
    ↓
Pinecone Index Vector Storage

Tutor Request
    ↓
Pinecone Retrieval
    ↓
Gemini API
    ↓
ai_generation_jobs
    ↓
ai_question_bank ──(Lifecycle: generated → reviewed → published → flagged → retired)
    ↓
quiz_templates ──(Selection Rules: Proportioned Difficulty Weights)
    ↓
student_quiz_attempts ──(Snapshot: Full Question Contents)
    ↓
dynamic_leaderboard ──(Roadmap: Direct Query → Materialized View → Cache Table)
```

---

## 2. Relational Table Specifications

### A. `ai_material_instances`
Main metadata model for reusable knowledge assets.
*   `id` (TEXT, Primary Key)
*   `course_id` (TEXT, Foreign Key): References `courses.id` (cascades).
*   `title` (VARCHAR(255), Not Null)
*   `source_type` (VARCHAR(50), Not Null): `'markdown'`, `'json'`, `'pdf_extraction'`.
*   `summary` (TEXT, Not Null): High-level knowledge overview.
*   `learning_objectives` (JSONB, Default '[]'): String array of objectives.
*   `keywords` (JSONB, Default '[]'): Core taxonomy index terms.
*   `created_at` (TIMESTAMP, Default Now)
*   `updated_at` (TIMESTAMP, Default Now)

### B. `ai_material_instance_sections`
Groups chunks chronologically or by subtopic.
*   `id` (TEXT, Primary Key)
*   `material_instance_id` (TEXT, Foreign Key): References `ai_material_instances.id` (cascades).
*   `title` (VARCHAR(255), Nullable)
*   `order_index` (INTEGER, Not Null)
*   `created_at` (TIMESTAMP, Default Now)

### C. `ai_material_instance_chunks` (NEW)
Stores the physical text segments matching Pinecone vectors. Supports slicing a large section into multiple embeddings.
*   `id` (TEXT, Primary Key)
*   `section_id` (TEXT, Foreign Key): References `ai_material_instance_sections.id` (cascades).
*   `chunk_text` (TEXT, Not Null): Text segment context.
*   `order_index` (INTEGER, Not Null)
*   `pinecone_vector_id` (TEXT, Not Null): Key coordinate mapping to Pinecone.
*   `created_at` (TIMESTAMP, Default Now)

### D. `ai_generation_jobs` (NEW)
Tracks the status and health of background AI generation processes.
*   `id` (TEXT, Primary Key)
*   `tutor_id` (TEXT, Foreign Key): References `user.id` (cascades).
*   `course_id` (TEXT, Foreign Key): References `courses.id` (cascades).
*   `status` (VARCHAR(30), Default 'pending'): `'pending'`, `'processing'`, `'completed'`, `'failed'`.
*   `prompt_parameters` (JSONB, Not Null): E.g., target section, difficulty parameters, number of questions.
*   `target_count` (INTEGER, Not Null): Requested question volume.
*   `generated_count` (INTEGER, Default 0): Questions generated successfully.
*   `token_usage` (INTEGER, Default 0): Gemini API execution costs.
*   `error_message` (TEXT, Nullable): Debug logs for failed requests.
*   `created_at` (TIMESTAMP, Default Now)
*   `updated_at` (TIMESTAMP, Default Now)

### E. `ai_question_bank`
Central repository of reusable questions.
*   `id` (TEXT, Primary Key)
*   `course_id` (TEXT, Foreign Key): References `courses.id` (cascades).
*   `source_section_id` (TEXT, Foreign Key): References `ai_material_instance_sections.id` (sets null on delete).
*   `difficulty` (VARCHAR(20), Default 'medium'): `'easy'`, `'medium'`, `'hard'`.
*   `question_type` (VARCHAR(30), Default 'multiple_choice'): `'multiple_choice'`, `'multiple_choices'`.
*   `tags` (JSONB, Default '[]'): String array of tags.
*   `prompt` (TEXT, Not Null)
*   `options` (JSONB, Not Null): Array of exactly 5 strings.
*   `correct_indices` (JSONB, Not Null): Array index numbers.
*   `explanation` (TEXT, Not Null)
*   `review_status` (VARCHAR(30), Default 'generated'): Expanded lifecycle state:
    *   `'generated'`: Newly AI-generated, needs review.
    *   `'reviewed'`: Curated and approved, not yet published.
    *   `'published'`: Live and active in templates.
    *   `'flagged'`: Reported for quality issues.
    *   `'retired'`: Out of active circulation, kept for historical runs.
*   `quality_score` (REAL, Default 1.0)
*   `use_count` (INTEGER, Default 0)
*   `created_at` (TIMESTAMP, Default Now)

### F. `quiz_templates`
Schedules and configures quizzes.
*   `id` (TEXT, Primary Key)
*   `course_id` (TEXT, Foreign Key): References `courses.id` (cascades).
*   `title` (VARCHAR(255), Not Null)
*   `category` (VARCHAR(50), Not Null): `'daily'`, `'weekly'`, `'chapter'`, `'premium'`.
*   `visibility` (VARCHAR(30), Default 'free'): `'free'`, `'paid'`.
*   `time_limit_seconds` (INTEGER, Nullable)
*   `max_attempts` (INTEGER, Nullable)
*   `selection_rules` (JSONB, Not Null): E.g., rule-based parameters supporting difficulty distribution:
    ```json
    {
      "tags": ["limits"],
      "count": 10,
      "difficulty_proportions": {
        "easy": 3,
        "medium": 5,
        "hard": 2
      }
    }
    ```
*   `created_at` (TIMESTAMP, Default Now)
*   `updated_at` (TIMESTAMP, Default Now)

### G. `student_quiz_attempts`
Records user quiz details and locked full-data snapshots.
*   `id` (TEXT, Primary Key)
*   `student_id` (TEXT, Foreign Key): References `user.id` (cascades).
*   `template_id` (TEXT, Foreign Key): References `quiz_templates.id` (cascades).
*   `score` (INTEGER, Nullable)
*   `duration_seconds` (INTEGER, Nullable)
*   `status` (VARCHAR(30), Default 'in_progress'): `'in_progress'`, `'completed'`, `'abandoned'`.
*   `questions_snapshot` (JSONB, Not Null): Deep snapshot of selected questions, preserving original context against bank updates:
    ```json
    [
      {
        "id": "q1",
        "prompt": "Berapakah limit...",
        "options": ["A", "B", "C", "D", "E"],
        "correct_indices": [1],
        "explanation": "Penjelasan..."
      }
    ]
    ```
*   `answers_snapshot` (JSONB, Nullable): Map of question IDs to submitted choice index arrays.
*   `started_at` (TIMESTAMP, Default Now)
*   `submitted_at` (TIMESTAMP, Nullable)

---

## 3. Database Indexes

```sql
-- Chunks Indexing (Chunk list sorting)
CREATE INDEX idx_chunks_section ON ai_material_instance_chunks(section_id, order_index);

-- Job Tracking Indexing
CREATE INDEX idx_jobs_status ON ai_generation_jobs(course_id, status);

-- Question Selection Indexing
CREATE INDEX idx_qbank_selection ON ai_question_bank(course_id, review_status, difficulty, use_count);
CREATE INDEX idx_qbank_tags ON ai_question_bank USING gin(tags);

-- Template Indexing
CREATE INDEX idx_templates_search ON quiz_templates(course_id, category, visibility);

-- Attempt Indexing
CREATE INDEX idx_attempts_student ON student_quiz_attempts(student_id, status);
CREATE INDEX idx_attempts_completed ON student_quiz_attempts(template_id, score) WHERE status = 'completed';
```

---

## 4. Query Optimization & Performance Strategy

### A. Implementing Proportioned Difficulty Selections (Templates to Attempts)
When an attempt is initialized under a weighted ruleset:
1.  Read the `difficulty_proportions` configuration (e.g., Easy: 3, Medium: 5, Hard: 2).
2.  Perform a sub-query for each difficulty category:
    *   Query `ai_question_bank` matching filters (e.g., tags, course, `review_status = 'published'`).
    *   Sort by `use_count ASC` to pick fresh questions.
    *   Limit to the designated proportion (e.g., `LIMIT 3` for Easy).
3.  Combine queries using `UNION ALL`.
4.  Snapshot the resulting selected questions directly into `student_quiz_attempts.questions_snapshot`. This prevents Gemini overhead and resolves tag lookup latency.

---

## 5. Leaderboard Performance Roadmap

We establish a clear scale-based roadmap to handle leaderboard calculations cleanly as the student body grows:

```
[ Phase 1: MVP (< 5k Users) ] ──► [ Phase 2: Growth (5k - 20k Users) ] ──► [ Phase 3: Scale (> 20k Users) ]
      Direct Dynamic Query                Materialized View (Hourly)             Transactional Event Cache
```

### Phase 1: Direct Dynamic Query (Scale: < 5,000 active students)
*   **Implementation**: Execute raw dynamic aggregate queries joining completed quiz attempts and tryouts directly in PostgreSQL.
*   **Performance Mitigation**: Relies on the partial index `idx_attempts_completed` (`WHERE status = 'completed'`) to ignore open sessions.

### Phase 2: Materialized View (Scale: 5,000 to 20,000 active students)
*   **Implementation**: Wrap the ranking aggregate calculation query in a database `Materialized View`.
*   **Performance Mitigation**: Query runs instantly against static materialized rows. The view is updated asynchronously via a cron task (e.g. `REFRESH MATERIALIZED VIEW CONCURRENTLY` every hour).

### Phase 3: Transactional Cache Table (Scale: > 20,000 active students)
*   **Implementation**: Create an active `user_leaderboard_stats` table.
*   **Performance Mitigation**: Stats are updated incrementally inside database transactions when attempts transition to a `completed` state. Leaderboard lookups run as a basic `SELECT ... ORDER BY score DESC LIMIT 100` query, ensuring flat latency curves.

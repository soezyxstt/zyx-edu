# AI Systems Architecture: Cost-Efficient Assessment Generation
**Target System:** ZYX Academy  
**Author:** Senior AI Systems Architect  

This document outlines the AI system architecture, vector indexing designs, retrieval flows, and cost-control strategies for ZYX Academy. It is optimized to deliver low API latency, high question reuse, and minimal LLM cost overhead.

---

## 1. End-to-End AI Assessment Pipeline

The platform uses an asynchronous, ingestion-first RAG pipeline that processes knowledge assets once and stores questions permanently to prevent repeated LLM generation costs.

```
[ Stage 1: Ingestion & Indexing ]
Tutor Material Upload ──► Section Chunking ──► Gemini Embeddings ──► Upsert to Pinecone
                                                                          │
[ Stage 2: Question Pool Generation ]                                      ▼
Tutor Query ──► Vector Search ──► Hydrate Text Chunks ──► Gemini Flash ──► Question Bank
                                                                          │
[ Stage 3: Low-Cost Delivery ]                                            ▼
Quiz Request ──► Dynamic DB Random Selection (Zero LLM Call) ──► Student Attempt
```

### A. Material Ingestion & Chunking
*   Tutors create an `AI Material Instance` (via markdown uploads or note extracts).
*   The ingestion parser splits the text into `Material Instance Sections` (subtopics).
*   Sections are divided into `ai_material_instance_chunks` of 1,000 to 2,000 characters. To prevent context loss at chunk boundaries, a **15% sliding window overlap** is applied.

### B. Embedding & Indexing
*   For each chunk, the system requests a 768-dimension vector coordinate using Gemini's embedding service.
*   The generated vector is indexed in Pinecone, with metadata linking back to the course, chapter, section, and text chunk ID in PostgreSQL.

### C. Bulk Question Pool Generation
*   When a new chapter or material is published, a background worker is triggered via `ai_generation_jobs`.
*   The job batches chunks and prompts Gemini once to generate a large question pool (e.g., 200–500 questions) representing the chapter content.
*   These questions are validated, approved by tutors, and saved permanently to the `ai_question_bank`.

### D. Daily Quiz Delivery (Zero Gemini Cost)
*   When a student takes a Daily Quiz, the system queries the Question Bank directly using PostgreSQL database indexing.
*   Questions are selected dynamically based on matching course tags, difficulty weight ratios, and low `use_count`.
*   This pipeline requires **zero Gemini API or Pinecone calls**, ensuring fast loads at scale.

### E. Weekly Quiz Generation
*   If a tutor requests a Weekly Quiz and the active Question Bank has enough approved questions, the system selects questions from the bank.
*   If the tutor requests new questions, the system runs a Pinecone vector search, retrieves the top relevant text chunks, and requests Gemini to generate $2N$ questions. The tutor selects $N$ to publish and saves the remaining questions to the bank.

---

## 2. Pinecone Vector Context Retrieval Flow

When a tutor requests new questions for a Weekly Quiz or chapter study guide:

```
Tutor Topic Input ──► Gemini Embedding ──► Pinecone Query (Filtered)
                                                    │
                                                    ▼
   Prompt Context Injected ◄── Hydrate Chunks ◄── Top-K Vector Matches
            │
            ▼
   Gemini Flash JSON ──► Schema Validator ──► Permanent Question Bank
```

1.  **Vectorization**: The tutor's query topic is embedded into a 768-dimensional query vector.
2.  **Pinecone Query**: The query vector is sent to the Pinecone index. A metadata filter is applied to restrict the search to the specific `course_id` namespace, preventing cross-course vector scans.
3.  **Top-K Retrieval**: Pinecone returns the `Top-K` (e.g., 10) matching chunk records with their matching cosine similarity scores.
4.  **Context Hydration**: The system maps the returned chunk IDs to the `ai_material_instance_chunks` table in PostgreSQL, retrieving the raw text snippets.
5.  **LLM Execution**: The retrieved text chunks are injected into the prompt context. The system calls Gemini Flash using Structured JSON output schema instructions to build multiple-choice questions.

---

## 3. Pinecone Index Schema

To maximize search speed and lower index costs on the Pinecone Free Tier, we use a structured index metadata schema:

### Index Metrics
*   **Dimensions**: 768 (standard output of Gemini `text-embedding-004`).
*   **Distance Metric**: Cosine Similarity.
*   **Partitioning**: Logical namespaces partitioned by `course_id` (e.g., `course_calc-1`, `course_phy-1`).

### Metadata Document Structure
```json
{
  "course_id": "string",
  "material_instance_id": "string",
  "section_id": "string",
  "chunk_id": "string",
  "chapter_name": "string",
  "keywords": ["string", "string"],
  "difficulty_target": "string"
}
```

---

## 4. Cost Optimization Recommendations

1.  **Lazy Generation**: Prevent on-the-fly generation if the target course has a sufficient pool of approved questions in the `ai_question_bank` for the requested tags.
2.  **Bulk Context Batching**: When generating questions for new chapters, merge contiguous chunks into single, larger LLM calls instead of executing individual requests per chunk. This decreases system prompt overhead and limits base token fees.
3.  **Low-Cost Model Routing**: Standard question embedding tasks use `text-embedding-004` (low token cost). Generative parsing pipelines use Gemini Flash rather than Gemini Pro to keep token costs minimal.
4.  **Vector Search Caching**: If multiple tutors trigger identical search queries, cache the retrieved PostgreSQL IDs for 10 minutes to bypass redundant Pinecone vector queries.
5.  **Audit Logs**: Use the `token_usage` column in `ai_generation_jobs` to monitor and alert on abnormal API consumption.

---

## 5. Failure Handling Strategy

*   **Gemini API Failures / Rate Limits (HTTP 429 / 503)**:
    *   *Handler*: Implement Exponential Backoff with Jitter (minimum wait: 1s, maximum wait: 30s, max retries: 5).
    *   *Fallback*: If retries fail, transition the `ai_generation_jobs` row to `'failed'`, log the exception details in `error_message`, and alert the system administrator.
*   **Malformed JSON Response from LLM**:
    *   *Handler*: Validate the parsed JSON response against the required schema (e.g., ensure the `options` array contains exactly 5 entries).
    *   *Fallback*: If validation fails, discard the output and retry generation once with an adjusted system prompt template.
*   **Zero Results in Pinecone Vector Search**:
    *   *Handler*: Triggers if a new course has no indexed vectors.
    *   *Fallback*: Fall back to a standard PostgreSQL text search over the target course's `ai_material_instance_sections` content columns.
*   **Pinecone API Outage**:
    *   *Handler*: Treat the vector database as transient.
    *   *Fallback*: If Pinecone is unreachable, direct the query to a Postgres Full-Text Search index on `ai_material_instance_chunks(chunk_text)`.

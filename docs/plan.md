# ZYX Academy Content Architecture vNext Plan

## 1. Core Philosophy & Design

Every content asset exists in one of four layers:
```text
┌─────────────────────┐
│ Human Artifacts     │
├─────────────────────┤
│ Canonical Content   │
├─────────────────────┤
│ Structured Knowledge│
├─────────────────────┤
│ AI Products         │
└─────────────────────┘
```

* **Layer 1: Human Artifacts**: Original PDFs uploaded to Cloudflare R2 solely for archival and student reference. AI systems do not parse them directly.
* **Layer 2: Canonical Content**: Verified Markdown documents stored in Turso. Learning Canonical (`calculus_chapter_4.md`) and Assessment Canonical (`uts_2024.md`) are the official academic sources of truth.
* **Layer 3: Structured Knowledge**: Derived objects automatically extracted from Canonical Content. Includes:
  - **Knowledge Objects (Learning)**: concept graph, flashcards, Zyra context.
  - **Assessment Objects**: structured questions, difficulty level, cognitive steps, question type/patterns.
  - **Assessment Profile**: dynamic summary metrics representing the pedagogical identity of a course.
  - **Course Policies**: static teacher-defined policies (allowed patterns, forbidden contexts).
* **Layer 4: AI Products**: Compiled interactive assets (popovers, flashcards, printable diktats, quiz questions) served to students.

---

## 2. Dynamic Profiles, Course Policies, and Dual-Hashing

1. **Course Policies**: Manually configured rules that dictate validator behavior:
   - `maxApplicationLevel` (1-3)
   - `maxEstimatedSteps` (1-5)
   - `forbiddenContexts` (list of banned keywords)
   - `allowedPatterns` (list of approved assessment types)
2. **Assessment Profiles**: Automatically computed metrics derived from all assessment objects of a course:
   - `difficultyDistribution`
   - `commonPatterns`
   - `topContexts` (concept frequencies)
3. **Dual-Hashing System**:
   - `source_hash`: SHA-256 of the markdown content.
   - `derived_hash`: Stable SHA-256 of the active KOs' key attributes.
   - Downstream regeneration is only triggered when `derived_hash` changes.

---

## 3. Execution Pipeline

### A. Pre-Ingestion Canonical Validation
```text
Upload Markdown → Validate Structure & Formulas (KaTeX) → Save MTD → Trigger Extractor
```

### B. Deterministic Assessment Parsing & Ingestion
```text
Assessment Markdown → Deterministic Split (Question Blocks) → Gemini Classification → Save Assessment Objects → Recompute Profile
```

### C. Policy-Guarded Quiz Generation
```text
Quiz Request → Retrieve Profile, Policy, KOs, Historical Questions (Assessment Index) → Generate Draft Questions → Pedagogical Validation (Forbidden Terms & Level Checks) → Question Bank
```

---

## 4. Compile Error Fixes & Build Verification

We will resolve all TypeScript compiler errors identified during typecheck tests to ensure the production build (`npm run build`) succeeds:
1. Fix `updatedAt` type mismatch on `knowledgeObjects` table updates in `actions.ts` and `ko-extractor.ts`.
2. Fix `assessments` list reference mismatch in `materials-client.tsx`.
3. Fix scoping/unresolved variables (`ko` and `blueprint` references) in `question-generator.ts` validation repair checks.
4. Align mock course creation schema in `scripts/test-vnext-flow.ts`.


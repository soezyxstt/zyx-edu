# Implementation Plan: `scripts/import-bundle.ts`

## Overview

A single script that ingests a Bundle V1.1.1 JSON file and populates the ZYX
database. Design follows existing codebase patterns (see compatibility audit).

---

## 1. Reusable Codebase Services

| Service | Location | How to use |
|---------|----------|------------|
| `db` | `../db` (from `scripts/`) | Drizzle instance for all queries |
| `slugify` | `lib/ko-utils.ts` | Slug generation for `websiteMaterials.slug` |
| `randomUUID` | `crypto` (built-in) | All entity PKs |
| `createHash` | `crypto` (built-in) | SHA-256 for `generationHash`, `sourceHash`, `canonicalQuestionHash` |
| `user` schema | `../db/schema` | Lookup/create author by email |
| All other schema | `../db/schema` | 11 target tables |
| `eq`, `and`, `inArray` | `drizzle-orm` | Query building |

**Not reused** (divergent context):

| Service | Why not |
|---------|---------|
| `calculateGenerationHash` from `lib/material-storage.ts` | Queries DB for KOs in chapter — during import, KOs are being inserted *now*. Importer computes hash directly from bundle KO data instead. |
| `approveAndPublish` from `lib/material-storage.ts` | Does compile + coverage + term index + queue vectors. Importer only inserts raw data; post-processing handles the rest. |

---

## 2. Insertion Order (FK-Dependency Resolved)

```
 1. user                      (root — no FKs)
 2. courses                   (root — no FKs)
 3. concepts                  (root — no FKs)
 4. conceptLocalizations      (FK: conceptId)
 5. masterTeachingDocuments   (FK: courseId, createdById → user)
 6. chapters                  (FK: courseId)
 7. knowledgeObjects          (FK: courseId, mtdId, chapterId, conceptId)
 8. websiteMaterials          (FK: courseId, chapterId, sourceMtdId → MTD)
 9. flashcardSets             (FK: courseId, chapterId, sourceMtdId → MTD)
10. flashcards                (FK: setId → flashcardSet, koId → KO [nullable])
11. assessmentSources         (FK: courseId, uploadedByUserId → user)
12. assessmentSourceChapters  (FK: assessmentSourceId, chapterId)
13. assessmentObjects         (FK: sourceId → assessmentSource)
14. knowledgeRelationships    (FK: sourceKoId, targetKoId → KO)
```

### Why MTDs are created per-chapter (before chapters)

The `masterTeachingDocuments` table must be inserted *before* chapters because
neither `knowledgeObjects` nor `websiteMaterials` nor `flashcardSets` have a
direct FK to `chapters` — they FK to `masterTeachingDocuments` and only
indirectly to chapters via their own `chapterId`. However, the importer
creates one MTD *per chapter*, so it needs to iterate chapters to know how
many MTDs to create. This is handled by:

1. Collect chapter metadata (title, order) from bundle
2. Create MTD rows (before chapter rows — MTD has no `chapterId` FK)
3. Create chapter rows (they have `courseId` but no `mtdId`)
4. Map each MTD to its chapter in the reference map

This is safe because MTDs do NOT reference chapters at the schema level.

---

## 3. UUID Generation

### Every entity gets a UUID PK

| Table | PK pattern | Notes |
|-------|-----------|-------|
| `user` | `randomUUID()` | Only if creating new author |
| `courses` | `randomUUID()` | |
| `concepts` | `randomUUID()` | |
| `conceptLocalizations` | `randomUUID()` | |
| `masterTeachingDocuments` | `"mtd-" + randomUUID()` | Prefix for traceability |
| `chapters` | `randomUUID()` | |
| `knowledgeObjects` | `"ko-" + randomUUID()` | Prefix for traceability |
| `websiteMaterials` | `"wm-" + randomUUID()` | |
| `flashcardSets` | `"fset-" + randomUUID()` | |
| `flashcards` | `"fc-" + randomUUID()` | |
| `assessmentSources` | `"asrc-" + randomUUID()` | |
| `assessmentSourceChapters` | `"asc-" + randomUUID()` | Matches existing pattern |
| `assessmentObjects` | `"ao-" + randomUUID()` | |
| `knowledgeRelationships` | `"kr-" + randomUUID()` | |

Prefixes are optional but aid debugging by making IDs self-describing in
logs and error messages. The existing codebase uses both prefixed
(`"asc-" + randomUUID()`) and unprefixed (`randomUUID()`) patterns.

### ID map

Before any insert, build an in-memory `Map<string, string>` that maps every
bundle `$id` to its generated UUID. This is Pass 1 of the reference map.

```typescript
// Pass 1: collect all $id → UUID mappings
const idMap = new Map<string, string>();

// Register course
idMap.set("$course", courseUuid);

// Register each chapter, concept, KO, etc.
for (const chapter of bundle.course.chapters) {
  if (chapter.$id) idMap.set(chapter.$id, chapterUuid);
  for (const concept of (chapter.concepts || [])) {
    if (concept.$id) idMap.set(concept.$id, conceptUuid);
  }
  for (const ko of (chapter.knowledgeObjects || [])) {
    if (ko.$id) idMap.set(ko.$id, koUuid);
  }
}
```

---

## 4. Foreign Key Resolution

### Resolution strategies by entity

| Entity | FK column | Resolution strategy |
|--------|-----------|-------------------|
| `masterTeachingDocuments` | `courseId` | Lookup `idMap.get("$course")` |
| `masterTeachingDocuments` | `createdById` | Lookup author user by email; fall back to system import user UUID |
| `chapters` | `courseId` | Lookup `idMap.get("$course")` |
| `knowledgeObjects` | `courseId` | Lookup `idMap.get("$course")` |
| `knowledgeObjects` | `mtdId` | Lookup chapter→MTD mapping in chapterMtdMap |
| `knowledgeObjects` | `chapterId` | Resolve from parent chapter in bundle tree |
| `knowledgeObjects` | `conceptId` | `concept$ref` → `idMap.get(ref)` or `conceptName` → match by `displayName` |
| `websiteMaterials` | `courseId` | Lookup `idMap.get("$course")` |
| `websiteMaterials` | `chapterId` | Resolve from parent chapter |
| `websiteMaterials` | `sourceMtdId` | Lookup chapter→MTD mapping |
| `flashcardSets` | `courseId` | Lookup `idMap.get("$course")` |
| `flashcardSets` | `chapterId` | Resolve from parent chapter |
| `flashcardSets` | `sourceMtdId` | Lookup chapter→MTD mapping |
| `flashcards` | `setId` | Resolve from parent flashcardSet in bundle tree |
| `flashcards` | `koId` | `ko$ref` → `idMap.get(ref)` or null |
| `assessmentSources` | `courseId` | Lookup `idMap.get("$course")` |
| `assessmentSources` | `uploadedByUserId` | Author user UUID; fall back to system import user UUID |
| `assessmentSourceChapters` | `assessmentSourceId` | Parent `assessmentSource` UUID |
| `assessmentSourceChapters` | `chapterId` | `chapters[]` entry → `idMap.get(ref)` or match by `title` |
| `assessmentObjects` | `sourceId` | Parent `assessmentSource` UUID |
| `knowledgeRelationships` | `sourceKoId` | `sourceKo$ref` → `idMap.get(ref)` |
| `knowledgeRelationships` | `targetKoId` | `targetKo$ref` → `idMap.get(ref)` |

### Reference resolution helper

```typescript
function resolveRef(ref: string, idMap: Map<string, string>): string {
  const uuid = idMap.get(ref);
  if (!uuid) throw new Error(`Unresolvable $ref: "${ref}"`);
  return uuid;
}
```

### Chapter→MTD mapping

Built during Pass 1, before chapter creation:

```typescript
const chapterMtdMap = new Map<string, string>(); // chapter $id → MTD UUID
for (const [index, chapter] of bundle.course.chapters.entries()) {
  const mtdUuid = `mtd-${randomUUID()}`;
  const chapterId = chapter.$id || `$chapter-${index}`;
  chapterMtdMap.set(chapterId, mtdUuid);
  idMap.set(chapterId, randomUUID()); // chapter UUID
  // Store MTD for later insertion
  mtdRows.push({ id: mtdUuid, courseId, ... });
}
```

---

## 5. Hash Generation

### What needs hashing and how

| Entity | Field | Input | Algorithm |
|--------|-------|-------|-----------|
| `websiteMaterials` | `generationHash` | Bundle KO contents for this chapter, sorted by `learningOrder` (array index), formatted as `"${ko.title}:${ko.content}"` joined by `\n` | SHA-256 → hex |
| `flashcardSets` | `generationHash` | Flashcard front/back pairs for this set, sorted by array index, formatted as `"${fc.front}:${fc.back}"` joined by `\n` | SHA-256 → hex |
| `assessmentSources` | `sourceHash` | `sourceMarkdown` field | SHA-256 → hex |
| `assessmentObjects` | `canonicalQuestionHash` | `questionMarkdown` (or auto-extracted question text from `sourceMarkdown`) | SHA-256 → hex |

### Implementation notes

- `generationHash` on `websiteMaterials`: computed from the **bundle's KO data**, not from the DB. This is necessary because during import, the KOs are being inserted now, not already in the DB.
- `sourceHash` on `assessmentSources`: computed from the raw `sourceMarkdown` string.
- `canonicalQuestionHash` on `assessmentObjects`: if `questionMarkdown` is provided, hash it. If not, the importer can extract the question block from `sourceMarkdown` by parsing the markdown sections, or leave it empty (the assessment extractor post-processing can generate it later).

### Hash functions

```typescript
import { createHash } from "crypto";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function computeMaterialHash(kos: BundleKO[]): string {
  const hash = createHash("sha256");
  kos.forEach((ko, i) => {
    hash.update(`${ko.title}:${ko.content}`);
  });
  return hash.digest("hex");
}

function computeFlashcardSetHash(fcs: BundleFlashcard[]): string {
  const hash = createHash("sha256");
  fcs.forEach(fc => {
    hash.update(`${fc.front}:${fc.back}`);
  });
  return hash.digest("hex");
}
```

---

## 6. Post-Processing Hooks

No post-processing runs inside the importer. The importer is a data-loading
tool. Post-processing is handled by existing scripts and services:

| Hook | When to run | Existing tool |
|------|-------------|---------------|
| Compile markdown → AST | After import | `scripts/compile-materials.ts --course <id>` or `postprocess-course.ts --course <id>` |
| Build term index | After compilation | `postprocess-course.ts` or `approveAndPublish()` |
| Verify KO coverage | After compilation | `postprocess-course.ts` or `approveAndPublish()` |
| Build concept graph | After KOs exist | `postprocess-course.ts` |
| Enqueue vector sync | After content is ready | Inngest cron picks up, or `scripts/sync-vectors.ts` |
| Generate flashcards | Content authoring step | Inngest `bulkChapterGenerator` or `lib/flashcard-generator.ts` |
| Generate questions | Content authoring step | Inngest `bulkChapterGenerator` or `lib/question-generator.ts` |
| Ingest past exam objects | Content authoring step | `lib/assessment-extractor.ts` |

### Optional: `--post-process` flag

The importer can offer an opt-in `--post-process` flag that calls the
post-processing pipeline after a successful import:

```bash
bunx tsx scripts/import-bundle.ts bundle.json --post-process
```

When set, after the transaction commits, the importer sequentially calls:

```
for each chapter:
  compileMarkdown(chapter)          // sync, no AI
  verifyKOCoverage(chapter)         // sync, no AI
  buildTermIndex(chapter)           // sync, no AI

for the course:
  buildConceptGraph(course)         // sync, no AI
  queueVectorSync(course)           // writes to vectorSyncQueue table
```

This covers everything that does NOT require AI. Flashcard/question generation
and exam ingestion remain manual steps (they call Gemini).

---

## 7. Transaction Boundaries

### Inside the transaction: all INSERTs

All 14 entity types (steps 1–14 from section 2) are inserted inside a single
`db.transaction()`. This ensures atomicity:

```typescript
const result = await db.transaction(async (tx) => {
  // 1. Insert user (if new)
  // 2. Insert course
  // 3. Insert concepts
  // 4. Insert conceptLocalizations
  // 5. Insert masterTeachingDocuments
  // 6. Insert chapters
  // 7. Insert knowledgeObjects
  // 8. Insert websiteMaterials
  // 9. Insert flashcardSets
  // 10. Insert flashcards
  // 11. Insert assessmentSources
  // 12. Insert assessmentSourceChapters
  // 13. Insert assessmentObjects
  // 14. Insert knowledgeRelationships

  return { courseId, chapterCount, koCount, ... };
});
```

If any insert fails, the entire transaction rolls back. The database is left
in its pre-import state.

### After the transaction

```typescript
// 15. Print summary
console.log(`Import complete: ${result.koCount} KOs, ${result.fcCount} flashcards, ...`);

// 16. Optionally run post-processing
if (opts.postProcess) {
  await runPostProcessing(result.courseId);
}

process.exit(0);
```

### Why everything in one transaction

- FK constraints between entities are enforced in the correct order
- Partial imports are impossible — either the whole course lands or nothing
- Error recovery is trivial: delete the course row and retry
- The existing codebase's seed/test scripts do NOT use transactions, but all
  production services (`lib/ko-extractor.ts`, `lib/material-storage.ts`) do

### Batch sizing

For large bundles (1000+ KOs), chunk within the transaction to avoid SQLite
parameter limits:

```typescript
const BATCH_SIZE = 100;
for (let i = 0; i < koValues.length; i += BATCH_SIZE) {
  await tx.insert(knowledgeObjects).values(koValues.slice(i, i + BATCH_SIZE));
}
```

Drizzle/SQLite handles multi-row inserts efficiently, but very large arrays
may hit bind parameter limits (~32,768 for SQLite, ~65,535 for PostgreSQL).
Chunking at 100 rows per insert is conservative and safe.

---

## 8. Insert Mode Handling: Create / Update / Upsert

### Mode: `create` (default)

Straight `INSERT`. If a unique constraint violation occurs, the transaction
rolls back and the error is reported.

Unique constraints that can fire:

| Table | Unique constraint | Bundle field |
|-------|-------------------|--------------|
| `concepts` | `canonicalSlug` | `concept.canonicalSlug` |
| `conceptLocalizations` | `(conceptId, lang)` | Auto-generated |
| `websiteMaterials` | None on slug alone (schema has no unique on slug) | (no conflict possible) |
| `assessmentSources` | None | (no conflict possible) |

If the same bundle is imported twice, `concepts.canonicalSlug` will violate
the unique constraint on the second run. This is by design for `create` mode.

### Mode: `upsert` (`--upsert`)

Match existing rows by natural key, update if found, insert if not found.
Uses Drizzle's `.onConflictDoUpdate()` where supported, or explicit
check-then-insert.

```typescript
// Pattern for concepts (has unique constraint on canonicalSlug)
await tx.insert(concepts)
  .values(conceptRow)
  .onConflictDoUpdate({
    target: concepts.canonicalSlug,
    set: { isVerified: conceptRow.isVerified },
  });
```

For tables without unique constraints (chapters, KOs, materials, flashcards),
matching by a combination of natural keys:

| Table | Match key |
|-------|-----------|
| `chapters` | `(courseId, orderIndex)` or `(courseId, title)` |
| `knowledgeObjects` | `(chapterId, learningOrder)` or `(chapterId, title)` |
| `websiteMaterials` | `(chapterId, slug)` |
| `flashcardSets` | `(chapterId, title)` |
| `assessmentSources` | `(courseId, category, year, title)` |
| `knowledgeRelationships` | `(sourceKoId, targetKoId, type)` |

Implementation: for each entity, query first, then either `UPDATE` or `INSERT`:

```typescript
if (opts.upsert) {
  const [existing] = await tx.select()
    .from(chapters)
    .where(and(eq(chapters.courseId, courseId), eq(chapters.title, title)))
    .limit(1);

  if (existing) {
    await tx.update(chapters).set(row).where(eq(chapters.id, existing.id));
    chapterId = existing.id;  // reuse existing UUID
  } else {
    await tx.insert(chapters).values(row);
  }
} else {
  await tx.insert(chapters).values(row);
}
```

### Mode: `append` (`--append`)

Uses `.onConflictDoNothing()` to skip existing rows silently. Useful for
seeding multiple bundles into the same database without conflict errors.

```typescript
if (opts.append) {
  await tx.insert(concepts)
    .values(conceptRow)
    .onConflictDoNothing();
} else {
  await tx.insert(concepts).values(conceptRow);
}
```

---

## 9. Recommended MVP Workflow

### Preferred: `create` mode

For the initial implementation and standard usage, `create` mode is the
recommended workflow:

```
validate (--dry-run or --validate)
  ↓
create import (default mode, no flag needed)
  ↓
post-process (--post-process)
  ↓
verify (manual or postprocess-course.ts)
```

**Why `create` is preferred:**

| Concern | `create` mode | `upsert` mode |
|---------|---------------|---------------|
| Content removal | Fresh import has no orphan cleanup concern | Old content persists after removal |
| KO rename | No conflict (new import, fresh state) | Leftover KO with old name |
| Idempotency | Fails fast on `canonicalSlug` conflict | Silent update may mask errors |
| State clarity | Database reflects exactly one import | Accumulates state across runs |
| Error recovery | Rollback + retry is clean | Partial updates may interleave |

### `upsert` is supported but advanced

`upsert` mode (`--upsert`) remains available for:

- Incremental content additions to an already-seeded course
- CI/CD pipelines where the bundle is the single source of truth and content
  removal is not a concern
- Development workflows where iterative re-imports are needed without
  dropping and re-creating the course

**Known limitations of `upsert` mode:**

- Content removed from the bundle is NOT deleted from the database
- KO renames produce orphaned rows (match by `$id` is recommended for KO
  stability)
- The SELECT-then-INSERT/UPDATE pattern (used for tables without unique
  constraints) is not safe under concurrent writes — acceptable for a CLI
  seeding tool, not for API usage

### `append` mode for multi-bundle seeding

`append` mode (`--append`) is intended for loading multiple independent
bundles into the same database (e.g., seeding semester data alongside course
content). It silently skips rows that would violate unique constraints.

---

## 10. Detailed Implementation Plan

### File: `scripts/import-bundle.ts`

#### Phase 0: Setup

```
1. import { loadEnvConfig } from "@next/env"
   loadEnvConfig(process.cwd())
2. import { db } from "../db"
3. import all 14 table schemas from "../db/schema"
4. import { slugify } from "../lib/ko-utils"
5. import { randomUUID, createHash } from "crypto"
6. import { eq, and, inArray } from "drizzle-orm"
```

#### Phase 1: CLI & Validation

```
7. Parse process.argv.slice(2):
   --bundle <path>       (required — path to JSON file)
   --mode <create|upsert|append>  (default: "create")
   --dry-run             (validate only, no DB writes)
   --validate            (validate and exit, same as --dry-run)
   --post-process        (run non-AI post-processing after import)
   --verbose             (detailed logging)

8. Read and parse the bundle JSON file
9. Validate metadata.schemaVersion is supported (≥ "1.0", ≤ "1.1.1")
10. Run validation rules V1–V31 (from V1.1.1 proposal)
    - Print errors → exit code 1 if any errors
    - Print warnings to stderr
    - If --dry-run or --validate: exit after validation
```

#### Phase 2: Reference Map Construction (no DB)

```
11. Resolve author user:
    - If author.email provided, look up existing user by email
    - If found, use that user (regardless of role)
    - If not found or no author block: use the system import user
      "bundle-importer@zyx.internal" (created once, reused across imports)
    - Never auto-create a new user for bundle authorship
    - Store resolved author UUID

12. Generate UUID for course
13. idMap.set("$course", courseUuid)

14. For each chapter (by index):
    - Generate chapter UUID
    - If chapter.$id, idMap.set(chapter.$id, chapterUuid)
    - Generate MTD UUID, store in chapterMtdMap
    - For each concept:
      - Generate concept UUID
      - If concept.$id, idMap.set(concept.$id, conceptUuid)
      - For each localization: (no $id, referenced by parent only)
    - For each KO:
      - Generate KO UUID
      - If ko.$id, idMap.set(ko.$id, koUuid)
    - For each websiteMaterial: (no $id)
    - For each flashcardSet:
      - Generate set UUID
      - For each flashcard: (no $id)
```

#### Phase 3: Data Row Assembly (no DB)

```
15. Assemble all rows into typed arrays:

    let userRow: typeof user.$inferInsert | null
    let courseRow: typeof courses.$inferInsert
    let conceptRows: typeof concepts.$inferInsert[]
    let localizationRows: typeof conceptLocalizations.$inferInsert[]
    let mtdRows: typeof masterTeachingDocuments.$inferInsert[]
    let chapterRows: typeof chapters.$inferInsert[]
    let koRows: typeof knowledgeObjects.$inferInsert[]
    let wmRows: typeof websiteMaterials.$inferInsert[]
    let fsetRows: typeof flashcardSets.$inferInsert[]
    let fcRows: typeof flashcards.$inferInsert[]
    let asRows: typeof assessmentSources.$inferInsert[]
    let ascRows: typeof assessmentSourceChapters.$inferInsert[]
    let aoRows: typeof assessmentObjects.$inferInsert[]
    let krRows: typeof knowledgeRelationships.$inferInsert[]

16. For each row, resolve all FK references using idMap
    (see section 4 for per-column strategy)
```

#### Phase 4: Transaction — Execute Inserts

```
17. if dryRun: skip, print "Dry run — no rows inserted"
18. db.transaction(async (tx) => {
      // Step 1: user (if creating new)
      if (isNewUser) await tx.insert(user).values(userRow)

      // Step 2: course
      await tx.insert(courses).values(courseRow)

      // Step 3: concepts
      if (conceptRows.length) await tx.insert(concepts).values(conceptRows)

      // Step 4: conceptLocalizations
      if (localizationRows.length) await tx.insert(conceptLocalizations).values(localizationRows)

      // Step 5: masterTeachingDocuments
      await tx.insert(masterTeachingDocuments).values(mtdRows)

      // Step 6: chapters
      await tx.insert(chapters).values(chapterRows)

      // Step 7: knowledgeObjects (batch of 100)
      for (const batch of chunks(koRows, 100))
        await tx.insert(knowledgeObjects).values(batch)

      // Step 8: websiteMaterials (batch of 100)
      for (const batch of chunks(wmRows, 100))
        await tx.insert(websiteMaterials).values(batch)

      // Step 9: flashcardSets (batch of 100)
      for (const batch of chunks(fsetRows, 100))
        await tx.insert(flashcardSets).values(batch)

      // Step 10: flashcards (batch of 100)
      for (const batch of chunks(fcRows, 100))
        await tx.insert(flashcards).values(batch)

      // Step 11: assessmentSources
      await tx.insert(assessmentSources).values(asRows)

      // Step 12: assessmentSourceChapters
      if (ascRows.length) await tx.insert(assessmentSourceChapters).values(ascRows)

      // Step 13: assessmentObjects (batch of 100)
      for (const batch of chunks(aoRows, 100))
        await tx.insert(assessmentObjects).values(batch)

      // Step 14: knowledgeRelationships
      if (krRows.length) await tx.insert(knowledgeRelationships).values(krRows)

      // Return summary for post-transaction reporting
      return {
        courseId: courseRow.id,
        chapterCount: chapterRows.length,
        koCount: koRows.length,
        wmCount: wmRows.length,
        fcCount: fcRows.length,
        aoCount: aoRows.length,
        krCount: krRows.length,
      }
    })
```

#### Phase 5: Post-Transaction

```
19. Print summary:
    ─── Import Complete ───
    Course:     Kalkulus 1 (MA1101)
    Chapters:   10
    KOs:        500
    Materials:  10
    Flashcards: 2000
    Questions:  1000
    Past Exams: 200
    Relationships: 45
    ───────────────────────

20. If --post-process:
    - For each chapter, call compileMarkdown() + verifyKOCoverage()
    - For the course, call buildConceptGraph()
    - Queue vector sync: insert rows into vectorSyncQueue (one per active KO)
    (These run outside the transaction; they can fail independently.)

21. process.exit(0)
```

### Error handling

```typescript
main().catch((err) => {
  console.error("\n=== Import Failed ===");
  console.error(err);
  process.exit(1);
});
```

### Helper: `chunks()`

```typescript
function chunks<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
```

---

## Appendix: Row Assembly Details for Each Table

### `user`

The importer does NOT create users. It uses the system import user:

```text
email: bundle-importer@zyx.internal
```

This user must exist before running the importer. It can be created by the
`db/seed.ts` script or manually:

```sql
INSERT INTO user (id, name, email, email_verified, role)
VALUES ('bundle-importer', 'Bundle Importer', 'bundle-importer@zyx.internal', 1, 'teacher');
```

If `author.email` is provided in the bundle, the importer looks up that user.
If found, the resolved user UUID is used for `createdById` and
`uploadedByUserId`. If not found, the system import user UUID is used instead
(no error, no auto-creation).

```typescript
// Resolved at Phase 2, stored in authorUuid variable
```

### `courses`

```typescript
{
  id: idMap.get("$course"),
  title: bundle.course.title,
  category: bundle.course.category,
  description: bundle.course.description || null,
}
```

### `concepts`

```typescript
{
  id: conceptUuid,
  canonicalSlug: concept.canonicalSlug,
  // isVerified: false (default)
}
```

### `conceptLocalizations`

```typescript
{
  id: randomUUID(),
  conceptId: resolvedConceptUuid,
  lang: loc.lang,
  displayName: loc.displayName,
  aliases: loc.aliases || [],
  // technicalStandardTerm: "id" (default)
  // embedding: null
}
```

### `masterTeachingDocuments` (importer-generated, per chapter)

The MTD's `markdownContent` stores the chapter's canonicalMarkdown — the
same content written into `websiteMaterials.canonicalMarkdown`. This ensures
the MTD is a meaningful teaching document rather than a stub, preserving
content traceability and admin UI readability.

```typescript
{
  id: mtdUuid,
  courseId: idMap.get("$course"),
  title: `MTD - ${chapter.title}`,
  markdownContent: canonicalizeMarkdown(wm.canonicalMarkdown, idMap),
  // canonicalized markdown (same as websiteMaterials.canonicalMarkdown)
  version: 1,
  status: "draft",                     // "draft" signals un-reviewed import
  type: "learning",
  createdById: authorUuid,
}
```

**Rationale for `status: "draft"`:** The DB default is `"draft"`. Forcing
`"active"` would bypass any review workflow that operators rely on to
distinguish reviewed content from newly imported content. The status should
be promoted after post-processing or manual verification.

**Rationale for storing canonicalMarkdown:** In the bundle workflow, the
website material's canonicalMarkdown IS the source document. Operators
browsing MTD records will see the actual teaching content, not a placeholder
stub. The `sourceHash` is computed from the same content for staleness
tracking.

### `chapters`

```typescript
{
  id: chapterUuid,
  courseId: idMap.get("$course"),
  title: chapter.title,
  description: chapter.description || null,
  orderIndex: index,            // 0-based or 1-based (choose one, be consistent)
  // status: "draft" (default)
  // assetGenStatus: "idle" (default)
  // assetGenFlashcardsTotal: 0 (default)
  // ...
}
```

### `knowledgeObjects`

```typescript
{
  id: koUuid,
  courseId: idMap.get("$course"),
  mtdId: chapterMtdMap.get(chapterId),   // MTD UUID for this chapter
  chapterId: chapterUuid,
  conceptId: resolvedConceptUuid,         // from concept$ref or conceptName
  learningOrder: index,                    // array index
  title: ko.title,
  conceptName: resolvedConceptName,       // derived from concept$ref or author-supplied
  content: ko.content,
  type: ko.type,
  bloomLevel: ko.bloomLevel,
  difficulty: ko.difficulty || "medium",
  tags: ko.tags || [],
  importance: ko.importance || "medium",
  metadata: ko.source
    ? { _source: ko.source }
    : {},
  // pineconeVectorId: null
  // status: "active" (default)
}
```

### `websiteMaterials`

```typescript
{
  id: `wm-${randomUUID()}`,
  courseId: idMap.get("$course"),
  chapterId: chapterUuid,
  sourceMtdId: chapterMtdMap.get(chapterId),
  sourceMtdVersion: 1,
  // isStale: false (default)
  generationHash: computeMaterialHash(chapter.knowledgeObjects),
  title: wm.title,
  slug: wm.slug || slugify(wm.title),
  canonicalMarkdown: canonicalizeMarkdown(wm.canonicalMarkdown, idMap),
  structuredContent: wm.structuredContent || {},
  // termIndex: null
  // contentVersion: 1 (default)
  // status: "draft" (default)
  // coverageStatus: "not_verified" (default)
  // coverageReport: default (default)
}
```

Where `canonicalizeMarkdown()` is:

```typescript
function canonicalizeMarkdown(md: string, idMap: Map<string, string>): string {
  // Replace ref="<id>" with koId="<uuid>" at the attribute level.
  // This handles blocks with additional attributes such as
  //   :::concept {ref="ko-def-limit", difficulty="easy"}
  // which would NOT be matched by a {ref="..."} context regex.
  //
  // After replacement, the compiler's parseAttributes() (line 19 of
  // lib/markdown-compiler.ts) reads key="value" pairs generically, and
  // the compiler reads attrs.koId at line 146. Both work correctly
  // with koId="<uuid>" regardless of which other attributes are present.
  return md.replace(/ref="([^"]+)"/g, (match, ref) => {
    const uuid = idMap.get(ref);
    if (!uuid) throw new Error(`Unresolvable markdown ref: "${ref}"`);
    return `koId="${uuid}"`;
  });
}
```

**Verification examples:**

| Input | Output | Notes |
|-------|--------|-------|
| `{ref="ko-def-limit"}` | `{koId="<uuid>"}` | Single attribute |
| `{ref="ko-def-limit", difficulty="easy"}` | `{koId="<uuid>", difficulty="easy"}` | Multiple attributes |
| `:::concept {ref="ko-a"}` | `:::concept {koId="<uuid>"}` | Block prefix preserved |
| `ref="not-a-ref"` | `koId="<uuid>"` | Non-block refs also replaced (acceptable — `ref=` is a reserved attribute pattern in bundle markdown; authors should not use it outside block attributes) |

### `flashcardSets`

```typescript
{
  id: `fset-${randomUUID()}`,
  courseId: idMap.get("$course"),
  chapterId: chapterUuid,
  sourceMtdId: chapterMtdMap.get(chapterId),
  sourceMtdVersion: 1,
  // isStale: false (default)
  generationHash: computeFlashcardSetHash(fset.flashcards),
  title: fset.title,
  // status: "draft" (default)
}
```

### `flashcards`

```typescript
{
  id: `fc-${randomUUID()}`,
  setId: setUuid,
  koId: fcard.ko$ref ? idMap.get(fcard.ko$ref) : null,
  front: fcard.front,
  back: fcard.back,
  explanation: fcard.explanation || null,
  // status: "active" (default)
  metadata: fcard.source ? { _source: fcard.source } : {},
}
```

### `assessmentSources`

```typescript
{
  id: `asrc-${randomUUID()}`,
  courseId: idMap.get("$course"),
  title: as.title,
  origin: "generated",
  category: as.category,
  year: as.year,
  semester: as.semester || null,
  sourceMarkdown: as.sourceMarkdown,
  sourceHash: sha256(as.sourceMarkdown),
  // version: 1 (default)
  // parserVersion: "1.0.0" (default)
  // ingestionStatus: "pending" (default)
  originalFilename: as.source?.file || null,
  uploadedByUserId: authorUuid,
  // ingestionError, ingestionStartedAt, ingestionCompletedAt: null
  // uploadthingKey: null
  // deletedAt, deletedByUserId: null
}
```

### `assessmentSourceChapters`

```typescript
// One row per resolved chapter reference:
{
  id: `asc-${randomUUID()}`,
  assessmentSourceId: sourceUuid,
  chapterId: resolveChapterRef(ref, idMap, bundle),
}
```

Where `resolveChapterRef`:

```typescript
function resolveChapterRef(ref: string, idMap: Map<string, string>,
    bundle: BundleV1_1_1): string {
  // Try as $id reference first
  const byId = idMap.get(ref);
  if (byId) return byId;

  // Fallback: match by chapter title
  const chapter = bundle.course.chapters.find(c => c.title === ref);
  if (!chapter) throw new Error(`Unresolvable chapter ref: "${ref}"`);
  const chapterIndex = bundle.course.chapters.indexOf(chapter);
  return idMap.get(`$chapter-${chapterIndex}`)!;
}
```

### `assessmentObjects`

```typescript
{
  id: `ao-${randomUUID()}`,
  sourceId: sourceUuid,
  questionOrder: index + 1,          // 1-based
  // sourceQuestionNumber: null
  questionType: ao.questionType,
  difficulty: ao.difficulty,
  pattern: ao.pattern || "general",
  reasoningType: ao.reasoningType || "analytical",
  estimatedSteps: ao.estimatedSteps || 1,
  applicationLevel: ao.applicationLevel || 1,
  questionMarkdown: ao.questionMarkdown || "",
  answerMarkdown: ao.answerMarkdown || null,
  options: ao.options || null,
  canonicalQuestionHash: ao.canonicalQuestionHash
    || sha256(ao.questionMarkdown || ""),
}
```

### `knowledgeRelationships`

```typescript
{
  id: `kr-${randomUUID()}`,
  sourceKoId: resolveRef(kr.sourceKo$ref, idMap),
  targetKoId: resolveRef(kr.targetKo$ref, idMap),
  type: kr.type,
}
```

---

## File summary

| File | Purpose |
|------|---------|
| `scripts/import-bundle.ts` | The importer script |
| `docs/bundle/v1.1.1-revision.md` | Bundle schema reference |
| `docs/bundle/v1.1-proposal.md` | Full V1.1 spec (V1.1.1 extends) |
| `docs/bundle/compatibility-audit.md` | Field-level DB mapping |
| `docs/bundle/import-plan-audit.md` | Pre-implementation audit findings |
| `lib/ko-utils.ts` | `slugify` helper (already exists) |

The importer does not need new library files. All dependencies are already in
the codebase.

---

## Summary of Modifications (V1 → V2 of the plan)

| Fix | Section changed | Before | After |
|-----|-----------------|--------|-------|
| Fix 1 (P0) — Markdown regex | Appendix, `canonicalizeMarkdown()` | `/\{ref="([^"]+)"\}/g` | `/ref="([^"]+)"/g` |
| Fix 2 (P1) — MTD content | Appendix, `masterTeachingDocuments` | Stub `"Imported from bundle..."` | `canonicalizeMarkdown(canonicalMarkdown, idMap)` |
| Fix 3 (P1) — MTD status | Appendix, `masterTeachingDocuments` | `status: "active"` | `status: "draft"` |
| Fix 4 (P1) — Upsert key | Section 8, match key table | `(courseId, title, year)` | `(courseId, category, year, title)` |
| Fix 5 (P2) — User strategy | Phase 2 + Appendix, `user` | Auto-create with `role: "admin"` | Lookup only; fall back to system import user |
| Fix 6 (P2) — MVP workflow | Section 9 (new) | Not present | Recommendation section promoting `create` mode |

## Remaining Risks After Fixes

| Risk | Severity | Status |
|------|----------|--------|
| Upsert orphaned content on content removal | Medium | Documented in MVP workflow section |
| KO upsert by `(chapterId, title)` duplicates on rename | Medium | Documented; recommend stable `$id` for upsert |
| SELECT-then-INSERT not concurrency-safe | Low | Documented (CLI tool, acceptable) |
| Overly broad `ref="..."` replacement in non-block text | Low | Documented in verification table |
| Hardcoded system import user `bundle-importer@zyx.internal` | Low | Must be pre-seeded; documented in `user` appendix |

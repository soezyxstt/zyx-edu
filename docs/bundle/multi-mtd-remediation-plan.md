# Zyx Multi-MTD Remediation Plan

This document outlines the remediation plan to eliminate remaining 1-Course-1-MTD assumptions across the codebase, ensuring full compatibility with the approved architecture of 1 Chapter = 1 Master Teaching Document (MTD).

## 1. Reference Implementation

The practice question generation logic in [question-generator.ts](file:///workspaces/zyx-edu/lib/question-generator.ts) serves as the reference implementation. Instead of querying a single MTD for the entire course or selecting the first result from a course-wide query, it resolves MTD information per Knowledge Object (KO) in a batch:

1. It extracts all unique `mtdId` values from the input KOs.
2. It fetches all matching MTD records via a batch query (`inArray`).
3. It maps each KO to its corresponding MTD using a lookup map, ensuring correct versioning and provenance metadata.

This pattern must be applied to all other files handling content generation and staleness tracking.

## 2. Hard Occurrences

### A. [inngest-functions.ts](file:///workspaces/zyx-edu/lib/inngest-functions.ts)
* **Current Assumption**: In the bulk chapter generator function `bulkChapterGenerator`, the code queries a single MTD for the entire course to determine the author ID:
  ```typescript
  const [mtd] = await db
    .select()
    .from(masterTeachingDocuments)
    .where(eq(masterTeachingDocuments.courseId, info.courseId));
  ```
  It assumes that only one MTD exists per course, and it selects the first one from the returned list.
* **Incorrect Behavior**: When a course contains multiple chapters (each with its own MTD under the 1 Chapter = 1 MTD architecture), this query matches all of them and arbitrary selects the first one. If the first MTD does not correspond to the chapter currently being processed, the generated website materials will reference the wrong author ID or other incorrect MTD metadata.
* **Proposed Fix**: Query the MTD specific to the chapter being processed. Since KOs for the chapter are already fetched (`activeKOs`), retrieve the `mtdId` from the first active KO (since all KOs in a single chapter belong to the same MTD) and fetch that specific MTD record:
  ```typescript
  const mtdId = activeKOs[0]?.mtdId;
  if (!mtdId) throw new Error("No active KOs found to resolve MTD.");
  const [mtd] = await db
    .select()
    .from(masterTeachingDocuments)
    .where(eq(masterTeachingDocuments.id, mtdId));
  ```
* **Risk Level**: Low. The fix uses existing records fetched in the same block.
* **Estimated Effort**: 0.5 hours.

### B. [diktat-actions.ts](file:///workspaces/zyx-edu/lib/diktat-actions.ts)
* **Current Assumption**: In `generateDiktatDraft`, the code retrieves active KOs for all selected chapters. It takes the MTD ID from the first KO in the list:
  ```typescript
  const mtdId = activeKOs[0].mtdId;
  ```
  It stores this single MTD ID in the `sourceMtdId` column of the `diktats` table.
* **Incorrect Behavior**: A Diktat is compiled from a selection of multiple chapters, each corresponding to its own MTD. Storing only a single `sourceMtdId` means that the Diktat is registered as depending on only one chapter's MTD. If the MTD of any other selected chapter is updated, the staleness cascade in [ko-extractor.ts](file:///workspaces/zyx-edu/lib/ko-extractor.ts) (which checks `where(eq(diktats.sourceMtdId, mtdId))`) will fail to identify that the Diktat is stale. This leaves compiled PDFs out of sync when downstream chapters change.
* **Proposed Fix**: We can preserve the database schema (since the schema is frozen) and resolve multiple MTDs as follows:
  1. Retrieve all unique `mtdId` and `version` values from `activeKOs` (which span all selected chapters).
  2. Save this mapping (MTD ID to version) inside the JSON `settings` column of the `diktats` record (e.g. `settings.sourceMtds = { [mtdId]: version }`). Keep `sourceMtdId` set to the primary (first) MTD for database constraint satisfaction.
  3. Modify the staleness cascade in [ko-extractor.ts](file:///workspaces/zyx-edu/lib/ko-extractor.ts) and [actions.ts](file:///workspaces/zyx-edu/app/(admin)/admin/ai/materials/[id]/actions.ts). Instead of a simple `where(eq(diktats.sourceMtdId, mtdId))` update, query the chapter ID associated with the updated MTD, and then mark as stale any Diktats whose `chapterIds` array contains that chapter ID.
* **Risk Level**: Medium. Modifying the cascade logic requires careful query formulation on JSON columns or manual filtering in Javascript.
* **Estimated Effort**: 3 hours.

## 3. Soft Occurrences

### A. [material-storage.ts](file:///workspaces/zyx-edu/lib/material-storage.ts)
* **Current Assumption**: In `saveWebsiteMaterial`, it fetches the active KOs for a specific chapter and sets `mtdId = activeKOs[0].mtdId` to fetch the MTD.
* **Incorrect Behavior**: None.
* **Proposed Evaluation**: **Deferred (No Action Required)**.
* **Justification**: This function operates strictly within the scope of a single chapter (`chapterId`). Under the approved "1 Chapter = 1 MTD" architecture, all active KOs within a single chapter are guaranteed to share the same MTD. Thus, taking `activeKOs[0].mtdId` is mathematically correct and safe.
* **Risk Level**: None.
* **Estimated Effort**: 0 hours.

### B. [flashcard-generator.ts](file:///workspaces/zyx-edu/lib/flashcard-generator.ts)
* **Current Assumption**: In `generateFlashcardsForChapter`, it fetches active KOs for a single chapter and retrieves `activeKOs[0].mtdId`.
* **Incorrect Behavior**: None.
* **Proposed Evaluation**: **Deferred (No Action Required)**.
* **Justification**: Similar to [material-storage.ts](file:///workspaces/zyx-edu/lib/material-storage.ts), this function compiles flashcards for a single chapter. Because 1 Chapter = 1 MTD, all KOs in the chapter are guaranteed to have the same `mtdId`, making the lookup of `activeKOs[0].mtdId` safe.
* **Risk Level**: None.
* **Estimated Effort**: 0 hours.

### C. [page.tsx](file:///workspaces/zyx-edu/app/(admin)/admin/ai/materials/[id]/page.tsx)
* **Current Assumption**: The admin materials detail page queries all chapters, KOs, and website materials for the entire course based on the course ID:
  ```typescript
  where: eq(chapters.courseId, instance.courseId)
  ```
  It ignores the `chapterIds` array stored on the material instance (`instance.chapterIds`).
* **Incorrect Behavior**: The page displays all chapters, KOs, and website materials for the entire course, assuming that a material instance represents the entire course (1 Course = 1 Material/MTD). This violates the boundary of a single chapter MTD, rendering unrelated chapters in the edit interface.
* **Proposed Evaluation**: **Fixed Now**.
* **Justification**: The page should filter chapters, KOs, and website materials using the `instance.chapterIds` array:
  ```typescript
  where: inArray(chapters.id, instance.chapterIds)
  ```
  This restricts the page to only render details relevant to the chapters mapped to that material instance.
* **Risk Level**: Low. Restricts data retrieval to the selected chapter scope.
* **Estimated Effort**: 1 hour.

### D. [route.ts](file:///workspaces/zyx-edu/app/api/admin/material-instances/route.ts)
* **Current Assumption**: The POST route handler accepts multiple `chapterIds` for a single uploaded document (MTD), loops through them to insert `websiteMaterials` records referencing the single `mtdId`, but links all extracted KOs to only the first chapter ID in the list.
* **Incorrect Behavior**: It assumes a single MTD can be shared across multiple chapters (violating the 1 Chapter = 1 MTD constraint). It results in website materials being created for multiple chapters pointing to the same MTD, while KOs are only populated in the first chapter.
* **Proposed Evaluation**: **Fixed Now**.
* **Justification**: Enforce at the validation level (e.g. via Zod schema) that `chapterIds` must contain exactly one chapter ID. This prevents the creation of multi-chapter MTDs and guarantees that each upload maps to exactly one chapter and one MTD.
* **Risk Level**: Low. Enforces input validation.
* **Estimated Effort**: 0.5 hours.

### E. Seed Scripts
* **Current Assumption**: Various seed scripts, such as [seed-paths.ts](file:///workspaces/zyx-edu/scripts/seed-paths.ts) and [seed-embed.ts](file:///workspaces/zyx-edu/scripts/seed-embed.ts), insert a single MTD (e.g. `"mtd-1"`) for the entire course and associate all seeded chapters and KOs with that single MTD.
* **Incorrect Behavior**: This seeds data in an inconsistent state that violates the "1 Chapter = 1 MTD" rule. Downstream features (like staleness checks, question generation, and materials compilation) fail or function incorrectly because different chapters point to the same MTD ID.
* **Proposed Evaluation**: **Fixed Now**.
* **Justification**: Seed scripts must be updated to seed a unique MTD record per chapter. KOs must reference the MTD record associated with their respective chapter.
* **Risk Level**: Low. Only affects local/dev test database seeding.
* **Estimated Effort**: 1.5 hours.

## 4. Compatibility Verification

We have verified that the following components remain fully compatible with the `1 Chapter = 1 MTD` approved architecture:

* **Bundle V1.1.1**: The bundle schema structure splits course contents by `chapters`. Each chapter in the bundle is self-contained with its own concepts, knowledge objects, website materials, and flashcard sets. This structure aligns perfectly with inserting exactly one MTD per chapter.
* **Import Implementation Plan**: The importer processes chapters sequentially, generating a separate MTD for each chapter. The remediation plan prevents MTD sharing, ensuring the importer matches this layout.
* **Postprocess Pipeline**: Post-processing compiles website materials and builds concept graphs per chapter. Resolving the chapter-specific MTD ID ensures that these scripts operate correctly within their respective chapter bounds.
* **Zyx RAG**: Vector store sync and tutor query grounding assembly partition embeddings by course and namespace (`course_{courseId}_learning`). Individual vectors store `chapterId` and `sourceMtdId` as metadata fields, allowing Zyra RAG to query and filter results accurately, even when the course is composed of multiple MTDs.

## 5. Summary and Implementation Roadmap

| Step | File / Script | Category | Risk Level | Effort |
|------|---------------|----------|------------|--------|
| 1 | [route.ts](file:///workspaces/zyx-edu/app/api/admin/material-instances/route.ts) | API Validation | Low | 0.5 hrs |
| 2 | [inngest-functions.ts](file:///workspaces/zyx-edu/lib/inngest-functions.ts) | Background Worker | Low | 0.5 hrs |
| 3 | [page.tsx](file:///workspaces/zyx-edu/app/(admin)/admin/ai/materials/[id]/page.tsx) | Admin UI | Low | 1.0 hrs |
| 4 | [diktat-actions.ts](file:///workspaces/zyx-edu/lib/diktat-actions.ts) & [ko-extractor.ts](file:///workspaces/zyx-edu/lib/ko-extractor.ts) | Staleness Cascade | Medium | 3.0 hrs |
| 5 | Seed Scripts | Database Seeding | Low | 1.5 hrs |

**Total Estimated Effort**: 6.5 hours.

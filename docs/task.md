# ZYX Academy Content Architecture vNext Tasks Checklist

## Phase 1: Database Schema Update & Migration
- [x] Edit `db/schema.ts` to include:
  - `type` and `sourceHash`/`derivedHash` on `masterTeachingDocuments`
  - `isStale` on `aiQuestionBank`
  - `namespace` on `vectorSyncQueue`
  - `assessmentObjects`, `assessmentProfiles`, and `coursePolicies` tables
- [x] Run `npm run db:generate` to generate Drizzle migrations.
- [x] Run `npm run db:migrate` to execute local migrations.
- [x] Create and run migration backfill script `scripts/migrate-mtd-vnext.ts` to populate existing MTDs with hashes and `type = 'learning'`.

## Phase 2: Ingestion, Validation & Parsing Layer
- [x] Create `lib/canonical-validator.ts` for pre-ingestion markdown validation.
- [x] Create `lib/assessment-extractor.ts` for deterministic parsing and classification of assessment markdown.
- [x] Modify `lib/ko-extractor.ts` to compute hashes and update queue namespaces to `"learning"`.
- [x] Update `lib/inngest-functions.ts` to support multi-namespace grouping and routing, and add `assessment.ingest` background function.

## Phase 3: AI & Retrieval Layer
- [x] Update `lib/tutor-rag.ts` queries to use the learning index.
- [x] Create `lib/pedagogical-validator.ts` to enforce policy-based validation.
- [x] Update `lib/question-generator.ts` to implement the new quiz generation pipeline with dynamic profiles, policies, historical questions, and pedagogical validation.

## Phase 4: Admin Dashboard & Actions Layer
- [x] Update admin route handler `app/api/admin/material-instances/route.ts` with canonical validation and upload type selection.
- [x] Update admin dashboard client `app/admin/ai/materials/materials-client.tsx` and page route to show separate tabs for Learning and Assessment.
- [x] Update admin detail actions `app/admin/ai/materials/[id]/actions.ts` to calculate hashes and only cascade staleness when `derived_hash` changes.

## Phase 5: Verification & Walkthrough
- [x] Create test script `scripts/test-vnext-flow.ts` to verify all vNext functionality.
- [x] Execute `npx tsx scripts/test-vnext-flow.ts` and confirm all checks pass.
- [x] Complete local manual verification and compile walkthrough artifact.

## Phase 6: TypeScript Type Check & Build Verification
- [x] Fix `updatedAt` error in `app/admin/ai/materials/[id]/actions.ts`
- [x] Fix `assessments` variables in `app/admin/ai/materials/materials-client.tsx`
- [x] Fix `updatedAt` error in `lib/ko-extractor.ts`
- [x] Fix missing `blueprint` and `ko` references in `lib/question-generator.ts`
- [x] Fix SQLite table insert type mismatch in `scripts/test-vnext-flow.ts`
- [x] Run `npx tsc --noEmit` and confirm zero compiler errors

## Phase 7: Production Database Migration
- [x] Run production database migration to push schemas.
- [x] Resolve SQLite `ADD COLUMN NOT NULL` limitations by updating migration `0020_tan_vance_astro.sql`.
- [x] Correct migration journal timestamp anomalies in the database and metadata.
- [x] Run data backfill script `scripts/migrate-mtd-vnext.ts` targeting production environment.
- [x] Run schema verification script `scripts/check-prod-schema.ts` against the production database and confirm all checks pass.
- [x] Clean up temporary utility scripts.

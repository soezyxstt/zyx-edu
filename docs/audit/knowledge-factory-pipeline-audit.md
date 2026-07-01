# Audit: Upload -> Parse -> Generate Pipeline

Scope: "Knowledge Factory", "One-Click Course Creation", "Auto Quiz Generation", "AI Teaching Assistant" use cases. This is phase 1 of the larger 18-use-case audit; other use cases are not covered here.

Status: scan + gap analysis complete. No code changed yet.

## 1. What actually happens today (traced end to end)

Entry point: `app/(admin)/admin/ai/(content)/materials/materials-client.tsx`, backed by:
- `app/api/admin/upload-pdf/route.ts`
- `app/api/admin/material-instances/route.ts`
- `lib/ko-extractor.ts`
- `lib/generation-pipeline.ts` + `app/api/admin/generation-jobs/route.ts`
- `lib/inngest-functions.ts`

Step by step:

1. Admin picks a PDF. `handlePdfUpload` (materials-client.tsx:208) POSTs to `/api/admin/upload-pdf`. That route ([upload-pdf/route.ts:32](app/api/admin/upload-pdf/route.ts:32)) uploads the raw bytes to R2 and returns a `key`. **Nothing reads the PDF's content.** The UI says this explicitly: "Disimpan di R2 sebagai arsip. Tidak diproses ke KO." (materials-client.tsx:909) and again in the dual-document info box (materials-client.tsx:1087): the PDF is archived only, never parsed.
2. The admin must separately produce **canonical Markdown** by hand (write it, or have already converted the PDF to Markdown themselves outside Zyx) and either upload a `.md` file or paste it into a textarea (materials-client.tsx:1013-1079).
3. Clicking "Analisis Dokumen" calls `handleStartAnalysis` (materials-client.tsx:306). This is **100% client-side and fake**: it regex-scans the pasted text for word count, heading count, `$...$` / `$$...$$` balance, and custom `:::concept{...}` / `:::formula{...}` container blocks, wraps the result in a `setTimeout(..., 1500)` to fake a loading delay, and presents it as "Tingkat Akurasi & Coverage Ekstraksi" with percentage bars (materials-client.tsx:645-666, 1251-1394). No LLM call happens here. The `:::concept`/`:::formula` containers it looks for are also not what the real backend extractor uses or produces (see step 5) — they're vestigial from an earlier design.
4. The admin reviews this fabricated report, fixes fake "warnings" (glossary/LaTeX/density, all regex heuristics), and clicks "Publikasikan Materi" -> `handlePublish` (materials-client.tsx:600) -> `POST /api/admin/material-instances`.
5. The route handler ([material-instances/route.ts:47](app/api/admin/material-instances/route.ts:47)) does, **synchronously, inside the HTTP request**:
   - Validate markdown shape (`validateCanonicalMarkdown`)
   - Upload markdown to R2
   - Insert `aiMaterialInstances`, `masterTeachingDocuments`, `websiteMaterials` rows
   - `await extractKnowledgeObjectsForChapter(...)` ([ko-extractor.ts:723](lib/ko-extractor.ts:723)), which itself sequentially:
     - 1 Gemini call to decompose the chapter into candidate KOs (JSON schema response)
     - For every candidate concept name that isn't an exact/alias registry match: 1 embedding call, then for borderline cosine-similarity matches (0.75-0.90), an additional canonicalization Gemini call
     - A concept-validation Gemini call over all unique canonical names
     - Falls back to retry-with-error-message Gemini calls on any parse failure at each stage
   - Loop over text sections/chunks, insert rows, fire (non-awaited) Pinecone upserts
   - Only then does the HTTP response return.
6. Real KO extraction results are **never shown to the admin** — the "Laporan Ekstraksi" dialog (materials-client.tsx:1624) only ever renders the step-3 fake regex data, which isn't updated after publish.
7. Separately, quiz/question generation (`lib/generation-pipeline.ts`, triggered from `app/api/admin/generation-jobs/route.ts`) requires Knowledge Objects to already exist — it has no PDF/text input of its own, it is purely "for each active KO, ask Gemini for questions." So if step 5's extraction silently fell back to a single dummy KO, question generation will generate questions about that dummy KO's 1000-character text dump, not the real chapter content.

Compare to the **assessment** document path in the same route (`type === 'assessment'`, [material-instances/route.ts:92-137](app/api/admin/material-instances/route.ts:92)): it inserts an `assessmentSources` row with `ingestionStatus: 'pending'` and dispatches `inngest.send({ name: "assessment.ingest" })`, handled asynchronously by `assessmentIngestWorker` in `lib/inngest-functions.ts:680`. That is the correct pattern — and it sits right next to the learning-material path that doesn't use it.

## 2. Gap vs. the vision

| Vision (Knowledge Factory / One-Click Course Creation) | Reality |
|---|---|
| Admin uploads PDF(s); system produces canonical knowledge automatically | PDF is archived, never read. Admin must manually author/convert canonical Markdown outside the system. `pdf-parse` is an installed dependency but is only wired into `lib/diktat-pdf-auditor.ts`, which audits Zyx's own *generated* output PDFs — it has no path back into the ingestion pipeline. |
| "A few hours later": website, flashcards, quiz, tutor context, diktat all appear | Only KOs + chunks + a 1:1 markdown dump into `websiteMaterials` are produced at publish time. Flashcards/diktat/quiz generation are separate, manually triggered actions elsewhere in the admin UI, not part of this pipeline. |
| Admin gets an accurate extraction report to curate before publishing | The only report shown is a fake client-side regex simulation that never reflects what the real Gemini extraction will produce. There is no actual review/curation step for the real KOs at all — they go straight from LLM output to `active` status in the DB. |
| Knowledge Versioning: only regenerate what changed | Partially real: `ko-extractor.ts` does compute `sourceHash`/`derivedHash` and cascades `isStale` flags to `websiteMaterials`/`flashcardSets`/`diktats`/`aiQuestionBank` when the derived hash changes ([ko-extractor.ts:1138](lib/ko-extractor.ts:1138)). This part is well-built. But it's undermined upstream: every publish **deletes and re-extracts all KOs for the whole chapter** ([ko-extractor.ts:1116](lib/ko-extractor.ts:1116): `tx.delete(knowledgeObjects).where(eq(knowledgeObjects.chapterId, chapterId))`), so a one-paragraph edit still means "re-derive the entire chapter's KO set from scratch," not an incremental diff. |
| Reliable, observable background processing | Assessment ingestion is async via Inngest. Learning-material ingestion (the common, primary case) is synchronous in the request handler, doing up to ~1 + N(embeddings) + M(canonicalization) + 1(validation) sequential Gemini calls before responding. On Vercel-style serverless this risks request timeouts; on success it's still a multi-second-to-tens-of-seconds blocking POST with a spinner and no real progress feedback (contrast with `aiGenerationJobs`, which does have job-status polling, but that's only used for question generation, not KO extraction). |

## 3. Concrete bugs / "this is weird" findings

1. **The headline bug**: there is no PDF-to-text/markdown extraction anywhere in the ingestion path. "Upload PDF and get knowledge" does not exist; it's "upload PDF (decorative) + manually paste markdown you made yourself." This alone explains most of "the parser is unpleasant" — there effectively isn't one.
2. **Deceptive UI**: the entire "Analisis Dokumen" -> warnings -> accuracy bars -> "Laporan Ekstraksi" flow is a client-side mock with hardcoded math (e.g. `babAccuracy = Math.max(20, 100 - ...)` at materials-client.tsx:645) that has zero connection to the real backend. An admin who "fixes all warnings" and sees "98% parsed successfully" has validated nothing about what Gemini will actually extract on publish.
3. **Dead/legacy KO container syntax**: the regex in materials-client.tsx:334-335 looks for `:::concept`, `:::formula`, etc. blocks that the real extractor (`buildKoExtractionPrompt` in ko-extractor.ts) never asks for and never produces — admins are being trained on a markup convention the system doesn't use.
4. **Inconsistent architecture between the two document types in the same endpoint**: `assessment` -> Inngest background job with a status field (`ingestionStatus`); `learning` -> synchronous inline LLM pipeline with no equivalent status field on the KO side (the `aiMaterialInstances.pineconeSyncStatus` field only covers the *legacy chunk/Pinecone* sync, not KO extraction success/failure).
5. **No per-chapter extraction status/observability for admins.** If `extractKnowledgeObjectsForChapter` throws, the code silently swallows it and inserts one fallback "concept_overview" KO containing the first 1000 characters of raw text ([material-instances/route.ts:211-264](app/api/admin/material-instances/route.ts:211), duplicated again inside `ko-extractor.ts:801-835` for the retry-exhausted case). The admin's UI shows "Materi berhasil dipublikasikan" either way — there is no signal that extraction degraded to a single dummy KO covering an entire chapter. `aiExtractionFailures` rows are written (good), but nothing in the admin UI surfaces them.
6. **Full re-extraction instead of incremental**: every publish deletes all KOs for the chapter and re-extracts from scratch, even though the staleness-cascade infrastructure for incremental updates already exists downstream — it's just never given a smaller diff to work with.
7. **`pdf-parse` is installed but pointed the wrong direction**: it audits Zyx's own generated diktat PDFs (output QA), not admin-uploaded source PDFs (input extraction) — the dependency exists, the wiring doesn't.

## 4. Subtask list (proposed fix order)

These are scoped to make the upload -> parse -> generate path actually match "upload a PDF, get knowledge," without rewriting unrelated systems (flashcards/diktats/quiz generation already exist and are out of scope here beyond making their upstream KOs trustworthy).

1. **Add real PDF text/markdown extraction.** Use `pdf-parse` (already a dependency) or a Gemini multimodal call on the PDF to produce a first-pass canonical Markdown draft server-side when a PDF is uploaded, instead of treating the PDF as a dead archive. Surface the draft back into the "Dokumen Kanonik" textarea/editor for the admin to review/edit, rather than requiring them to author it from scratch.
2. **Move KO extraction off the request thread.** Mirror the `assessment.ingest` pattern: on publish, insert the MTD/website-material rows, set a real `ingestionStatus` ('pending' -> 'processing' -> 'completed'/'failed') on the learning path, fire `inngest.send({ name: "material.ingest", data: { mtdId, chapterId, ... } })`, and move the `extractKnowledgeObjectsForChapter` call into an Inngest function. Return immediately with a job/status id the admin can poll, the same way `aiGenerationJobs` already does for question generation.
3. **Delete the fake analysis step or make it real.** Either remove `handleStartAnalysis`'s simulated regex report entirely (skip straight from "source" to a real async "processing" state backed by the Inngest job from #2), or repurpose its local checks (LaTeX balance, density) as genuine pre-flight lint that doesn't pretend to measure KO extraction quality. Stop calling it "Tingkat Akurasi & Coverage Ekstraksi" unless it reflects the real pipeline.
4. **Show real extraction results.** After the background job completes, replace the "Laporan Ekstraksi" dialog's data source from the fake `extractedKOs` regex parse with the actual KOs written to `knowledge_objects` for that chapter/mtd, and surface `aiExtractionFailures` rows in the admin UI when extraction degraded to the fallback dummy KO.
5. **Make fallback-to-dummy-KO visible and actionable.** When extraction falls back, mark the chapter/MTD with a distinct status (e.g. `degraded`) instead of silently returning success, and let admins retry extraction specifically (not just the Pinecone chunk sync the current `/retry` route does).
6. **Support incremental re-extraction.** When only part of a chapter's source markdown changes, diff against the previous `sourceHash`'d content (already computed) and re-extract only the affected sections instead of unconditionally deleting and regenerating every KO in the chapter.
7. **Remove the dead `:::concept`/`:::formula` container convention from the UI** (or, if intentional as an authoring aid, actually parse and pass it through to the real extractor as a hint rather than leaving it as a UI-only artifact).

## 5. Open questions before implementing

- Should PDF→Markdown extraction be fully automatic (no admin review) or always land as an editable draft? Given the existing "review & curate" UI shell, an editable-draft approach reuses more of the current UI.
- For incremental re-extraction (#6), is per-section diffing against the previous canonical Markdown acceptable, or does it need to be concept-level (more accurate, more work)?

# Zyx Learning Bundle Specification (v1.1.1)

Status: Canonical contract for the "Learning Bundle" half of the split bundle pipeline.

---

# Purpose

A Learning Bundle carries the learning content for exactly one chapter inside one course: the
course/chapter shell, concepts, Knowledge Objects (KOs), website material, flashcards, and
within-chapter knowledge relationships. It does not carry exam/quiz content; see
[assessment-bundle-spec.md](./assessment-bundle-spec.md) for that.

This is the same JSON shape documented in full in [bsd.v2.1.md](./bsd.v2.1.md). This document only
summarizes the parts relevant to the split and points at the importer that implements it:
[lib/bundle-importer.ts](../../lib/bundle-importer.ts).

---

# Why split from assessment content

A bundle upload always targets exactly one chapter inside one course (see
[knowledge-factory-pipeline-audit.md](../audit/knowledge-factory-pipeline-audit.md)). Large
courses produce large bundles; carrying both the chapter's learning content and its exam/quiz
content in one JSON payload makes the upload slow and impossible to retry piecemeal, since a
typo in one assessment object forces re-uploading the whole chapter. Splitting the two payloads
lets an admin re-run just the learning half or just the assessment half.

The combined format (one JSON with both `course.chapters[].knowledgeObjects` and
`course.assessmentSources`) still works for backward compatibility: `importCourseBundleAction`
and `scripts/import-bundle.ts --bundle` accept it and internally delegate the assessment portion
to the same shared importer the standalone Assessment Bundle uses
([lib/assessment-bundle-importer.ts](../../lib/assessment-bundle-importer.ts)).

---

# Shape

```json
{
  "metadata": {
    "schemaVersion": "1.1.1",
    "generatedAt": "2026-06-18T10:00:00Z",
    "generatedBy": "gemini-workspace/fisika-1a",
    "language": "id",
    "courseCode": "FI1101"
  },
  "author": { "email": "admin@zyx.id", "name": "System Admin" },
  "course": {
    "title": "Fisika Dasar 1A",
    "category": "Sains",
    "description": "Mata kuliah fisika dasar semester 1.",
    "chapters": [
      {
        "$id": "ch-kinematics",
        "title": "Kinematika Satu Dimensi",
        "description": "Mempelajari gerak lurus dalam satu dimensi.",
        "concepts": [],
        "knowledgeObjects": [],
        "websiteMaterials": [],
        "flashcardSets": [],
        "knowledgeRelationships": []
      }
    ]
  }
}
```

A Learning Bundle should contain exactly one entry in `course.chapters[]`. Multiple chapters are
still accepted (importer logs a warning and processes them all), but new exports should produce
one bundle per chapter.

`course.knowledgeRelationships` is **not** used at the course level for cross-chapter links
between KOs in different chapters of the same bundle; that's not supported by the incremental
importer. Declare relationships inside each chapter's own `knowledgeRelationships[]`.

See [bsd.v2.1.md](./bsd.v2.1.md) sections 1-10 for full field-level definitions of `metadata`,
`author`, `course`, `chapter`, `concept`, `knowledgeObject`, `knowledgeRelationship`,
`websiteMaterial`, `flashcardSet`, and `flashcard`. `assessmentSources` (section 11) and
`assessmentObject` (section 12) from that document now belong to the Assessment Bundle instead;
omit them from new Learning Bundle exports.

---

# Chapter identity for a later Assessment Bundle

Every chapter you import here gets a real `chapters.title` row in the database. A standalone
Assessment Bundle uploaded afterward references this chapter **by that title**, not by the
bundle-local `$id` used above (the `$id` only exists inside this one JSON document and isn't
visible to a separately-uploaded bundle). Keep chapter titles stable across re-exports if you
plan to attach assessment content to them later.

---

# Importer

- Shared core: [lib/bundle-importer.ts](../../lib/bundle-importer.ts) (`importChapterBundle`)
- CLI: `bunx tsx scripts/import-bundle.ts --bundle <learning-bundle.json> [--mode create|upsert|append] [--dry-run] [--post-process] [--verbose]`
- Admin UI: "Import Learning Bundle" tab, calling `importCourseBundleAction` in
  [import-actions.ts](../../app/(admin)/admin/(academic)/courses/import-actions.ts)

Re-importing the same chapter diffs Knowledge Objects by their bundle `$id` (stable across
re-exports): unchanged KOs are left alone, changed ones update in place, and KOs no longer
present in the bundle are retired (`status: 'retired'`), never hard-deleted. The chapter's
`derivedHash` gates whether the Master Teaching Document version bumps and whether downstream
assets (website material, flashcards, diktats, question bank) get marked stale.

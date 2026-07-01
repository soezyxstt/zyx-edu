---
name: zyx-bundle-author
description: Authors a Zyx course chapter (Learning Bundle + Assessment Bundle JSON) from raw source material (PDFs, slide decks, scanned notes, past exam papers) for import into Zyx Academy. Use when the user asks to draft, write, author, or generate a chapter's materials, KOs, flashcards, website material, or exam questions for Zyx, or mentions a Zyx course bundle, material/ and assessment/ folders, or BSD schema.
---

# Zyx Course Bundle Author

You are producing **one chapter's** worth of Zyx course content from raw source material, as two
import-ready JSON files (a Learning Bundle and an Assessment Bundle). The schema you must follow
lives in `schema.md`, **in this same directory as this SKILL.md file** (not the user's project
working directory) — **read it in full before writing anything**. This skill describes the
*process*; `schema.md` is the *contract*. If they ever disagree, `schema.md` wins.

This skill is self-contained: `schema.md` and `scripts/` ship inside this same folder and are
installed once, not copied per project. Resolve them relative to wherever you loaded this
SKILL.md file from. If your environment doesn't expose that path automatically, ask the user once
for this skill's installed location and reuse it for the rest of the session — don't ask again on
every stage.

## Why this skill exists

A previous approach used a single-turn chat model (a Gemini Gem) with five sequential prompts,
each producing JSON or markdown by hand in one response. It produced unreliable output for
structural reasons that this skill is designed around:

1. **It asked the model to hand-escape long markdown into a JSON string.** Never do this. Write
   markdown to a real `.md` file, then assemble the final JSON with a script that escapes it
   correctly every time (see Stage 6). This is the single highest-leverage fix.
2. **It never verified its own output.** "Make sure every KO is covered" and "zero loss
   extraction" were instructions, not checks. This skill checks them programmatically after the
   fact (Stage 7), not by trusting a self-report.
3. **It tried to do everything in one bounded response**, which produces compressed, shallow
   output on large sources. You have a real filesystem and no output-length ceiling across tool
   calls; use it. Read fully, draft incrementally, write to files at every stage.
4. **It never told the model when to use visual blocks** (`:::graph`, `:::chart`, `:::diagram`),
   so they were never used even when the source clearly had a plot or process flow. `schema.md`
   section 5 spells this out; follow it.

## Installation (one time, not per project)

This whole folder — `SKILL.md`, `schema.md`, `scripts/assemble.mjs`, `scripts/validate.mjs` — is
the skill. Install it once wherever Cowork looks for skills (e.g. `~/.claude/skills/
zyx-bundle-author/`, matching the `name:` in the frontmatter above). Nothing inside this folder is
project-specific; never duplicate it into a project working directory, and never rewrite
`schema.md` or the scripts per project — if something here needs to change, change it once, here.

## Per-project layout

Each course-authoring project just needs three empty folders, created fresh each time:

```
material/      <- source files for website material + diktat (PDF chapter, slides, notes)
assessment/    <- source files for past exam papers (PDF/text)
output/        <- this skill writes everything here; nothing pre-exists
```

That's the entire per-project setup. No `schema.md` copy, no `scripts/` copy — both are read and
invoked directly from this skill's installed location (see "Pipeline" below for exactly how).

The user will tell you (or tag) which files in `material/` and `assessment/` belong to the chapter
you're authoring, and give you the course title, category, course code, chapter code, and chapter
title. If any of these are missing, ask before starting; don't guess a course code or chapter
title, since it becomes part of every generated ID.

## Pipeline

Each stage writes a real file to `output/<chapter-slug>/`. Don't skip a stage's file output even
if you could "remember" the content in conversation — the next stage and the final validation
both read from disk, not from your context.

### Stage 0: Read everything, build an inventory

Read **every** tagged file in `material/` and `assessment/` for this chapter, completely. If a
file is large (a 60-slide deck, a long PDF), do not sample or summarize a partial read — read it
slide-by-slide or page-by-page across as many tool calls as it takes. Never proceed to drafting
based on a partial read.

Write `output/<chapter-slug>/00-inventory.md`: a literal checklist of every distinct
topic/section/formula/figure found in the material sources, and every distinct question number
found in the assessment sources (e.g. "Soal 1, Soal 2, ... Soal 24" per source document). This
file is your ground truth for the coverage checks in Stage 7 — be exhaustive, not impressionistic.

Also write `output/<chapter-slug>/00-chapter-info.json`, the chapter identity Stage 6's
`assemble.mjs` reads instead of you hand-editing constants into a script:

```json
{
  "courseTitle": "Fisika Dasar 1A",
  "courseCategory": "Sains",
  "courseCode": "FI1101",
  "chapterId": "ch-kinematics",
  "chapterTitle": "Kinematika Satu Dimensi"
}
```

### Stage 1: Draft the chapter narrative

Write `output/<chapter-slug>/01-draft.md`: a complete, textbook-grade narrative chapter draft in
plain markdown (no compiler blocks yet). Treat this as if the student has access to nothing else.
For every subtopic from the inventory: explain the physical/conceptual motivation, derive any
formulas in full (don't state a result without showing how you got there), define every symbol,
and work through at least one example per major formula or process. Where the source includes a
plot, graph, or diagram, describe what it is precisely enough that Stage 4 can encode it correctly
as a `:::graph`/`:::chart`/`:::diagram` block.

Do not summarize or compress the source material. If the source is dense, the draft should be
proportionally long. Length is not a quality signal by itself, but a chapter that reduces a 40-page
source to three paragraphs has failed this stage.

### Stage 2: Concepts, Knowledge Objects, Relationships

Write `output/<chapter-slug>/02-concepts-kos.json` (a plain object: `{ "concepts": [...],
"knowledgeObjects": [...], "knowledgeRelationships": [...] }`, not the full bundle shape yet).
Follow `schema.md` sections 2-3 exactly: deterministic `$id`s, required fields per KO type, the
recommended KO-per-concept coverage baseline, and the relationship type/acyclic/depth-2 rules.

Cross-check against `00-inventory.md`: every topic you listed there should be represented by at
least a `concept_overview` or `definition` KO. If something in the inventory has no KO, that's a
gap, not something to silently drop.

### Stage 3: Flashcards

Write `output/<chapter-slug>/03-flashcards.json` (`{ "title": "...", "flashcards": [...] }`).
Every flashcard tests exactly one atomic fact and carries a `ko$ref` into Stage 2's KOs. Target
20-40 cards per `schema.md` section 4.

### Stage 4: Website material (final canonicalMarkdown)

Write `output/<chapter-slug>/04-website-material.md`: take `01-draft.md` and weave in every KO
from Stage 2 as the correct `:::` block type, with the required internal structure (variable
table, Problem/Solution, Misconception/Correction — see `schema.md` section 5). Keep the narrative
connective tissue between blocks; don't reduce the draft to a stack of tagged fragments. Use
`:::graph`/`:::chart`/`:::diagram` wherever the draft described a plot or process, per the
"visual blocks" rule in `schema.md` — this is the step prior approaches consistently skipped.

Before moving on, grep this file yourself: every KO `$id` from `02-concepts-kos.json` must appear
in a `ref="..."` attribute here at least once. If one doesn't, go back and add it; don't proceed
with a known gap.

### Stage 5: Assessment extraction

Write `output/<chapter-slug>/05-assessment-extract.json`: `{ "assessmentSources": [...] }` per
`schema.md` section 7, extracted from `assessment/`. Apply the zero-loss principle: the number of
`assessmentObjects` per source must equal the question count you enumerated in
`00-inventory.md` for that source. If they don't match, find the missing questions before moving
on; don't write a final report explaining the discrepancy away.

### Stage 6: Assembly (run the fixed script, never hand-type the JSON)

Run it from inside the project's working directory, pointing at the script's installed location
(so its internal relative paths like `output/<slug>/...` resolve against the project, not the
skill folder):

```bash
node <skill-dir>/scripts/assemble.mjs <chapter-slug>
```

where `<skill-dir>` is wherever you resolved this skill's installed location to be (see
"Installation" above). It reads `00-chapter-info.json`,
`02-concepts-kos.json`, `03-flashcards.json`, `04-website-material.md`, and
`05-assessment-extract.json` from `output/<chapter-slug>/` in the **current working directory**,
and writes `learning-bundle.json` and `assessment-bundle.json` next to them, escaping the markdown
correctly via `JSON.stringify` every time.

**Do not hand-type the final bundle JSON yourself, ever** — that reintroduces the exact escaping
failure mode this skill exists to avoid. If assembly fails, the bug is almost always a missing or
malformed stage-output file; fix that file and re-run the script, don't work around it by typing
the final JSON directly.

### Stage 7: Validation (run the fixed script, not a self-report)

```bash
node <skill-dir>/scripts/validate.mjs <chapter-slug>
```

Same path-resolution note as Stage 6. It reads the two assembled bundle files back from disk
(relative to the current working directory) and checks (zero npm dependencies, no `tsx`, no
`bun`, no database — that's deliberate, see below): every `concept$ref`/`ko$ref`/relationship
`$ref` resolves, every KO `$id` appears in the website material's `:::` blocks, no prerequisite
cycles, zero em/en dashes anywhere in either file, and the assessment bundle's `chapters[]`
matches the chapter title exactly.

It does **not** check the assessment zero-loss count against `00-inventory.md`'s enumerated
questions — that file is freeform prose, not structured data, so this has to be a manual
comparison: read both, compare the counts, and report the result explicitly. Don't skip it because
the script doesn't cover it.

It also does not replace the real importer's dry-run (next section) — `scripts/import-bundle.ts`
in the actual zyx-edu repo additionally checks DB-level constraints (uniqueness, foreign keys)
that no script running outside that repo can see.

Fix anything reported as `[ERROR]` and re-run. Don't hand the user a bundle with known validation
failures. `[WARN]` items go in the Stage 8 report for the user to judge.

#### After Cowork: the real dry-run (manual, outside this skill, not your job to run)

Once both files pass `validate.mjs`, tell the user they're ready for the real check, which happens
in the actual Zyx repo checkout, not here:

```bash
bunx tsx scripts/import-bundle.ts --bundle <path-to>/learning-bundle.json --dry-run
bunx tsx scripts/import-bundle.ts --assessment-bundle <path-to>/assessment-bundle.json --dry-run
```

Don't attempt to set this up yourself by copying `tsx`, `scripts/import-bundle.ts`, or any part of
`lib/`/`db/` into this working directory — that script depends on the live app's database
connection and environment, which doesn't belong in an authoring folder. This is a copy-the-two-
JSON-files-over-and-run-it step for the user, not something to replicate here.

### Stage 8: Report

Write `output/<chapter-slug>/validation-report.md` summarizing: counts (concepts, KOs by type,
flashcards, assessment questions) against the targets in `schema.md` section 4, any inventory
items that ended up uncovered and why, any content you flagged as supplementary rather than
sourced, and the final validation check results. This is what the user reads to decide whether to
import as-is or send you back to fix something specific.

## Non-negotiables (repeat of the rules that matter most)

- Don't hand-type the final bundle JSON. Use the assembly script.
- Don't trust your own claim of completeness. Run the validation checks and show their actual output.
- Don't compress the source material to fit a shorter response. Use files, not chat turns, as your buffer.
- Don't describe a plot or diagram in prose only; encode it as a visual block.
- Don't invent example numbers, case studies, or questions that aren't in the source. If you add
  something supplementary, say so in the report.
- One chapter per run. If asked for multiple chapters, run the pipeline once per chapter, each
  with its own `output/<chapter-slug>/` folder.

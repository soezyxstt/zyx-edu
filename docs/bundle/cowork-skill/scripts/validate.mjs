// Structural validation for an assembled Learning Bundle + Assessment Bundle pair.
// Plain Node, zero dependencies: `node scripts/validate.mjs <slug>`.
// Exits non-zero if any [ERROR] is found, so it composes in a shell pipeline if wanted.
//
// This does NOT replace the real importer's dry-run (scripts/import-bundle.ts in the
// zyx-edu repo) — that one also checks DB-level constraints (course/concept uniqueness,
// foreign keys) this script has no access to. Run that separately, in the repo, after
// this passes. See SKILL.md "After Cowork" section.

import { readFileSync } from "node:fs";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/validate.mjs <chapter-slug>");
  process.exit(1);
}

const dir = `output/${slug}`;

const learning = JSON.parse(readFileSync(`${dir}/learning-bundle.json`, "utf-8"));
const assessment = JSON.parse(readFileSync(`${dir}/assessment-bundle.json`, "utf-8"));

const errors = [];
const warnings = [];

const chapter = learning.course.chapters[0];
if (!chapter) errors.push("learning-bundle.json has no chapters[0]");

if (chapter) {
  const conceptIds = new Set(chapter.concepts.map((c) => c.$id));
  const koIds = new Set(chapter.knowledgeObjects.map((k) => k.$id));

  for (const ko of chapter.knowledgeObjects) {
    if (!conceptIds.has(ko.concept$ref)) {
      errors.push(`KO ${ko.$id} has unresolved concept$ref "${ko.concept$ref}"`);
    }
  }

  for (const rel of chapter.knowledgeRelationships ?? []) {
    if (!koIds.has(rel.sourceKo$ref)) errors.push(`Relationship has unresolved sourceKo$ref "${rel.sourceKo$ref}"`);
    if (!koIds.has(rel.targetKo$ref)) errors.push(`Relationship has unresolved targetKo$ref "${rel.targetKo$ref}"`);
    if (rel.sourceKo$ref === rel.targetKo$ref) errors.push(`Relationship is self-referential on ${rel.sourceKo$ref}`);
  }

  for (const fset of chapter.flashcardSets ?? []) {
    for (const fc of fset.flashcards) {
      if (!koIds.has(fc.ko$ref)) errors.push(`Flashcard "${fc.front}" has unresolved ko$ref "${fc.ko$ref}"`);
    }
  }

  const markdown = chapter.websiteMaterials?.[0]?.canonicalMarkdown ?? "";
  for (const koId of koIds) {
    if (!markdown.includes(`ref="${koId}"`)) errors.push(`KO ${koId} never referenced in website material`);
  }

  // Cheap cycle check on prerequisite edges (DFS, flags any back-edge).
  const prereqAdj = new Map();
  for (const rel of chapter.knowledgeRelationships ?? []) {
    if (rel.type !== "prerequisite") continue;
    if (!prereqAdj.has(rel.sourceKo$ref)) prereqAdj.set(rel.sourceKo$ref, []);
    prereqAdj.get(rel.sourceKo$ref).push(rel.targetKo$ref);
  }
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();
  function dfs(node) {
    color.set(node, GRAY);
    for (const next of prereqAdj.get(node) ?? []) {
      const c = color.get(next) ?? WHITE;
      if (c === GRAY) {
        errors.push(`Prerequisite cycle detected involving ${node} -> ${next}`);
      } else if (c === WHITE) {
        dfs(next);
      }
    }
    color.set(node, BLACK);
  }
  for (const node of prereqAdj.keys()) {
    if ((color.get(node) ?? WHITE) === WHITE) dfs(node);
  }
}

function scanDashes(obj, path) {
  if (typeof obj === "string") {
    if (obj.includes("—") || obj.includes("–")) errors.push(`Em/en dash found at ${path}`);
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => scanDashes(v, `${path}[${i}]`));
  } else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) scanDashes(v, `${path}.${k}`);
  }
}
scanDashes(learning, "learning");
scanDashes(assessment, "assessment");

if (chapter) {
  for (const src of assessment.assessmentSources ?? []) {
    if (src.chapters && !src.chapters.includes(chapter.title)) {
      warnings.push(`Assessment source "${src.title}" chapters[] does not include "${chapter.title}"`);
    }
  }
}

console.log(
  errors.length === 0
    ? `PASS: 0 errors, ${warnings.length} warnings`
    : `FAIL: ${errors.length} errors, ${warnings.length} warnings`,
);
errors.forEach((e) => console.log(`  [ERROR] ${e}`));
warnings.forEach((w) => console.log(`  [WARN] ${w}`));
console.log("");
console.log(
  "Note: this does not check the assessment zero-loss count against 00-inventory.md's enumerated " +
  "questions (freeform text, not parsed here) — compare that by hand. It also does not replace the " +
  "real importer's --dry-run, which checks DB-level constraints this script can't see.",
);

process.exitCode = errors.length === 0 ? 0 : 1;

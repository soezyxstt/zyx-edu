// Assembles output/<slug>/learning-bundle.json and assessment-bundle.json from the
// intermediate stage files. Plain Node, zero dependencies: `node scripts/assemble.mjs <slug>`.
//
// Reads chapter identity (course title/category/code, chapter $id/title) from
// output/<slug>/00-chapter-info.json instead of hardcoded constants, so this file never
// needs to be edited per chapter. See SKILL.md Stage 0 for what writes that file.

import { readFileSync, writeFileSync } from "node:fs";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/assemble.mjs <chapter-slug>");
  process.exit(1);
}

const dir = `output/${slug}`;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

const info = readJson(`${dir}/00-chapter-info.json`);
const websiteMarkdown = readFileSync(`${dir}/04-website-material.md`, "utf-8");
const { concepts, knowledgeObjects, knowledgeRelationships } = readJson(`${dir}/02-concepts-kos.json`);
const flashcardSet = readJson(`${dir}/03-flashcards.json`);
const { assessmentSources } = readJson(`${dir}/05-assessment-extract.json`);

const learningBundle = {
  metadata: {
    schemaVersion: "1.1.1",
    generatedAt: new Date().toISOString(),
    generatedBy: "cowork/zyx-bundle-author",
    language: "id",
    courseCode: info.courseCode,
  },
  course: {
    title: info.courseTitle,
    category: info.courseCategory,
    chapters: [
      {
        $id: info.chapterId,
        title: info.chapterTitle,
        concepts,
        knowledgeObjects,
        knowledgeRelationships,
        websiteMaterials: [{ title: info.chapterTitle, canonicalMarkdown: websiteMarkdown }],
        flashcardSets: [flashcardSet],
      },
    ],
  },
};

const assessmentBundle = {
  metadata: {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    generatedBy: "cowork/zyx-bundle-author",
  },
  course: { title: info.courseTitle },
  assessmentSources,
};

writeFileSync(`${dir}/learning-bundle.json`, JSON.stringify(learningBundle, null, 2));
writeFileSync(`${dir}/assessment-bundle.json`, JSON.stringify(assessmentBundle, null, 2));
console.log(`Wrote ${dir}/learning-bundle.json and ${dir}/assessment-bundle.json`);

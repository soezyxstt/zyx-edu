import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { db } from "../db";
import {
  user,
  courses,
  concepts,
  conceptLocalizations,
  masterTeachingDocuments,
  chapters,
  knowledgeObjects,
  websiteMaterials,
  flashcardSets,
  flashcards,
  assessmentSources,
  assessmentSourceChapters,
  assessmentObjects,
  knowledgeRelationships,
  vectorSyncQueue,
  assessmentObjectConcepts,
  assessmentObjectKos,
} from "../db/schema";
import { slugify } from "../lib/ko-utils";
import { randomUUID, createHash } from "crypto";
import { eq, and, inArray } from "drizzle-orm";
import * as fs from "fs";
import { updateAssessmentProfile } from "../lib/assessment-extractor";

// Import post-processing functions
import { compileMarkdown } from "../lib/markdown-compiler";
import { verifyKOCoverage } from "../lib/ko-coverage-auditor";
import { buildTermIndex } from "../lib/term-index";
import { buildConceptGraph } from "../lib/graph-trace";

interface BundleKO {
  $id?: string;
  title: string;
  concept$ref?: string;
  conceptName?: string;
  content: string;
  type: any;
  bloomLevel: any;
  difficulty?: any;
  importance?: any;
  tags?: string[];
  source?: any;
}

interface BundleFlashcard {
  ko$ref?: string;
  front: string;
  back: string;
  explanation?: string;
  source?: any;
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function computeMaterialHash(kos: BundleKO[]): string {
  const hash = createHash("sha256");
  kos.forEach((ko) => {
    hash.update(`${ko.title}:${ko.content}`);
  });
  return hash.digest("hex");
}

function computeFlashcardSetHash(fcs: BundleFlashcard[]): string {
  const hash = createHash("sha256");
  fcs.forEach((fc) => {
    hash.update(`${fc.front}:${fc.back}`);
  });
  return hash.digest("hex");
}

function canonicalizeMarkdown(md: string, idMap: Map<string, string>): string {
  return md.replace(/ref="([^"]+)"/g, (match, ref) => {
    const uuid = idMap.get(ref);
    if (!uuid) throw new Error(`Unresolvable markdown ref: "${ref}"`);
    return `koId="${uuid}"`;
  });
}

function chunks<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  
  // CLI flags
  let bundlePath = "";
  let mode: "create" | "upsert" | "append" = "create";
  let dryRun = false;
  let postProcess = false;
  let verbose = false;

  const bundleIdx = args.indexOf("--bundle");
  if (bundleIdx !== -1 && args[bundleIdx + 1]) {
    bundlePath = args[bundleIdx + 1];
  } else {
    // Treat the first positional arg that does not start with -- as the bundle path
    const positional = args.filter(a => !a.startsWith("-"));
    if (positional.length > 0) {
      bundlePath = positional[0];
    }
  }

  if (args.includes("--mode")) {
    const modeIdx = args.indexOf("--mode");
    const modeVal = args[modeIdx + 1];
    if (modeVal === "create" || modeVal === "upsert" || modeVal === "append") {
      mode = modeVal;
    }
  }

  if (args.includes("--dry-run") || args.includes("--validate")) {
    dryRun = true;
  }

  if (args.includes("--post-process")) {
    postProcess = true;
  }

  if (args.includes("--verbose")) {
    verbose = true;
  }

  if (!bundlePath) {
    console.error("Usage: bunx tsx scripts/import-bundle.ts --bundle <path> [--mode <create|upsert|append>] [--dry-run] [--post-process] [--verbose]");
    process.exit(1);
  }

  console.log(`=== ZYX BUNDLE IMPORTER ===`);
  console.log(`Bundle Path:  ${bundlePath}`);
  console.log(`Import Mode:  ${mode}`);
  console.log(`Dry Run:      ${dryRun}`);
  console.log(`Post-Process: ${postProcess}`);
  console.log(`Verbose:      ${verbose}\n`);

  // 1. Read and parse bundle JSON
  if (!fs.existsSync(bundlePath)) {
    console.error(`Error: Bundle file not found at path: ${bundlePath}`);
    process.exit(1);
  }

  let bundle: any;
  try {
    const fileContent = fs.readFileSync(bundlePath, "utf-8");
    bundle = JSON.parse(fileContent);
  } catch (err: any) {
    console.error(`Error: Failed to parse bundle JSON: ${err.message}`);
    process.exit(1);
  }

  // 2. Validate basic structure & metadata version
  if (!bundle.metadata || !bundle.metadata.schemaVersion) {
    console.error("Error: Missing bundle metadata or schemaVersion.");
    process.exit(1);
  }

  const ver = bundle.metadata.schemaVersion;
  if (ver !== "1.0" && ver !== "1.1" && ver !== "1.1.1") {
    console.error(`Error: Unsupported schema version "${ver}". Importer supports 1.0, 1.1, and 1.1.1.`);
    process.exit(1);
  }

  if (!bundle.course || !bundle.course.title || !bundle.course.category) {
    console.error("Error: Course object must specify a title and category.");
    process.exit(1);
  }

  if (!Array.isArray(bundle.course.chapters) || bundle.course.chapters.length === 0) {
    console.error("Error: Course must contain a non-empty chapters array.");
    process.exit(1);
  }

  // 3. Setup Author User (Phase 2)
  const importerEmail = "bundle-importer@zyx.internal";
  let authorUuid = "bundle-importer";

  // Look up system user or bundle author
  const authorEmail = bundle.author?.email || importerEmail;
  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, authorEmail))
    .limit(1);

  let isNewUser = false;
  let userRow: any = null;

  if (dbUser) {
    authorUuid = dbUser.id;
  } else {
    // If the lookup is specifically for the system importer, prepare to insert it
    if (authorEmail === importerEmail) {
      isNewUser = true;
      userRow = {
        id: "bundle-importer",
        name: "Bundle Importer",
        email: importerEmail,
        emailVerified: true,
        role: "teacher" as const,
      };
      authorUuid = "bundle-importer";
      console.log(`System user "bundle-importer@zyx.internal" not found. It will be created.`);
    } else {
      // For any other author email, resolve back to the system importer
      const [systemUser] = await db
        .select()
        .from(user)
        .where(eq(user.email, importerEmail))
        .limit(1);
      
      if (systemUser) {
        authorUuid = systemUser.id;
      } else {
        isNewUser = true;
        userRow = {
          id: "bundle-importer",
          name: "Bundle Importer",
          email: importerEmail,
          emailVerified: true,
          role: "teacher" as const,
        };
        authorUuid = "bundle-importer";
      }
      console.log(`Author email "${authorEmail}" not found. Falling back to system importer user.`);
    }
  }

  // 4. Construct Reference Maps & Generate UUIDs (Pass 1)
  const idMap = new Map<string, string>();
  const chapterMtdMap = new Map<string, string>(); // chapter ID/slug -> MTD UUID
  const conceptDisplayNameMap = new Map<string, string>(); // concept $id -> first localization displayName

  // Resolve course UUID
  let courseUuid: string = randomUUID();
  if (mode === "upsert") {
    const [existingCourse] = await db
      .select()
      .from(courses)
      .where(eq(courses.title, bundle.course.title))
      .limit(1);
    if (existingCourse) {
      courseUuid = existingCourse.id;
      console.log(`Found existing course: "${bundle.course.title}" (${courseUuid}). Reusing ID in upsert mode.`);
    }
  }
  idMap.set("$course", courseUuid);

  // Parse Chapters and children
  const mtdRows: any[] = [];
  const chapterRows: any[] = [];
  const conceptRows: any[] = [];
  const localizationRows: any[] = [];
  const koRows: any[] = [];
  const wmRows: any[] = [];
  const fsetRows: any[] = [];
  const fcRows: any[] = [];

  for (const [chIdx, chapter] of bundle.course.chapters.entries()) {
    let chapterUuid: string = randomUUID();
    const chapterRefKey = chapter.$id || chapter.id || `$chapter-${chIdx}`;
    
    if (mode === "upsert") {
      const [existingChapter] = await db
        .select()
        .from(chapters)
        .where(and(eq(chapters.courseId, courseUuid), eq(chapters.title, chapter.title)))
        .limit(1);
      if (existingChapter) {
        chapterUuid = existingChapter.id;
      }
    }
    
    idMap.set(chapterRefKey, chapterUuid);

    // Resolve MTD ID (1 Chapter = 1 MTD constraint)
    let mtdUuid: string = `mtd-${randomUUID()}`;
    if (mode === "upsert") {
      // Try to find websiteMaterial first as it connects chapterId and sourceMtdId
      const [existingWm] = await db
        .select()
        .from(websiteMaterials)
        .where(and(eq(websiteMaterials.courseId, courseUuid), eq(websiteMaterials.chapterId, chapterUuid)))
        .limit(1);
      if (existingWm) {
        mtdUuid = existingWm.sourceMtdId;
      } else {
        // Fall back to querying KOs for the chapter
        const [existingKo] = await db
          .select()
          .from(knowledgeObjects)
          .where(and(eq(knowledgeObjects.courseId, courseUuid), eq(knowledgeObjects.chapterId, chapterUuid)))
          .limit(1);
        if (existingKo) {
          mtdUuid = existingKo.mtdId;
        }
      }
    }
    chapterMtdMap.set(chapterUuid, mtdUuid);

    // Generate chapter row
    chapterRows.push({
      id: chapterUuid,
      courseId: courseUuid,
      title: chapter.title,
      description: chapter.description || null,
      orderIndex: chIdx + 1,
      status: "draft",
      assetGenStatus: "idle",
    });

    // Populate concepts maps and rows
    for (const [conIdx, concept] of (chapter.concepts || []).entries()) {
      let conceptUuid: string = randomUUID();
      const conceptRefKey = concept.$id || concept.id || `$concept-${chIdx}-${conIdx}`;

      if (mode === "upsert" || mode === "append") {
        const [existingConcept] = await db
          .select()
          .from(concepts)
          .where(eq(concepts.canonicalSlug, concept.canonicalSlug))
          .limit(1);
        if (existingConcept) {
          conceptUuid = existingConcept.id;
        }
      }

      idMap.set(conceptRefKey, conceptUuid);

      const firstDisplayName = concept.localizations?.[0]?.displayName || "Concept";
      const conceptRefId = concept.$id || concept.id;
      if (conceptRefId) {
        conceptDisplayNameMap.set(conceptRefId, firstDisplayName);
      }

      conceptRows.push({
        id: conceptUuid,
        canonicalSlug: concept.canonicalSlug,
        isVerified: false,
      });

      for (const loc of (concept.localizations || [])) {
        localizationRows.push({
          id: randomUUID(),
          conceptId: conceptUuid,
          lang: loc.lang,
          displayName: loc.displayName,
          aliases: loc.aliases || [],
          technicalStandardTerm: "id",
        });
      }
    }

    // Process Knowledge Objects
    for (const [koIdx, ko] of (chapter.knowledgeObjects || []).entries()) {
      let koUuid: string = `ko-${randomUUID()}`;
      const koRefKey = ko.$id || ko.id || `$ko-${chIdx}-${koIdx}`;

      if (mode === "upsert") {
        const [existingKo] = await db
          .select()
          .from(knowledgeObjects)
          .where(and(eq(knowledgeObjects.chapterId, chapterUuid), eq(knowledgeObjects.title, ko.title)))
          .limit(1);
        if (existingKo) {
          koUuid = existingKo.id;
        }
      }

      idMap.set(koRefKey, koUuid);
    }

    // Process Website Materials
    const firstWm = chapter.websiteMaterials?.[0];
    const canonicalMarkdown = firstWm ? canonicalizeMarkdown(firstWm.canonicalMarkdown, idMap) : `# ${chapter.title}`;
    
    mtdRows.push({
      id: mtdUuid,
      courseId: courseUuid,
      title: `MTD - ${chapter.title}`,
      markdownContent: canonicalMarkdown,
      version: 1,
      status: "draft",
      type: "learning",
      createdById: authorUuid,
    });

    if (firstWm) {
      let wmUuid: string = `wm-${randomUUID()}`;
      if (mode === "upsert") {
        const [existingWm] = await db
          .select()
          .from(websiteMaterials)
          .where(and(eq(websiteMaterials.chapterId, chapterUuid), eq(websiteMaterials.slug, firstWm.slug || slugify(firstWm.title))))
          .limit(1);
        if (existingWm) {
          wmUuid = existingWm.id;
        }
      }

      wmRows.push({
        id: wmUuid,
        courseId: courseUuid,
        chapterId: chapterUuid,
        sourceMtdId: mtdUuid,
        sourceMtdVersion: 1,
        generationHash: computeMaterialHash(chapter.knowledgeObjects || []),
        title: firstWm.title,
        slug: firstWm.slug || slugify(firstWm.title),
        canonicalMarkdown,
        structuredContent: firstWm.structuredContent || {},
        status: "draft",
      });
    }

    // Process Flashcard Sets
    for (const fset of (chapter.flashcardSets || [])) {
      let fsetUuid: string = `fset-${randomUUID()}`;
      if (mode === "upsert") {
        const [existingFset] = await db
          .select()
          .from(flashcardSets)
          .where(and(eq(flashcardSets.chapterId, chapterUuid), eq(flashcardSets.title, fset.title)))
          .limit(1);
        if (existingFset) {
          fsetUuid = existingFset.id;
        }
      }

      fsetRows.push({
        id: fsetUuid,
        courseId: courseUuid,
        chapterId: chapterUuid,
        sourceMtdId: mtdUuid,
        sourceMtdVersion: 1,
        generationHash: computeFlashcardSetHash(fset.flashcards || []),
        title: fset.title,
        status: "draft",
      });

      for (const fcard of (fset.flashcards || [])) {
        let fcUuid: string = `fc-${randomUUID()}`;
        if (mode === "upsert") {
          const [existingFc] = await db
            .select()
            .from(flashcards)
            .where(and(eq(flashcards.setId, fsetUuid), eq(flashcards.front, fcard.front)))
            .limit(1);
          if (existingFc) {
            fcUuid = existingFc.id;
          }
        }

        fcRows.push({
          id: fcUuid,
          setId: fsetUuid,
          koId: fcard.ko$ref ? idMap.get(fcard.ko$ref) || null : null,
          front: fcard.front,
          back: fcard.back,
          explanation: fcard.explanation || null,
          metadata: fcard.source ? { _source: fcard.source } : {},
        });
      }
    }
  }

  // Generate KOs Rows (Pass 2)
  for (const [chIdx, chapter] of bundle.course.chapters.entries()) {
    const chapterUuid = idMap.get(chapter.$id || chapter.id || `$chapter-${chIdx}`)!;
    const mtdUuid = chapterMtdMap.get(chapterUuid)!;

    for (const [koIdx, ko] of (chapter.knowledgeObjects || []).entries()) {
      const koUuid = idMap.get(ko.$id || ko.id || `$ko-${chIdx}-${koIdx}`)!;
      
      // Resolve concept ID
      let resolvedConceptUuid = "";
      let resolvedConceptName = "";

      if (ko.concept$ref) {
        const matchingUuid = idMap.get(ko.concept$ref);
        if (matchingUuid) {
          resolvedConceptUuid = matchingUuid;
        }
        resolvedConceptName = conceptDisplayNameMap.get(ko.concept$ref) || "Concept";
      } else if (ko.conceptName) {
        // Find concept by localization display name inside this chapter
        const chapterConcepts = chapter.concepts || [];
        const matched = chapterConcepts.find((c: any) => 
          (c.localizations || []).some((loc: any) => loc.displayName === ko.conceptName)
        );
        if (matched) {
          resolvedConceptUuid = idMap.get(matched.$id || matched.id || `$concept-${chIdx}-${chapterConcepts.indexOf(matched)}`)!;
        }
        resolvedConceptName = ko.conceptName;
      }

      if (!resolvedConceptUuid) {
        throw new Error(`Failed to resolve concept for KO "${ko.title}" in Chapter "${chapter.title}".`);
      }

      koRows.push({
        id: koUuid,
        courseId: courseUuid,
        mtdId: mtdUuid,
        chapterId: chapterUuid,
        conceptId: resolvedConceptUuid,
        learningOrder: koIdx + 1,
        title: ko.title,
        conceptName: resolvedConceptName,
        content: ko.content,
        type: ko.type,
        bloomLevel: ko.bloomLevel,
        difficulty: ko.difficulty || "medium",
        tags: ko.tags || [],
        importance: ko.importance || "medium",
        metadata: ko.source ? { _source: ko.source } : {},
      });
    }
  }

  // 5. Process Course-level Assessment Sources and Relationships (Pass 2)
  const asRows: any[] = [];
  const ascRows: any[] = [];
  const aoRows: any[] = [];
  const krRows: any[] = [];

  const bundleAssessmentSources = bundle.course["course.assessmentSources"] || bundle.course.assessmentSources || [];
  for (const as of bundleAssessmentSources) {
    let asrcUuid: string = `asrc-${randomUUID()}`;
    if (mode === "upsert") {
      const [existingAsrc] = await db
        .select()
        .from(assessmentSources)
        .where(and(eq(assessmentSources.courseId, courseUuid), eq(assessmentSources.title, as.title)))
        .limit(1);
      if (existingAsrc) {
        asrcUuid = existingAsrc.id;
      }
    }

    asRows.push({
      id: asrcUuid,
      courseId: courseUuid,
      title: as.title,
      origin: "generated",
      category: as.category,
      year: as.year,
      semester: as.semester || null,
      sourceMarkdown: as.sourceMarkdown,
      sourceHash: sha256(as.sourceMarkdown),
      originalFilename: as.source?.file || null,
      uploadedByUserId: authorUuid,
      ingestionStatus: "completed" as const,
      ingestionCompletedAt: new Date(),
    });

    // Resolve chapters
    for (const ref of (as.chapters || [])) {
      let resolvedChapterUuid = "";
      const matchedChapterUuid = idMap.get(ref);
      if (matchedChapterUuid) {
        resolvedChapterUuid = matchedChapterUuid;
      } else {
        // Fallback: match by title
        const matched = bundle.course.chapters.find((c: any) => c.title === ref);
        if (matched) {
          const index = bundle.course.chapters.indexOf(matched);
          resolvedChapterUuid = idMap.get(`$chapter-${index}`)!;
        }
      }

      if (!resolvedChapterUuid) {
        throw new Error(`Failed to resolve chapter ref "${ref}" for Assessment Source "${as.title}".`);
      }

      let ascUuid: string = `asc-${randomUUID()}`;
      if (mode === "upsert") {
        const [existingAsc] = await db
          .select()
          .from(assessmentSourceChapters)
          .where(and(eq(assessmentSourceChapters.assessmentSourceId, asrcUuid), eq(assessmentSourceChapters.chapterId, resolvedChapterUuid)))
          .limit(1);
        if (existingAsc) {
          ascUuid = existingAsc.id;
        }
      }

      ascRows.push({
        id: ascUuid,
        assessmentSourceId: asrcUuid,
        chapterId: resolvedChapterUuid,
      });
    }

    // Process questions
    for (const [aoIdx, ao] of (as.assessmentObjects || []).entries()) {
      let aoUuid: string = `ao-${randomUUID()}`;
      if (mode === "upsert") {
        const [existingAo] = await db
          .select()
          .from(assessmentObjects)
          .where(and(eq(assessmentObjects.sourceId, asrcUuid), eq(assessmentObjects.questionOrder, aoIdx + 1)))
          .limit(1);
        if (existingAo) {
          aoUuid = existingAo.id;
        }
      }

      aoRows.push({
        id: aoUuid,
        sourceId: asrcUuid,
        questionOrder: aoIdx + 1,
        questionType: ao.questionType,
        difficulty: ao.difficulty,
        pattern: ao.pattern || "general",
        reasoningType: ao.reasoningType || "analytical",
        estimatedSteps: ao.estimatedSteps || 1,
        applicationLevel: ao.applicationLevel || 1,
        questionMarkdown: ao.questionMarkdown || "",
        answerMarkdown: ao.answerMarkdown || null,
        options: ao.options || null,
        canonicalQuestionHash: ao.canonicalQuestionHash || sha256(ao.questionMarkdown || ""),
      });
    }
  }

  // Parse Relationships
  for (const kr of (bundle.course.knowledgeRelationships || [])) {
    const srcUuid = idMap.get(kr.sourceKo$ref);
    const tgtUuid = idMap.get(kr.targetKo$ref);

    if (!srcUuid || !tgtUuid) {
      throw new Error(`Failed to resolve KO refs for relationship: ${kr.sourceKo$ref} -> ${kr.targetKo$ref}`);
    }

    let krUuid: string = `kr-${randomUUID()}`;
    if (mode === "upsert") {
      const [existingKr] = await db
        .select()
        .from(knowledgeRelationships)
        .where(and(eq(knowledgeRelationships.sourceKoId, srcUuid), eq(knowledgeRelationships.targetKoId, tgtUuid), eq(knowledgeRelationships.type, kr.type)))
        .limit(1);
      if (existingKr) {
        krUuid = existingKr.id;
      }
    }

    krRows.push({
      id: krUuid,
      sourceKoId: srcUuid,
      targetKoId: tgtUuid,
      type: kr.type,
    });
  }

  // 6. DB Write Execution
  if (dryRun) {
    console.log("Validation successful! Dry run mode: database writes skipped.");
    process.exit(0);
  }

  console.log("Writing rows to database inside transaction...");

  try {
    const stats = await db.transaction(async (tx) => {
      // User Row
      if (isNewUser && userRow) {
        if (verbose) console.log("Inserting system import user...");
        await tx.insert(user).values(userRow).onConflictDoNothing();
      }

      // Course Row
      if (verbose) console.log("Inserting course...");
      if (mode === "upsert") {
        await tx.insert(courses).values({
          id: courseUuid,
          title: bundle.course.title,
          category: bundle.course.category,
          description: bundle.course.description || null,
        }).onConflictDoUpdate({
          target: courses.id,
          set: {
            title: bundle.course.title,
            category: bundle.course.category,
            description: bundle.course.description || null,
          }
        });
      } else if (mode === "append") {
        await tx.insert(courses).values({
          id: courseUuid,
          title: bundle.course.title,
          category: bundle.course.category,
          description: bundle.course.description || null,
        }).onConflictDoNothing();
      } else {
        await tx.insert(courses).values({
          id: courseUuid,
          title: bundle.course.title,
          category: bundle.course.category,
          description: bundle.course.description || null,
        });
      }

      // Concepts
      if (conceptRows.length > 0) {
        if (verbose) console.log(`Inserting ${conceptRows.length} concepts...`);
        for (const c of conceptRows) {
          if (mode === "upsert" || mode === "append") {
            await tx.insert(concepts).values(c).onConflictDoNothing();
          } else {
            await tx.insert(concepts).values(c);
          }
        }
      }

      // Localizations
      if (localizationRows.length > 0) {
        if (verbose) console.log(`Inserting ${localizationRows.length} concept localizations...`);
        for (const loc of localizationRows) {
          if (mode === "upsert" || mode === "append") {
            await tx.insert(conceptLocalizations).values(loc).onConflictDoNothing();
          } else {
            await tx.insert(conceptLocalizations).values(loc);
          }
        }
      }

      // Master Teaching Documents
      if (verbose) console.log(`Inserting ${mtdRows.length} master teaching documents...`);
      for (const mtd of mtdRows) {
        if (mode === "upsert") {
          await tx.insert(masterTeachingDocuments).values(mtd).onConflictDoUpdate({
            target: masterTeachingDocuments.id,
            set: {
              title: mtd.title,
              markdownContent: mtd.markdownContent,
              updatedAt: new Date(),
            }
          });
        } else if (mode === "append") {
          await tx.insert(masterTeachingDocuments).values(mtd).onConflictDoNothing();
        } else {
          await tx.insert(masterTeachingDocuments).values(mtd);
        }
      }

      // Chapters
      if (verbose) console.log(`Inserting ${chapterRows.length} chapters...`);
      for (const chap of chapterRows) {
        if (mode === "upsert") {
          await tx.insert(chapters).values(chap).onConflictDoUpdate({
            target: chapters.id,
            set: {
              title: chap.title,
              description: chap.description,
              orderIndex: chap.orderIndex,
              updatedAt: new Date(),
            }
          });
        } else if (mode === "append") {
          await tx.insert(chapters).values(chap).onConflictDoNothing();
        } else {
          await tx.insert(chapters).values(chap);
        }
      }

      // Knowledge Objects (batch of 100)
      if (koRows.length > 0) {
        if (verbose) console.log(`Inserting ${koRows.length} knowledge objects...`);
        for (const batch of chunks(koRows, 100)) {
          for (const row of batch) {
            if (mode === "upsert") {
              await tx.insert(knowledgeObjects).values(row).onConflictDoUpdate({
                target: knowledgeObjects.id,
                set: {
                  conceptId: row.conceptId,
                  learningOrder: row.learningOrder,
                  title: row.title,
                  conceptName: row.conceptName,
                  content: row.content,
                  type: row.type,
                  bloomLevel: row.bloomLevel,
                  difficulty: row.difficulty,
                  tags: row.tags,
                  importance: row.importance,
                  metadata: row.metadata,
                  updatedAt: new Date(),
                }
              });
            } else if (mode === "append") {
              await tx.insert(knowledgeObjects).values(row).onConflictDoNothing();
            } else {
              await tx.insert(knowledgeObjects).values(row);
            }
          }
        }
      }

      // Website Materials (batch of 100)
      if (wmRows.length > 0) {
        if (verbose) console.log(`Inserting ${wmRows.length} website materials...`);
        for (const batch of chunks(wmRows, 100)) {
          for (const row of batch) {
            if (mode === "upsert") {
              await tx.insert(websiteMaterials).values(row).onConflictDoUpdate({
                target: websiteMaterials.id,
                set: {
                  title: row.title,
                  slug: row.slug,
                  canonicalMarkdown: row.canonicalMarkdown,
                  structuredContent: row.structuredContent,
                  generationHash: row.generationHash,
                  updatedAt: new Date(),
                }
              });
            } else if (mode === "append") {
              await tx.insert(websiteMaterials).values(row).onConflictDoNothing();
            } else {
              await tx.insert(websiteMaterials).values(row);
            }
          }
        }
      }

      // Flashcard Sets
      if (fsetRows.length > 0) {
        if (verbose) console.log(`Inserting ${fsetRows.length} flashcard sets...`);
        for (const row of fsetRows) {
          if (mode === "upsert") {
            await tx.insert(flashcardSets).values(row).onConflictDoUpdate({
              target: flashcardSets.id,
              set: {
                title: row.title,
                generationHash: row.generationHash,
                updatedAt: new Date(),
              }
            });
          } else if (mode === "append") {
            await tx.insert(flashcardSets).values(row).onConflictDoNothing();
          } else {
            await tx.insert(flashcardSets).values(row);
          }
        }
      }

      // Flashcards
      if (fcRows.length > 0) {
        if (verbose) console.log(`Inserting ${fcRows.length} flashcards...`);
        for (const batch of chunks(fcRows, 100)) {
          for (const row of batch) {
            if (mode === "upsert") {
              await tx.insert(flashcards).values(row).onConflictDoUpdate({
                target: flashcards.id,
                set: {
                  koId: row.koId,
                  front: row.front,
                  back: row.back,
                  explanation: row.explanation,
                  metadata: row.metadata,
                }
              });
            } else if (mode === "append") {
              await tx.insert(flashcards).values(row).onConflictDoNothing();
            } else {
              await tx.insert(flashcards).values(row);
            }
          }
        }
      }

      // Assessment Sources
      if (asRows.length > 0) {
        if (verbose) console.log(`Inserting ${asRows.length} assessment sources...`);
        for (const row of asRows) {
          if (mode === "upsert") {
            await tx.insert(assessmentSources).values(row).onConflictDoUpdate({
              target: assessmentSources.id,
              set: {
                title: row.title,
                sourceMarkdown: row.sourceMarkdown,
                sourceHash: row.sourceHash,
                originalFilename: row.originalFilename,
                ingestionStatus: row.ingestionStatus,
                ingestionCompletedAt: row.ingestionCompletedAt,
                updatedAt: new Date(),
              }
            });
          } else if (mode === "append") {
            await tx.insert(assessmentSources).values(row).onConflictDoNothing();
          } else {
            await tx.insert(assessmentSources).values(row);
          }
        }
      }

      // Assessment Source Chapters
      if (ascRows.length > 0) {
        if (verbose) console.log(`Inserting ${ascRows.length} assessment source chapters...`);
        for (const row of ascRows) {
          if (mode === "upsert" || mode === "append") {
            await tx.insert(assessmentSourceChapters).values(row).onConflictDoNothing();
          } else {
            await tx.insert(assessmentSourceChapters).values(row);
          }
        }
      }

      // Assessment Objects
      if (aoRows.length > 0) {
        if (verbose) console.log(`Inserting ${aoRows.length} assessment objects...`);
        for (const batch of chunks(aoRows, 100)) {
          for (const row of batch) {
            if (mode === "upsert") {
              await tx.insert(assessmentObjects).values(row).onConflictDoUpdate({
                target: assessmentObjects.id,
                set: {
                  questionType: row.questionType,
                  difficulty: row.difficulty,
                  pattern: row.pattern,
                  reasoningType: row.reasoningType,
                  estimatedSteps: row.estimatedSteps,
                  applicationLevel: row.applicationLevel,
                  questionMarkdown: row.questionMarkdown,
                  answerMarkdown: row.answerMarkdown,
                  options: row.options,
                  canonicalQuestionHash: row.canonicalQuestionHash,
                  updatedAt: new Date(),
                }
              });
            } else if (mode === "append") {
              await tx.insert(assessmentObjects).values(row).onConflictDoNothing();
            } else {
              await tx.insert(assessmentObjects).values(row);
            }
          }
        }
      }

      // Knowledge Relationships
      if (krRows.length > 0) {
        if (verbose) console.log(`Inserting ${krRows.length} knowledge relationships...`);
        for (const row of krRows) {
          if (mode === "upsert" || mode === "append") {
            await tx.insert(knowledgeRelationships).values(row).onConflictDoNothing();
          } else {
            await tx.insert(knowledgeRelationships).values(row);
          }
        }
      }

      return {
        courseId: courseUuid,
        chapterCount: chapterRows.length,
        koCount: koRows.length,
        wmCount: wmRows.length,
        fsetCount: fsetRows.length,
        fcCount: fcRows.length,
        asCount: asRows.length,
        aoCount: aoRows.length,
        krCount: krRows.length,
      };
    });

    console.log(`\n─── Import Complete ───`);
    console.log(`Course ID:     ${stats.courseId}`);
    console.log(`Chapters:      ${stats.chapterCount}`);
    console.log(`KOs:           ${stats.koCount}`);
    console.log(`Materials:     ${stats.wmCount}`);
    console.log(`Flashcards:    ${stats.fcCount} (in ${stats.fsetCount} sets)`);
    console.log(`Past Exams:    ${stats.asCount} (${stats.aoCount} objects)`);
    console.log(`Relationships: ${stats.krCount}`);
    console.log(`───────────────────────\n`);

    // 7. Non-AI Post-Processing (Phase 5)
    if (postProcess) {
      console.log("Starting non-AI post-processing...");
      
      const courseId = stats.courseId;
      const materialsList = await db.select().from(websiteMaterials).where(eq(websiteMaterials.courseId, courseId));
      
      for (const row of materialsList) {
        console.log(`Processing material for Chapter ID: ${row.chapterId} ("${row.title}")`);
        try {
          // compile markdown to AST
          const compilerResult = compileMarkdown(row.canonicalMarkdown, row.chapterId, row.courseId);
          const errors = compilerResult.diagnostics.filter(d => d.severity === "error");
          
          if (errors.length > 0) {
            console.error(`  [FAIL] Compilation failed with ${errors.length} errors:`);
            errors.forEach(e => console.error(`    - ${e.message}`));
            continue;
          }

          // verify KO coverage
          const verification = await verifyKOCoverage(row.chapterId, compilerResult.ast);
          
          // build term popover index
          const termIndex = await buildTermIndex(row.chapterId);
          
          const structuredContent = {
            markdown: row.canonicalMarkdown,
            compilerResult,
            compiledAt: new Date().toISOString(),
            compilerVersion: "2.1.0",
            schemaVersion: "1.0.0",
          };

          await db
            .update(websiteMaterials)
            .set({
              structuredContent,
              coverageStatus: verification.status as any,
              coverageReport: verification.report,
              termIndex,
              status: "published",
              isStale: false,
              updatedAt: new Date(),
            })
            .where(eq(websiteMaterials.id, row.id));

          console.log(`  [SUCCESS] Material AST and term index saved.`);
        } catch (err: any) {
          console.error(`  [FAIL] Error compiling material:`, err.message || err);
        }
      }

      // Build Concept Graph Rollup
      console.log("Rebuilding concept graph edges...");
      try {
        const edgeCount = await buildConceptGraph(courseId);
        console.log(`[SUCCESS] Rebuilt concept graph with ${edgeCount} edges.`);
      } catch (err: any) {
        console.error(`[FAIL] Error building concept graph:`, err.message || err);
      }

      // Queue Vector Sync (Phase 5)
      console.log("Enqueuing all active KOs to Vector Sync Queue...");
      const activeKOs = await db
        .select()
        .from(knowledgeObjects)
        .where(and(eq(knowledgeObjects.courseId, courseId), eq(knowledgeObjects.status, "active")));

      let queueCount = 0;
      for (const ko of activeKOs) {
        const textToEmbed = `Title: ${ko.title}\nConcept: ${ko.conceptName}\nContent: ${ko.content}`;
        const syncId = `sync-import-${randomUUID()}`;
        
        await db.insert(vectorSyncQueue).values({
          id: syncId,
          courseId: courseId,
          koId: ko.id,
          action: "upsert" as const,
          namespace: "learning" as const,
          payload: {
            text: textToEmbed,
            metadata: {
              chapterId: ko.chapterId,
              type: ko.type,
              bloomLevel: ko.bloomLevel,
              difficulty: ko.difficulty,
              tags: ko.tags,
            }
          },
          status: "pending" as const,
          attempts: 0,
        }).onConflictDoNothing();
        queueCount++;
      }
      console.log(`[SUCCESS] Enqueued ${queueCount} KOs to Vector Sync Queue.`);

      // Heuristic Concept/KO mapping and Vector Sync enqueuing for Assessment Objects
      console.log("Processing past exam questions (assessmentObjects) for RAG and concept mapping...");
      try {
        const aos = await db
          .select({
            id: assessmentObjects.id,
            sourceId: assessmentObjects.sourceId,
            questionMarkdown: assessmentObjects.questionMarkdown,
            answerMarkdown: assessmentObjects.answerMarkdown,
            difficulty: assessmentObjects.difficulty,
            applicationLevel: assessmentObjects.applicationLevel,
          })
          .from(assessmentObjects)
          .innerJoin(assessmentSources, eq(assessmentObjects.sourceId, assessmentSources.id))
          .where(eq(assessmentSources.courseId, courseId));

        console.log(`Found ${aos.length} assessment objects to map and enqueue.`);

        const localizations = await db
          .select({
            conceptId: conceptLocalizations.conceptId,
            displayName: conceptLocalizations.displayName,
            aliases: conceptLocalizations.aliases,
          })
          .from(conceptLocalizations)
          .innerJoin(concepts, eq(conceptLocalizations.conceptId, concepts.id));

        let aoQueueCount = 0;

        for (const ao of aos) {
          const sourceChaps = await db
            .select({ chapterId: assessmentSourceChapters.chapterId })
            .from(assessmentSourceChapters)
            .where(eq(assessmentSourceChapters.assessmentSourceId, ao.sourceId));

          const chapterIds = sourceChaps.map(sc => sc.chapterId);
          const resolvedChapterId = chapterIds[0] || "";

          const matchedConceptIds = new Set<string>();
          const matchedConceptNames: string[] = [];

          const questionTextLower = (ao.questionMarkdown + " " + (ao.answerMarkdown || "")).toLowerCase();

          for (const loc of localizations) {
            const nameLower = loc.displayName.toLowerCase();
            const aliases = Array.isArray(loc.aliases) ? loc.aliases : [];

            const isMatched = questionTextLower.includes(nameLower) || 
                              aliases.some(alias => questionTextLower.includes(alias.toString().toLowerCase()));

            if (isMatched) {
              matchedConceptIds.add(loc.conceptId);
              matchedConceptNames.push(loc.displayName);
            }
          }

          if (matchedConceptIds.size === 0 && chapterIds.length > 0) {
            const chapterKOs = await db
              .select({ conceptId: knowledgeObjects.conceptId, conceptName: knowledgeObjects.conceptName })
              .from(knowledgeObjects)
              .where(and(inArray(knowledgeObjects.chapterId, chapterIds), eq(knowledgeObjects.status, "active")));

            for (const ko of chapterKOs) {
              matchedConceptIds.add(ko.conceptId);
              if (!matchedConceptNames.includes(ko.conceptName)) {
                matchedConceptNames.push(ko.conceptName);
              }
            }
          }

          for (const cId of matchedConceptIds) {
            await db.insert(assessmentObjectConcepts).values({
              id: `aoc-import-${randomUUID()}`,
              assessmentObjectId: ao.id,
              conceptId: cId,
            }).onConflictDoNothing();

            let whereClause = and(
              eq(knowledgeObjects.conceptId, cId),
              eq(knowledgeObjects.status, "active")
            );
            if (chapterIds.length > 0) {
              whereClause = and(whereClause, inArray(knowledgeObjects.chapterId, chapterIds));
            }
            const activeKOs = await db
              .select({ id: knowledgeObjects.id })
              .from(knowledgeObjects)
              .where(whereClause);

            for (const ko of activeKOs) {
              await db.insert(assessmentObjectKos).values({
                id: `aok-import-${randomUUID()}`,
                assessmentObjectId: ao.id,
                koId: ko.id,
              }).onConflictDoNothing();
            }
          }

          const textToEmbed = `Question: ${ao.questionMarkdown}\nSolution: ${ao.answerMarkdown || ""}`;
          const syncId = `sync-import-ae-${randomUUID()}`;

          const bloomLevel = ao.applicationLevel === 1 ? "remember" : ao.applicationLevel === 2 ? "understand" : "apply";
          const difficultyText = ao.difficulty <= 3 ? "easy" : ao.difficulty >= 7 ? "hard" : "medium";

          await db.insert(vectorSyncQueue).values({
            id: syncId,
            courseId: courseId,
            koId: null,
            action: "upsert" as const,
            namespace: "past_exams" as const,
            payload: {
              id: ao.id,
              text: textToEmbed,
              metadata: {
                chapterId: resolvedChapterId,
                type: "past_exam",
                bloomLevel,
                difficulty: difficultyText,
                tags: matchedConceptNames,
              }
            },
            status: "pending" as const,
            attempts: 0,
          }).onConflictDoNothing();

          aoQueueCount++;
        }

        console.log(`[SUCCESS] Mapped and enqueued ${aoQueueCount} assessment objects to Vector Sync Queue.`);
      } catch (err: any) {
        console.error(`[FAIL] Error processing assessment objects:`, err.message || err);
      }

      console.log("Recalculating course assessment profile...");
      try {
        await updateAssessmentProfile(courseId);
        console.log("[SUCCESS] Recalculated course assessment profile.");
      } catch (err: any) {
        console.error("[FAIL] Error recalculating course assessment profile:", err.message || err);
      }
    }

    console.log("Import process completed successfully!");
    process.exit(0);
  } catch (error: any) {
    console.error("\n=== Import Failed ===");
    console.error(error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n=== Unexpected Importer Crash ===");
  console.error(err);
  process.exit(1);
});

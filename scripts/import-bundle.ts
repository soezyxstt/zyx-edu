import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { db } from "../db";
import { user, knowledgeObjects, websiteMaterials, vectorSyncQueue } from "../db/schema";
import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import * as fs from "fs";
import { importChapterBundle, type ImportMode } from "../lib/bundle-importer";
import {
  importAssessmentBundle,
  resolveCourseAndChaptersByTitle,
  type AssessmentImportMode,
} from "../lib/assessment-bundle-importer";

// Import post-processing functions
import { compileMarkdown } from "../lib/markdown-compiler";
import { verifyKOCoverage } from "../lib/ko-coverage-auditor";
import { buildTermIndex } from "../lib/term-index";
import { buildConceptGraph } from "../lib/graph-trace";

/** Resolves (creating if needed) the system/author user attributed to assessment sources imported by a bundle. */
async function resolveAuthorUuid(authorEmailInput: string | undefined, dryRun: boolean): Promise<string> {
  const importerEmail = "bundle-importer@zyx.internal";
  let authorUuid = "bundle-importer";

  const authorEmail = authorEmailInput || importerEmail;
  const [dbUser] = await db.select().from(user).where(eq(user.email, authorEmail)).limit(1);

  let isNewUser = false;
  let userRow: any = null;

  if (dbUser) {
    authorUuid = dbUser.id;
  } else {
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
      const [systemUser] = await db.select().from(user).where(eq(user.email, importerEmail)).limit(1);
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

  if (isNewUser && userRow && !dryRun) {
    await db.insert(user).values(userRow).onConflictDoNothing();
  }

  return authorUuid;
}

async function runLearningPostProcess(courseUuid: string) {
  console.log("Starting non-AI post-processing...");

  const materialsList = await db.select().from(websiteMaterials).where(eq(websiteMaterials.courseId, courseUuid));

  for (const row of materialsList) {
    console.log(`Processing material for Chapter ID: ${row.chapterId} ("${row.title}")`);
    try {
      const compilerResult = compileMarkdown(row.canonicalMarkdown, row.chapterId, row.courseId);
      const errors = compilerResult.diagnostics.filter((d) => d.severity === "error");

      if (errors.length > 0) {
        console.error(`  [FAIL] Compilation failed with ${errors.length} errors:`);
        errors.forEach((e) => console.error(`    - ${e.message}`));
        continue;
      }

      const verification = await verifyKOCoverage(row.chapterId, compilerResult.ast);
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

  console.log("Rebuilding concept graph edges...");
  try {
    const edgeCount = await buildConceptGraph(courseUuid);
    console.log(`[SUCCESS] Rebuilt concept graph with ${edgeCount} edges.`);
  } catch (err: any) {
    console.error(`[FAIL] Error building concept graph:`, err.message || err);
  }

  console.log("Enqueuing all active KOs to Vector Sync Queue...");
  const activeKOs = await db
    .select()
    .from(knowledgeObjects)
    .where(and(eq(knowledgeObjects.courseId, courseUuid), eq(knowledgeObjects.status, "active")));

  let queueCount = 0;
  for (const ko of activeKOs) {
    const textToEmbed = `Title: ${ko.title}\nConcept: ${ko.conceptName}\nContent: ${ko.content}`;
    await db
      .insert(vectorSyncQueue)
      .values({
        id: `sync-import-${randomUUID()}`,
        courseId: courseUuid,
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
          },
        },
        status: "pending" as const,
        attempts: 0,
      })
      .onConflictDoNothing();
    queueCount++;
  }
  console.log(`[SUCCESS] Enqueued ${queueCount} KOs to Vector Sync Queue.`);
  console.log("(Assessment object concept mapping, vector sync, and profile recalculation already ran inside the assessment import step, if any.)");
}

/** Imports a Learning Bundle (course + 1 chapter + concepts/KOs/website material/flashcards), plus any embedded assessmentSources for backward compatibility with the combined bundle format. */
async function importLearningBundle(bundlePath: string, mode: ImportMode, dryRun: boolean, postProcess: boolean, verbose: boolean) {
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

  if (bundle.course.chapters.length > 1) {
    console.warn(
      `Warning: bundle contains ${bundle.course.chapters.length} chapters. A bundle upload is meant to carry exactly one chapter; importing all of them, but consider splitting future exports into one bundle per chapter.`
    );
  }

  const authorUuid = await resolveAuthorUuid(bundle.author?.email, dryRun);

  // 1. Import each chapter's learning content through the shared incremental importer.
  let courseUuid = "";
  const chapterRefToId = new Map<string, string>();
  let koCount = 0;
  let wmCount = 0;
  let fsetCount = 0;
  let fcCount = 0;
  let krCount = 0;

  for (const [chIdx, chapter] of bundle.course.chapters.entries()) {
    const log = verbose ? (msg: string) => console.log(`  ${msg}`) : () => {};
    const result = await importChapterBundle(bundle, chapter, mode, log, dryRun);
    courseUuid = result.courseId;
    chapterRefToId.set(chapter.$id || chapter.id || `$chapter-${chIdx}`, result.diff.chapterId);
    chapterRefToId.set(chapter.title, result.diff.chapterId);
    koCount += result.diff.koAdded + result.diff.koUpdated + result.diff.koUnchanged;
    wmCount += result.wmCount;
    fsetCount += result.fsetCount;
    fcCount += result.fcCount;
    krCount += result.krCount;

    console.log(
      `Chapter "${chapter.title}": +${result.diff.koAdded} / ~${result.diff.koUpdated} / =${result.diff.koUnchanged} / -${result.diff.koRetired} KOs.` +
        (result.diff.cascadedStaleness ? " Downstream assets marked stale (content changed)." : " No downstream changes needed.")
    );
  }

  // 2. Process any course/chapter-level Assessment Sources embedded in this combined bundle
  // (backward compatibility; new bundles should use a separate Assessment Bundle instead).
  const bundleAssessmentSources = bundle.course["course.assessmentSources"] || bundle.course.assessmentSources || [];
  const assessmentResult = await importAssessmentBundle(
    bundleAssessmentSources,
    courseUuid,
    (ref) => chapterRefToId.get(ref),
    authorUuid,
    mode as AssessmentImportMode,
    postProcess,
    (msg) => console.log(msg),
    dryRun,
  );

  if (dryRun) {
    console.log("\n─── Dry Run Summary (no writes committed) ───");
    console.log(`Course ID:  ${courseUuid}`);
    console.log(`KOs (added+updated+unchanged): ${koCount}`);
    console.log(`Materials:  ${wmCount}`);
    console.log(`Flashcards: ${fcCount} (in ${fsetCount} sets)`);
    console.log(`Relationships: ${krCount}`);
    console.log(`Past Exams: ${assessmentResult.asCount} (${assessmentResult.aoCount} objects)`);
    console.log("──────────────────────────────────────────────\n");
    process.exit(0);
  }

  console.log(`\n─── Import Complete ───`);
  console.log(`Course ID:     ${courseUuid}`);
  console.log(`KOs:           ${koCount}`);
  console.log(`Materials:     ${wmCount}`);
  console.log(`Flashcards:    ${fcCount} (in ${fsetCount} sets)`);
  console.log(`Relationships: ${krCount}`);
  console.log(`Past Exams:    ${assessmentResult.asCount} (${assessmentResult.aoCount} objects)`);
  console.log(`───────────────────────\n`);

  if (postProcess) {
    await runLearningPostProcess(courseUuid);
  }

  console.log("Import process completed successfully!");
  process.exit(0);
}

/** Imports a standalone Assessment Bundle (assessmentSources[] only) against an already-existing course. */
async function importAssessmentBundleFile(bundlePath: string, mode: AssessmentImportMode, dryRun: boolean, postProcess: boolean) {
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

  if (!bundle.metadata || bundle.metadata.schemaVersion !== "1.0") {
    console.error('Error: Assessment bundle must specify metadata.schemaVersion "1.0".');
    process.exit(1);
  }

  const courseTitle = bundle.course?.title;
  if (!courseTitle) {
    console.error("Error: Assessment bundle must specify course.title (must already exist; import its Learning Bundle first).");
    process.exit(1);
  }

  const assessmentSourcesInput = bundle.assessmentSources || bundle.course.assessmentSources || [];
  if (!Array.isArray(assessmentSourcesInput) || assessmentSourcesInput.length === 0) {
    console.error("Error: Bundle must contain a non-empty assessmentSources array.");
    process.exit(1);
  }

  const { courseId, chapterByTitle } = await resolveCourseAndChaptersByTitle(courseTitle);
  console.log(`Resolved course "${courseTitle}" -> ${courseId}.`);

  const authorUuid = await resolveAuthorUuid(bundle.author?.email, dryRun);

  const result = await importAssessmentBundle(
    assessmentSourcesInput,
    courseId,
    (ref) => chapterByTitle.get(ref),
    authorUuid,
    mode,
    postProcess,
    (msg) => console.log(msg),
    dryRun,
  );

  if (dryRun) {
    console.log("\n─── Dry Run Summary (no writes committed) ───");
    console.log(`Course ID:  ${result.courseId}`);
    console.log(`Sources:    ${result.asCount}`);
    console.log(`Objects:    ${result.aoCount}`);
    console.log("──────────────────────────────────────────────\n");
    process.exit(0);
  }

  console.log(`\n─── Assessment Import Complete ───`);
  console.log(`Course ID: ${result.courseId}`);
  console.log(`Sources:   ${result.asCount}`);
  console.log(`Objects:   ${result.aoCount}`);
  console.log(`───────────────────────\n`);
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);

  // CLI flags
  let bundlePath = "";
  let assessmentBundlePath = "";
  let mode: ImportMode = "create";
  let dryRun = false;
  let postProcess = false;
  let verbose = false;

  const bundleIdx = args.indexOf("--bundle");
  if (bundleIdx !== -1 && args[bundleIdx + 1]) {
    bundlePath = args[bundleIdx + 1];
  }

  const assessmentBundleIdx = args.indexOf("--assessment-bundle");
  if (assessmentBundleIdx !== -1 && args[assessmentBundleIdx + 1]) {
    assessmentBundlePath = args[assessmentBundleIdx + 1];
  }

  if (!bundlePath && !assessmentBundlePath) {
    const positional = args.filter((a) => !a.startsWith("-"));
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

  if (!bundlePath && !assessmentBundlePath) {
    console.error(
      "Usage: bunx tsx scripts/import-bundle.ts --bundle <learning-bundle.json> [--mode <create|upsert|append>] [--dry-run] [--post-process] [--verbose]\n" +
        "   or: bunx tsx scripts/import-bundle.ts --assessment-bundle <assessment-bundle.json> [--mode <upsert|append>] [--dry-run] [--post-process]"
    );
    process.exit(1);
  }

  if (bundlePath && assessmentBundlePath) {
    console.error("Error: pass either --bundle or --assessment-bundle, not both. They are separate, independently-uploadable payloads.");
    process.exit(1);
  }

  console.log(`=== ZYX BUNDLE IMPORTER ===`);
  console.log(`Bundle Type:  ${assessmentBundlePath ? "Assessment Bundle" : "Learning Bundle"}`);
  console.log(`Bundle Path:  ${bundlePath || assessmentBundlePath}`);
  console.log(`Import Mode:  ${mode}`);
  console.log(`Dry Run:      ${dryRun}`);
  console.log(`Post-Process: ${postProcess}`);
  console.log(`Verbose:      ${verbose}\n`);

  try {
    if (assessmentBundlePath) {
      await importAssessmentBundleFile(assessmentBundlePath, mode as AssessmentImportMode, dryRun, postProcess);
    } else {
      await importLearningBundle(bundlePath, mode, dryRun, postProcess, verbose);
    }
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

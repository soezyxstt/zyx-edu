import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { db } from "../db";
import { websiteMaterials } from "../db/schema";
import { eq } from "drizzle-orm";
import { compileMarkdown } from "../lib/markdown-compiler";
import { verifyKOCoverage } from "../lib/ko-coverage-auditor";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  let mode: "all" | "course" | "material" | null = null;
  let targetId: string | null = null;

  if (args.includes("--all")) {
    mode = "all";
  } else {
    const courseIdx = args.indexOf("--course");
    if (courseIdx !== -1 && args[courseIdx + 1]) {
      mode = "course";
      targetId = args[courseIdx + 1];
    } else {
      const matIdx = args.indexOf("--material");
      if (matIdx !== -1 && args[matIdx + 1]) {
        mode = "material";
        targetId = args[matIdx + 1];
      }
    }
  }

  if (!mode) {
    console.error("Usage: bunx tsx scripts/compile-materials.ts [--all | --course <courseId> | --material <materialId>] [--dry-run]");
    process.exit(1);
  }

  console.log(`=== RUNNING MARKDOWN COMPILER RUNNER (Dry Run: ${dryRun}) ===`);

  let rows: any[] = [];
  if (mode === "all") {
    rows = await db.select().from(websiteMaterials);
  } else if (mode === "course") {
    rows = await db.select().from(websiteMaterials).where(eq(websiteMaterials.courseId, targetId!));
  } else if (mode === "material") {
    rows = await db.select().from(websiteMaterials).where(eq(websiteMaterials.id, targetId!));
  }

  console.log(`Found ${rows.length} website material records to process.\n`);

  let processed = 0;
  let skipped = 0;
  let failures = 0;
  let warnings = 0;

  for (const row of rows) {
    console.log(`Processing Material ID: ${row.id} ("${row.title}")`);
    try {
      // Compile
      const compilerResult = compileMarkdown(row.canonicalMarkdown, row.chapterId, row.courseId);
      
      // Check for compiler errors in diagnostics
      const errors = compilerResult.diagnostics.filter(d => d.severity === "error");
      const blockWarnings = compilerResult.diagnostics.filter(d => d.severity === "warning");

      if (errors.length > 0) {
        console.error(`  [FAIL] Compilation failed with ${errors.length} errors:`);
        errors.forEach(e => console.error(`    - ${e.message}`));
        failures++;
        continue;
      }

      if (blockWarnings.length > 0) {
        console.warn(`  [WARN] Compilation compiled with ${blockWarnings.length} warnings:`);
        blockWarnings.forEach(w => console.warn(`    - ${w.message}`));
        warnings += blockWarnings.length;
      }

      // Verify KO Coverage
      const verification = await verifyKOCoverage(row.chapterId, compilerResult.ast);
      console.log(`  Coverage Status: ${verification.status}`);

      const structuredContent = {
        markdown: row.canonicalMarkdown,
        compilerResult,
        compiledAt: new Date().toISOString(),
        compilerVersion: "2.1.0",
        schemaVersion: "1.0.0",
      };

      if (!dryRun) {
        await db
          .update(websiteMaterials)
          .set({
            structuredContent,
            coverageStatus: verification.status as any,
            coverageReport: verification.report,
            updatedAt: new Date(),
          })
          .where(eq(websiteMaterials.id, row.id));
        console.log(`  [SUCCESS] Updated material record in database.`);
      } else {
        console.log(`  [DRY-RUN] Verified compilation and coverage successfully.`);
      }
      processed++;
    } catch (err: any) {
      console.error(`  [FAIL] Critical error processing material:`, err?.message || err);
      failures++;
    }
  }

  console.log("\n=== COMPILATION RUN COMPLETED ===");
  console.log(`Processed (Success): ${processed}`);
  console.log(`Skipped:             ${skipped}`);
  console.log(`Failures:            ${failures}`);
  console.log(`Warnings generated:  ${warnings}`);

  if (failures > 0 && !dryRun) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Runner crashed:", err);
  process.exit(1);
});

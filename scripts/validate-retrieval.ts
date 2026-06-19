import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { execSync } from "child_process";

// Ensure MOCK_GEMINI is NOT true so we perform a real vector store query in this process
delete process.env.MOCK_GEMINI;

async function main() {
  const { db } = await import("../db");
  const { courses, knowledgeObjects, vectorSyncQueue } = await import("../db/schema");
  const { eq, and } = await import("drizzle-orm");
  const { vectorStore } = await import("../lib/vector-store");
  const { getRetrievalMemory } = await import("../lib/zyra/retrieval-memory");

  console.log("=========================================================");
  console.log("       ZYRA END-TO-END RAG RETRIEVAL VALIDATION          ");
  console.log("=========================================================\n");

  // 1. Retrieve the Fisika Dasar 1A course
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.title, "Fisika Dasar 1A"))
    .limit(1);

  if (!course) {
    console.error("[ERROR] Course 'Fisika Dasar 1A' not found in database.");
    console.error("Please run the acceptance test script first to import the course.");
    process.exit(1);
  }

  const courseId = course.id;
  console.log(`Target Course: ${course.title} (ID: ${courseId})`);

  // 2. Reset vector sync queue for this course to trigger a real sync
  console.log("\nResetting vector sync queue in database to force real embedding generation...");
  await db
    .update(vectorSyncQueue)
    .set({
      status: "pending",
      attempts: 0,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(vectorSyncQueue.courseId, courseId));

  // Reset pineconeVectorId on KOs to verify sync-vectors updates it
  await db
    .update(knowledgeObjects)
    .set({
      pineconeVectorId: null,
      updatedAt: new Date(),
    })
    .where(eq(knowledgeObjects.courseId, courseId));

  console.log("Successfully reset sync queue and KOs.");

  // 3. Run sync-vectors.ts with MOCK_GEMINI=false
  console.log("\nRunning sync-vectors.ts with MOCK_GEMINI=false to generate real embeddings...");
  try {
    const syncOutput = execSync(`bunx tsx scripts/sync-vectors.ts --course ${courseId}`, {
      encoding: "utf-8",
      env: {
        ...process.env,
        MOCK_GEMINI: "false",
      },
    });
    console.log(syncOutput);
  } catch (err: any) {
    console.error("[ERROR] Failed to run sync-vectors.ts subprocess:", err.stdout || err.message);
    process.exit(1);
  }

  // Verify DB state
  const pending = await db
    .select()
    .from(vectorSyncQueue)
    .where(and(eq(vectorSyncQueue.courseId, courseId), eq(vectorSyncQueue.status, "pending")));
  const completed = await db
    .select()
    .from(vectorSyncQueue)
    .where(and(eq(vectorSyncQueue.courseId, courseId), eq(vectorSyncQueue.status, "completed")));

  console.log(`Database sync state: ${completed.length} completed, ${pending.length} pending.`);
  if (completed.length !== 20) {
    console.error(`[ERROR] Vector sync did not complete all 20 KOs (completed: ${completed.length}).`);
    process.exit(1);
  }

  // Fetch all imported KOs to check against
  const dbKOs = await db
    .select()
    .from(knowledgeObjects)
    .where(eq(knowledgeObjects.courseId, courseId));

  const dbKoIds = new Set(dbKOs.map((ko) => ko.id));
  console.log(`Found ${dbKOs.length} KOs in local database for verification.`);

  const queries = [
    "Apa perbedaan perpindahan dan jarak?",
    "Hukum Newton Pertama menjelaskan apa?",
    "Apa definisi percepatan?"
  ];

  const results: any[] = [];
  let allPassed = true;

  for (const q of queries) {
    console.log(`\n---------------------------------------------------------`);
    console.log(`Query: "${q}"`);
    console.log(`---------------------------------------------------------`);

    const namespace = `${courseId}_learning`;
    const fullNamespace = `course_${namespace}`;
    console.log(`Vector namespace: ${fullNamespace}`);

    // A. Direct vector store query to inspect raw matches
    let rawMatches: any[] = [];
    try {
      rawMatches = await vectorStore.query(namespace, q, { topK: 5 });
    } catch (err: any) {
      console.error(`  [ERROR] Direct vector store query failed:`, err.message);
    }

    console.log(`Raw vector store matches (Top 5):`);
    if (rawMatches.length === 0) {
      console.log("  (No matches returned from vector store)");
    }
    for (const match of rawMatches) {
      console.log(`  - ID: ${match.id} | Score: ${match.score.toFixed(4)}`);
    }

    // B. Execute the Zyra retrieval memory path
    let retrievalMemory;
    try {
      retrievalMemory = await getRetrievalMemory({
        courseId,
        chapterId: null,
        question: q,
      });
    } catch (err: any) {
      console.error(`  [ERROR] getRetrievalMemory failed:`, err.message);
      retrievalMemory = { sources: [] };
    }

    const sources = retrievalMemory.sources || [];
    console.log(`Zyra retrievalMemory.sources Count: ${sources.length}`);

    const verifiedSources: any[] = [];
    let queryPassed = sources.length > 0;

    for (const s of sources) {
      const isImportedKO = dbKoIds.has(s.id);
      console.log(
        `  - Source Type: ${s.type} | ID: ${s.id} | Label: "${s.label}" | Verified from imported bundle: ${isImportedKO ? "YES" : "NO"}`
      );
      if (!isImportedKO) {
        queryPassed = false;
      }
      verifiedSources.push({
        id: s.id,
        title: s.label,
        verified: isImportedKO,
        score: rawMatches.find((m) => m.id === s.id)?.score ?? 0,
      });
    }

    if (!queryPassed) {
      allPassed = false;
    }

    results.push({
      query: q,
      namespace: fullNamespace,
      rawMatches,
      sources: verifiedSources,
      success: queryPassed,
    });
  }

  console.log("\n=========================================================");
  console.log("                RETRIEVAL VALIDATION SUMMARY             ");
  console.log("=========================================================");
  for (const r of results) {
    const status = r.success ? "[PASS]" : "[FAIL]";
    console.log(`${status} Query: "${r.query}"`);
    console.log(`       Namespace: ${r.namespace}`);
    console.log(`       Source Count: ${r.sources.length}`);
    console.log(`       Matched KO Titles: ${r.sources.map((s: any) => `"${s.title}" (${s.score.toFixed(4)})`).join(", ")}`);
  }
  console.log("---------------------------------------------------------");
  const overallStatus = allPassed ? "SUCCESS" : "FAILED";
  console.log(`OVERALL STATUS: ${overallStatus}`);
  console.log("=========================================================\n");

  if (allPassed) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Validation crashed:", err);
  process.exit(1);
});

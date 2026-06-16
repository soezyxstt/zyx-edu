import "dotenv/config";
import { db } from "../db";
import { masterTeachingDocuments, knowledgeObjects } from "../db/schema";
import { createHash } from "crypto";
import { eq, and, asc } from "drizzle-orm";

async function main() {
  console.log("=== Starting MTD vNext Data Migration & Backfill ===");

  try {
    // 1. Fetch all master teaching documents
    const mtds = await db
      .select()
      .from(masterTeachingDocuments);

    console.log(`Retrieved ${mtds.length} master teaching documents to process.`);

    let migratedCount = 0;

    for (const mtd of mtds) {
      console.log(`Processing MTD: "${mtd.title}" (ID: ${mtd.id})...`);

      // 2. Compute Source Hash from markdownContent
      const sourceHash = createHash("sha256")
        .update(mtd.markdownContent)
        .digest("hex");

      // 3. Fetch active Knowledge Objects for this MTD to compute Derived Hash
      const activeKOs = await db
        .select()
        .from(knowledgeObjects)
        .where(
          and(
            eq(knowledgeObjects.mtdId, mtd.id),
            eq(knowledgeObjects.status, "active")
          )
        )
        .orderBy(asc(knowledgeObjects.learningOrder));

      const hash = createHash("sha256");
      activeKOs.forEach(ko => {
        hash.update(`${ko.id}:${ko.content}`);
      });
      const derivedHash = hash.digest("hex");

      // 4. Update the MTD record with computed hashes and type="learning"
      await db
        .update(masterTeachingDocuments)
        .set({
          type: "learning",
          sourceHash,
          derivedHash,
          updatedAt: new Date(),
        })
        .where(eq(masterTeachingDocuments.id, mtd.id));

      console.log(`   Updated MTD with type='learning', source_hash='${sourceHash.slice(0, 8)}...', derived_hash='${derivedHash.slice(0, 8)}...'`);
      migratedCount++;
    }

    console.log(`\n=== Migration Completed: ${migratedCount} MTD records processed successfully ===`);
    process.exit(0);
  } catch (err) {
    console.error("\n=== Migration Failed ===");
    console.error(err);
    process.exit(1);
  }
}

main();

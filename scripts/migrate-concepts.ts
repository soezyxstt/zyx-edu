import "dotenv/config";
import { db } from "../db";
import { knowledgeObjects, concepts, conceptLocalizations } from "../db/schema";
import { embedText, withGeminiRetry } from "../lib/gemini";
import { slugify } from "../lib/ko-extractor";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

async function main() {
  console.log("=== Starting Concepts Registry Data Migration ===");
  const isMock = process.env.MOCK_GEMINI === "true";

  try {
    // 1. Fetch all active knowledge objects
    const kos = await db
      .select({
        id: knowledgeObjects.id,
        conceptName: knowledgeObjects.conceptName,
        conceptId: knowledgeObjects.conceptId,
      })
      .from(knowledgeObjects)
      .where(eq(knowledgeObjects.status, "active"));

    console.log(`Retrieved ${kos.length} active knowledge objects.`);

    // 2. Group by normalized conceptName
    const conceptGroups: Record<string, typeof kos> = {};
    for (const ko of kos) {
      const name = ko.conceptName.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!conceptGroups[key]) {
        conceptGroups[key] = [];
      }
      conceptGroups[key].push(ko);
    }

    const uniqueConceptKeys = Object.keys(conceptGroups);
    console.log(`Identified ${uniqueConceptKeys.length} unique concepts to register.`);

    let migratedCount = 0;
    for (const key of uniqueConceptKeys) {
      const group = conceptGroups[key];
      const sample = group[0];
      const originalName = sample.conceptName.trim();
      const slug = slugify(originalName);

      // Check if concept already exists in the registry to prevent duplicates
      const [existingConcept] = await db
        .select()
        .from(concepts)
        .where(eq(concepts.canonicalSlug, slug));

      let conceptId = existingConcept?.id;

      if (!existingConcept) {
        conceptId = randomUUID();
        console.log(`Registering new concept: "${originalName}" (Slug: ${slug})`);

        // Generate embedding using Gemini if not mock mode
        let embedding: number[] | null = null;
        if (!isMock) {
          try {
            console.log(`   Generating embedding for: "${originalName}"...`);
            embedding = await withGeminiRetry(() => embedText(originalName));
          } catch (embedErr: any) {
            console.warn(`   [WARN] Failed to generate embedding for "${originalName}":`, embedErr?.message || embedErr);
            // Continue with null embedding
          }
        }

        // Insert into concepts & conceptLocalizations inside transaction
        await db.transaction(async (tx) => {
          await tx.insert(concepts).values({
            id: conceptId,
            canonicalSlug: slug,
            isVerified: false,
          });

          await tx.insert(conceptLocalizations).values({
            id: randomUUID(),
            conceptId: conceptId,
            lang: "id",
            displayName: originalName,
            aliases: [],
            technicalStandardTerm: "id",
            embedding: embedding || null,
          });
        });
      } else {
        console.log(`Concept already registered, reusing ID: "${originalName}" (Slug: ${slug})`);
      }

      // Update all corresponding KOs to reference this conceptId UUID
      let updateCount = 0;
      for (const ko of group) {
        // Only update if it is not already updated to this UUID
        if (ko.conceptId !== conceptId) {
          await db
            .update(knowledgeObjects)
            .set({ conceptId: conceptId })
            .where(eq(knowledgeObjects.id, ko.id));
          updateCount++;
        }
      }
      if (updateCount > 0) {
        console.log(`   Updated ${updateCount} knowledge objects for "${originalName}".`);
      }
      migratedCount++;
    }

    console.log(`\n=== Migration Completed: ${migratedCount} concepts processed successfully ===`);
    process.exit(0);
  } catch (err) {
    console.error("\n=== Migration Failed ===");
    console.error(err);
    process.exit(1);
  }
}

main();

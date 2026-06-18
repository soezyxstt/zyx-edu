import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

(async () => {
  const { db } = await import("@/lib/db");
  const { aiMaterialInstanceChunks, aiMaterialInstanceSections } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  console.log("=== Fetching sections and chunks for material instance 1394fafd-f566-4dad-b54c-2c094903f4c3 ===");
  const sections = await db.select().from(aiMaterialInstanceSections).where(eq(aiMaterialInstanceSections.materialInstanceId, "1394fafd-f566-4dad-b54c-2c094903f4c3"));
  
  for (const s of sections) {
    console.log(`Section: ${s.title} (ID: ${s.id})`);
    const chunks = await db.select().from(aiMaterialInstanceChunks).where(eq(aiMaterialInstanceChunks.sectionId, s.id));
    for (const c of chunks) {
      if (c.chunkText.includes("Nilai Mutlak") || c.chunkText.includes("Refleksi Tanda")) {
        console.log(`--- Chunk ID: ${c.id} ---`);
        console.log(c.chunkText);
        console.log("-----------------------");
      }
    }
  }
})();

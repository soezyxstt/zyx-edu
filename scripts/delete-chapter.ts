import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { db } from "../db";
import { chapters, courses } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const args = process.argv.slice(2);
  const targetTitle = args.join(" ").trim();

  // 1. Ambil daftar semua bab dan kursusnya
  const allChapters = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      courseTitle: courses.title,
    })
    .from(chapters)
    .innerJoin(courses, eq(chapters.courseId, courses.id));

  if (allChapters.length === 0) {
    console.log("Tidak ada bab (chapter) yang terdaftar di basis data.");
    process.exit(0);
  }

  if (!targetTitle) {
    console.log("=== DAFTAR BAB (CHAPTER) SAAT INI ===");
    allChapters.forEach((ch, idx) => {
      console.log(`${idx + 1}. [${ch.courseTitle}] "${ch.title}" (ID: ${ch.id})`);
    });
    console.log("\nCara menghapus: bunx tsx scripts/delete-chapter.ts <Nama Bab atau ID Bab>");
    process.exit(0);
  }

  // 2. Temukan bab yang cocok
  const matched = allChapters.find(
    (ch) => ch.title.toLowerCase() === targetTitle.toLowerCase() || ch.id === targetTitle
  );

  if (!matched) {
    console.error(`Error: Bab dengan nama atau ID "${targetTitle}" tidak ditemukan.`);
    process.exit(1);
  }

  console.log(`Memulai penghapusan bab: "${matched.title}" (ID: ${matched.id}) dari kursus: "${matched.courseTitle}"...`);
  
  try {
    await db.delete(chapters).where(eq(chapters.id, matched.id));
    console.log("SUCCESS: Bab dan seluruh entitas terkait (KOs, website materials, flashcards, dll.) berhasil dihapus!");
  } catch (err: any) {
    console.error("FAIL: Gagal menghapus bab:", err.message || err);
    process.exit(1);
  }
}

main();

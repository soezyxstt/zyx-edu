/**
 * Seed fixtures for the P3 grounded-tutor gate tests.
 * Idempotent. Run with: npx tsx scripts/seed-tutor-rag.ts
 *
 * Creates a Kalkulus course with knowledge objects matching docs/tutor-eval.md,
 * two students (weak vs strong on "Aturan rantai"), an eval student, a budget
 * student, active enrollments, mastery rows, due flashcards, and embeds every
 * KO into the Pinecone namespace course_{courseId}.
 */
import "dotenv/config";

import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { db } from "@/db";
import {
  user,
  courses,
  enrollments,
  chapters,
  masterTeachingDocuments,
  knowledgeObjects,
  studentConceptMastery,
  flashcardSets,
  flashcards,
  studentFlashcardProgress,
} from "@/db/schema";
import { embedText, withGeminiRetry } from "@/lib/gemini";
import { getNs } from "@/lib/pinecone";
import { eq, and } from "drizzle-orm";

export const COURSE_ID = "course-rag-eval";
export const CHAPTER_ID = "chap-rag-eval";
const MTD_ID = "mtd-rag-eval";

export const STUDENTS = {
  weak: { id: "stud-rag-weak", email: "rag-weak@internal", name: "RAG Weak Student" },
  strong: { id: "stud-rag-strong", email: "rag-strong@internal", name: "RAG Strong Student" },
  eval: { id: "stud-rag-eval", email: "rag-eval@internal", name: "RAG Eval Student" },
  budget: { id: "stud-rag-budget", email: "rag-budget@internal", name: "RAG Budget Student" },
};

export const CHAIN_RULE_CONCEPT = "Aturan rantai";

interface KOSeed {
  conceptId: string;
  conceptName: string;
  title: string;
  content: string;
  type: "definition" | "formula" | "example" | "misconception" | "concept_overview";
}

const KOS: KOSeed[] = [
  {
    conceptId: "limit-intuitif",
    conceptName: "Limit intuitif",
    title: "Definisi Intuitif Limit",
    content:
      "Limit fungsi secara intuitif: mengatakan bahwa lim x menuju c dari f(x) sama dengan L berarti bilamana x dekat tetapi berbeda dari c, maka nilai f(x) dekat ke L. Limit menggambarkan kecenderungan nilai fungsi di sekitar suatu titik tanpa harus mengevaluasi titik itu sendiri.",
    type: "definition",
  },
  {
    conceptId: "epsilon-delta",
    conceptName: "Definisi epsilon-delta",
    title: "Definisi Presisi Limit (epsilon-delta)",
    content:
      "Definisi presisi limit: lim x menuju c f(x) = L berarti untuk setiap epsilon lebih besar dari 0 terdapat delta lebih besar dari 0 sedemikian sehingga jika 0 kurang dari nilai mutlak x dikurang c kurang dari delta maka nilai mutlak f(x) dikurang L kurang dari epsilon. Bukti epsilon-delta dilakukan dengan mencari delta sebagai fungsi dari epsilon.",
    type: "definition",
  },
  {
    conceptId: "teorema-limit",
    conceptName: "Teorema limit utama",
    title: "Teorema Limit Utama",
    content:
      "Teorema limit utama: lim x menuju c k = k untuk konstanta k. lim x menuju c x = c. Limit dari k dikali f(x) sama dengan k dikali limit f(x). Limit dari jumlah dua fungsi sama dengan jumlah limit masing-masing fungsi: lim (f(x) + g(x)) = lim f(x) + lim g(x). Limit hasil kali sama dengan hasil kali limit.",
    type: "formula",
  },
  {
    conceptId: "eksistensi-limit",
    conceptName: "Eksistensi limit",
    title: "Kapan Limit Tidak Ada",
    content:
      "Sebuah limit tidak ada apabila limit kiri tidak sama dengan limit kanan, atau fungsi berosilasi tanpa mendekati nilai tertentu, atau fungsi menuju tak hingga. Limit ada jika dan hanya jika limit kiri sama dengan limit kanan.",
    type: "concept_overview",
  },
  {
    conceptId: "definisi-turunan",
    conceptName: "Definisi turunan",
    title: "Definisi Turunan Fungsi",
    content:
      "Turunan fungsi f di titik x didefinisikan sebagai limit dari (f(x+h) dikurang f(x)) dibagi h ketika h menuju 0. Turunan f'(x) menyatakan laju perubahan nilai fungsi di titik tersebut dan secara geometris merupakan kemiringan garis singgung kurva di titik itu.",
    type: "definition",
  },
  {
    conceptId: "aturan-pangkat",
    conceptName: "Aturan pangkat",
    title: "Aturan Pangkat Turunan",
    content:
      "Aturan pangkat untuk turunan: turunan dari x pangkat n sama dengan n dikali x pangkat (n dikurang 1). Contoh: turunan dari x pangkat 3 adalah 3 x pangkat 2.",
    type: "formula",
  },
  {
    conceptId: "aturan-perkalian",
    conceptName: "Aturan perkalian",
    title: "Aturan Perkalian (Product Rule)",
    content:
      "Aturan perkalian: turunan dari u dikali v sama dengan u' dikali v ditambah u dikali v'. Digunakan untuk menurunkan hasil kali dua fungsi.",
    type: "formula",
  },
  {
    conceptId: "aturan-pembagian",
    conceptName: "Aturan pembagian",
    title: "Aturan Pembagian (Quotient Rule)",
    content:
      "Aturan pembagian: turunan dari u dibagi v sama dengan (u' dikali v dikurang u dikali v') dibagi v kuadrat. Digunakan untuk menurunkan hasil bagi dua fungsi.",
    type: "formula",
  },
  {
    conceptId: "aturan-rantai",
    conceptName: CHAIN_RULE_CONCEPT,
    title: "Aturan Rantai (Chain Rule)",
    content:
      "Aturan rantai: turunan dari f(g(x)) sama dengan f'(g(x)) dikali g'(x). Aturan rantai digunakan untuk menurunkan fungsi komposisi. Langkah: turunkan fungsi luar dengan mempertahankan fungsi dalam, lalu kalikan dengan turunan fungsi dalam.",
    type: "formula",
  },
  {
    conceptId: "turunan-trigonometri",
    conceptName: "Turunan trigonometri",
    title: "Turunan Fungsi Trigonometri",
    content:
      "Turunan fungsi trigonometri: turunan sin x sama dengan cos x. Turunan cos x sama dengan negatif sin x. Turunan tan x sama dengan sec kuadrat x.",
    type: "formula",
  },
  {
    conceptId: "interpretasi-turunan",
    conceptName: "Interpretasi turunan",
    title: "Makna Geometris Turunan",
    content:
      "Makna geometris turunan: turunan di suatu titik adalah kemiringan (gradien) garis singgung kurva di titik tersebut. Turunan positif berarti fungsi naik, turunan negatif berarti fungsi turun.",
    type: "concept_overview",
  },
  {
    conceptId: "monotonisitas",
    conceptName: "Monotonisitas",
    title: "Interval Naik dan Turun",
    content:
      "Untuk menentukan interval naik suatu fungsi, cari di mana turunan pertama f'(x) lebih besar dari 0. Fungsi turun pada interval di mana f'(x) kurang dari 0. Titik di mana f'(x) sama dengan 0 adalah titik kritis.",
    type: "concept_overview",
  },
  {
    conceptId: "optimasi",
    conceptName: "Optimasi",
    title: "Optimasi dengan Turunan",
    content:
      "Optimasi menggunakan turunan: pada titik maksimum atau minimum lokal, turunan pertama sama dengan 0. Gunakan uji turunan pertama atau kedua untuk mengklasifikasikan titik kritis sebagai maksimum atau minimum.",
    type: "concept_overview",
  },
  {
    conceptId: "laju-perubahan",
    conceptName: "Laju perubahan",
    title: "Laju Perubahan",
    content:
      "Laju perubahan suatu besaran terhadap besaran lain dinyatakan oleh turunan. Laju perubahan sesaat adalah turunan fungsi pada satu titik, sedangkan laju perubahan rata-rata adalah selisih nilai fungsi dibagi selisih input.",
    type: "concept_overview",
  },
];

async function upsertUser(u: { id: string; email: string; name: string }) {
  await db
    .insert(user)
    .values({
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: "student",
    })
    .onConflictDoNothing();
}

async function main() {
  console.log("=== Seeding tutor-RAG fixtures ===");

  // Course / chapter / MTD
  await db
    .insert(courses)
    .values({ id: COURSE_ID, title: "MA1101 Kalkulus I", category: "Matematika", description: "Limit dan turunan" })
    .onConflictDoNothing();

  const createdById = STUDENTS.eval.id;
  await upsertUser(STUDENTS.eval);

  await db
    .insert(chapters)
    .values({
      id: CHAPTER_ID,
      courseId: COURSE_ID,
      title: "Limit dan Turunan",
      description: "Konsep limit dan turunan fungsi",
      orderIndex: 1,
      status: "published",
    })
    .onConflictDoNothing();

  await db
    .insert(masterTeachingDocuments)
    .values({
      id: MTD_ID,
      courseId: COURSE_ID,
      title: "MTD Kalkulus Eval",
      markdownContent: "# Kalkulus\nLimit dan turunan.",
      version: 1,
      status: "active",
      createdById,
    })
    .onConflictDoNothing();

  // Students + enrollments
  const future = new Date();
  future.setFullYear(future.getFullYear() + 1);
  for (const s of Object.values(STUDENTS)) {
    await upsertUser(s);
    await db
      .delete(enrollments)
      .where(and(eq(enrollments.userId, s.id), eq(enrollments.courseId, COURSE_ID)));
    await db.insert(enrollments).values({
      id: randomUUID(),
      userId: s.id,
      courseId: COURSE_ID,
      enrolledAt: new Date(),
      expiresAt: future,
    });
  }

  // Knowledge objects (fresh)
  await db.delete(knowledgeObjects).where(eq(knowledgeObjects.courseId, COURSE_ID));
  const koIdByConcept = new Map<string, string>();
  let order = 1;
  for (const ko of KOS) {
    const id = `ko-rag-${ko.conceptId}`;
    koIdByConcept.set(ko.conceptName, id);
    await db.insert(knowledgeObjects).values({
      id,
      courseId: COURSE_ID,
      mtdId: MTD_ID,
      chapterId: CHAPTER_ID,
      conceptId: ko.conceptId,
      learningOrder: order++,
      title: ko.title,
      conceptName: ko.conceptName,
      content: ko.content,
      type: ko.type,
      difficulty: "medium",
      bloomLevel: "understand",
      tags: [ko.conceptId],
      importance: "high",
      status: "active",
      pineconeVectorId: id,
    });
  }
  console.log(`Inserted ${KOS.length} knowledge objects.`);

  // Mastery: weak vs strong on chain rule, plus a spread of other concepts
  async function setMastery(studentId: string, conceptName: string, score: number) {
    const now = new Date();
    await db
      .insert(studentConceptMastery)
      .values({
        id: randomUUID(),
        studentId,
        courseId: COURSE_ID,
        conceptName,
        masteryScore: score,
        confidence: 80,
        evidenceCount: 5,
        lastEvidenceAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          studentConceptMastery.studentId,
          studentConceptMastery.courseId,
          studentConceptMastery.conceptName,
        ],
        set: { masteryScore: score, lastEvidenceAt: now, updatedAt: now },
      });
  }

  // Clear prior mastery for these students
  for (const s of Object.values(STUDENTS)) {
    await db
      .delete(studentConceptMastery)
      .where(and(eq(studentConceptMastery.studentId, s.id), eq(studentConceptMastery.courseId, COURSE_ID)));
  }
  await setMastery(STUDENTS.weak.id, CHAIN_RULE_CONCEPT, 40);
  await setMastery(STUDENTS.weak.id, "Aturan pembagian", 45);
  await setMastery(STUDENTS.strong.id, CHAIN_RULE_CONCEPT, 90);
  await setMastery(STUDENTS.strong.id, "Aturan pembagian", 88);
  console.log("Mastery rows set (weak chain-rule=40, strong chain-rule=90).");

  // Flashcards for the chain-rule KO, due now for the weak student
  const chainKoId = koIdByConcept.get(CHAIN_RULE_CONCEPT)!;
  const setId = "fcset-rag-eval";
  await db.delete(flashcardSets).where(eq(flashcardSets.id, setId)); // cascade clears cards
  await db.insert(flashcardSets).values({
    id: setId,
    courseId: COURSE_ID,
    chapterId: CHAPTER_ID,
    sourceMtdId: MTD_ID,
    sourceMtdVersion: 1,
    generationHash: "seed",
    title: "Flashcards Aturan Rantai",
    status: "active",
  });
  const cardIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const cid = `fc-rag-${i}`;
    cardIds.push(cid);
    await db.insert(flashcards).values({
      id: cid,
      setId,
      koId: chainKoId,
      front: `Aturan rantai soal ${i + 1}`,
      back: `f'(g(x)) dikali g'(x)`,
      status: "active",
    });
  }
  const past = new Date(Date.now() - 86400000);
  for (const cid of cardIds) {
    await db
      .delete(studentFlashcardProgress)
      .where(
        and(
          eq(studentFlashcardProgress.studentId, STUDENTS.weak.id),
          eq(studentFlashcardProgress.flashcardId, cid)
        )
      );
    await db.insert(studentFlashcardProgress).values({
      id: randomUUID(),
      studentId: STUDENTS.weak.id,
      flashcardId: cid,
      box: 1,
      nextReviewDue: past,
    });
  }
  console.log(`${cardIds.length} flashcards due now for weak student.`);

  // Embed KOs into Pinecone namespace course_{courseId}
  console.log("Embedding KOs into Pinecone (sequential, rate-limit friendly)...");
  const ns = getNs(COURSE_ID);
  for (const ko of KOS) {
    const id = koIdByConcept.get(ko.conceptName)!;
    const values = await withGeminiRetry(() => embedText(`${ko.title}. ${ko.content}`));
    await ns.upsert({
      records: [
        {
          id,
          values,
          metadata: {
            courseId: COURSE_ID,
            chapterId: CHAPTER_ID,
            conceptId: ko.conceptId,
            conceptName: ko.conceptName,
            type: ko.type,
            title: ko.title,
          },
        },
      ],
    });
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log("\nPinecone upserts complete.");
  console.log("\n=== Seed complete ===");
  process.exit(0);
}

// Only run when executed directly (not when imported by the gate harness).
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch((err) => {
    console.error("seed-tutor-rag failed:", err?.message || err);
    process.exit(1);
  });
}

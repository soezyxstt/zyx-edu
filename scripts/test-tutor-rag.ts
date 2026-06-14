/**
 * P3 grounded-tutor gate harness. Run with: npx tsx scripts/test-tutor-rag.ts
 * Requires: FEATURE_TUTOR_RAG=1, Pinecone + KV + Gemini configured, and
 * scripts/seed-tutor-rag.ts already run.
 *
 * Covers gates 3.1-3.8. Gate 3.9 (visual) is verified in the browser separately.
 * Generation calls are spaced to respect the 10 RPM free-tier limit.
 */
import "dotenv/config";

import { createHash } from "node:crypto";
import { db } from "@/db";
import { aiUsageEvents, tutorSessionSummaries } from "@/db/schema";
import { and, eq, gte } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  askTutorRag,
  normalizeQuestion,
  type TutorRagResult,
} from "@/lib/tutor-rag";
import { kvGet, kvDelete } from "@/lib/kv-cache";
import { COURSE_ID, CHAPTER_ID, STUDENTS, CHAIN_RULE_CONCEPT } from "./seed-tutor-rag";

const SPACING_MS = 5000; // stay under the primary model's 15 RPM free limit
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const IN_SYLLABUS = [
  "Apa definisi intuitif dari limit fungsi?",
  "Tuliskan definisi presisi limit epsilon-delta.",
  "Sebutkan teorema limit utama untuk konstanta.",
  "Bagaimana limit dari jumlah dua fungsi dihitung?",
  "Apa arti lim x menuju c dari konstanta k?",
  "Kapan sebuah limit tidak ada?",
  "Apa definisi turunan suatu fungsi di titik x?",
  "Tuliskan aturan pangkat untuk turunan.",
  "Apa aturan perkalian product rule untuk turunan?",
  "Bagaimana aturan pembagian quotient rule?",
  "Jelaskan aturan rantai chain rule.",
  "Berapa turunan dari sin x?",
  "Berapa turunan dari cos x?",
  "Berapa turunan dari tan x?",
  "Apa makna geometris turunan?",
  "Bagaimana menentukan interval naik suatu fungsi?",
  "Apa syarat turunan pada titik maksimum lokal?",
  "Bagaimana menggunakan turunan untuk optimasi?",
  "Apa laju perubahan dan kaitannya dengan turunan?",
  "Bagaimana membuktikan limit dengan definisi epsilon-delta?",
];

const OUT_OF_SYLLABUS = [
  "Bagaimana cara membuat kue bolu kukus?",
  "Siapa presiden pertama Indonesia?",
  "Jelaskan teori relativitas khusus Einstein.",
  "Apa ibu kota Australia?",
  "Bagaimana cara mengganti oli mobil?",
];

const CHAIN_RULE_Q = "Jelaskan aturan rantai chain rule.";

function tutorKey(courseId: string, chapterId: string | null, q: string): string {
  const hash = createHash("sha256").update(normalizeQuestion(q)).digest("hex");
  return `tutor:${courseId}:${chapterId ?? "all"}:${hash}`;
}

async function clearTodayUsage(userId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  await db
    .delete(aiUsageEvents)
    .where(and(eq(aiUsageEvents.userId, userId), gte(aiUsageEvents.createdAt, start)));
}

const results: { gate: string; pass: boolean; detail: string }[] = [];
function record(gate: string, pass: boolean, detail: string) {
  results.push({ gate, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${gate}  ${detail}`);
}

async function ask(
  studentId: string,
  question: string,
  chapterId: string | null = CHAPTER_ID
): Promise<TutorRagResult> {
  return askTutorRag({ studentId, courseId: COURSE_ID, chapterId, question });
}

function isQuotaError(e: unknown): boolean {
  const m = String((e as Error)?.message || e);
  return m.includes("429") || m.includes("RESOURCE_EXHAUSTED") || m.toLowerCase().includes("quota");
}

/** Ask, tolerating provider quota/rate errors so one 429 cannot abort the suite. */
async function tryAsk(
  studentId: string,
  question: string,
  chapterId: string | null = CHAPTER_ID
): Promise<{ res?: TutorRagResult; blocked?: boolean }> {
  try {
    return { res: await ask(studentId, question, chapterId) };
  } catch (e) {
    if (isQuotaError(e)) return { blocked: true };
    throw e;
  }
}

async function main() {
  console.log("=== P3 gate harness ===\n");

  // Clean usage ledgers for deterministic budget behaviour
  await clearTodayUsage(STUDENTS.eval.id);
  await clearTodayUsage(STUDENTS.weak.id);
  await clearTodayUsage(STUDENTS.strong.id);
  // reset memory for weak student so 3.6 counts cleanly
  await db
    .delete(tutorSessionSummaries)
    .where(eq(tutorSessionSummaries.studentId, STUDENTS.weak.id));

  // ── Gate 3.1: cache hit (unique nonce question → guaranteed miss then hit) ──
  const nonceQ = `Apa definisi turunan? token ${Date.now()}`;
  const t0 = Date.now();
  const firstTry = await tryAsk(STUDENTS.eval.id, nonceQ);
  const firstMs = Date.now() - t0;
  if (firstTry.blocked || !firstTry.res) {
    record("3.1 cache-hit", false, "BLOCKED: provider quota exhausted (fresh generation unavailable)");
  } else {
    const first = firstTry.res;
    await sleep(1500);
    const t1 = Date.now();
    const second = await ask(STUDENTS.eval.id, nonceQ);
    const secondMs = Date.now() - t1;
    record(
      "3.1 cache-hit",
      !first.cached && second.cached && second.answer === first.answer && secondMs < 500,
      `first(miss)=${firstMs}ms cached=${first.cached}; second(hit)=${secondMs}ms cached=${second.cached}; identical=${second.answer === first.answer}`
    );
  }
  await sleep(SPACING_MS);

  // ── Gate 3.3 (run before 3.2 so the chain-rule key is populated) ──
  // weak student → addendum; strong → clean; shared Tier1 cache entry
  const weak = await ask(STUDENTS.weak.id, CHAIN_RULE_Q);
  await sleep(SPACING_MS);
  const strong = await ask(STUDENTS.strong.id, CHAIN_RULE_Q);
  const sharedKey = tutorKey(COURSE_ID, CHAPTER_ID, CHAIN_RULE_Q);
  const cachedShared = await kvGet<{ answer: string }>(sharedKey);
  record(
    "3.3 personalization",
    !!weak.addendum && !strong.addendum && !!cachedShared,
    `weak.addendum=${!!weak.addendum}(${weak.addendum?.conceptName ?? "-"}, fc=${weak.addendum?.flashcardsDue ?? "-"}, tier3=${!!weak.personalized}); strong.addendum=${!!strong.addendum}; sharedCacheEntry=${!!cachedShared}`
  );

  // ── Gate 3.2: no profile leakage in cached value ──
  const raw = cachedShared ? JSON.stringify(cachedShared) : "";
  const leakTerms = [
    STUDENTS.weak.id,
    STUDENTS.weak.email,
    "scored",
    "menunggu",
    "flashcard",
    "Berkaitan dengan",
  ];
  const leaked = leakTerms.filter((t) => raw.toLowerCase().includes(t.toLowerCase()));
  record(
    "3.2 no-leakage",
    raw.length > 0 && leaked.length === 0,
    leaked.length ? `LEAKED: ${leaked.join(", ")}` : `clean cached payload (${raw.length} bytes)`
  );
  await sleep(SPACING_MS);

  // ── Gate 3.6: memory across two sessions on the same concept ──
  await ask(STUDENTS.weak.id, "Beri contoh penerapan aturan rantai.");
  const [summary] = await db
    .select()
    .from(tutorSessionSummaries)
    .where(
      and(
        eq(tutorSessionSummaries.studentId, STUDENTS.weak.id),
        eq(tutorSessionSummaries.courseId, COURSE_ID)
      )
    );
  const asked = (summary?.askedConcepts as string[]) ?? [];
  record(
    "3.6 memory",
    !!summary && summary.questionCount >= 2 && asked.length > 0,
    `questionCount=${summary?.questionCount ?? 0}; askedConcepts=[${asked.join(", ")}]`
  );
  await sleep(SPACING_MS);

  // ── Gate 3.4 groundedness (eval student) ──
  let grounded = 0;
  for (const q of IN_SYLLABUS) {
    const r = await ask(STUDENTS.eval.id, q);
    if (r.grounded && r.sources.length > 0) grounded++;
    else console.log(`   [3.4 miss source] "${q}" grounded=${r.grounded} sources=${r.sources.length}`);
    if (!r.cached) await sleep(SPACING_MS);
  }
  record("3.4 groundedness", grounded >= 18, `${grounded}/20 cited >=1 source`);

  // ── Gate 3.8 latency (fresh nonce questions, guaranteed cache miss) ──
  const latencies: number[] = [];
  let latencyBlocked = false;
  for (let i = 0; i < 5; i++) {
    const q = `Jelaskan konsep turunan variasi ${i} token-${Date.now()}`;
    const s = Date.now();
    const r = await tryAsk(STUDENTS.eval.id, q);
    if (r.blocked) { latencyBlocked = true; break; }
    latencies.push(Date.now() - s);
    await sleep(SPACING_MS);
  }
  if (latencyBlocked || latencies.length === 0) {
    record("3.8 latency", false, "BLOCKED: provider quota exhausted (fresh generation unavailable)");
  } else {
    const sorted = [...latencies].sort((a, b) => a - b);
    const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? 0;
    record("3.8 latency", p95 < 8000, `fresh n=${latencies.length} p95=${p95}ms (max=${sorted[sorted.length - 1] ?? 0}ms)`);
  }

  // ── Gate 3.5 honesty (out-of-syllabus) ──
  // Clear any stale cached answers for these questions so the relevance
  // judgment (covered flag) is exercised fresh.
  for (const q of OUT_OF_SYLLABUS) {
    await kvDelete(tutorKey(COURSE_ID, CHAPTER_ID, q));
  }
  let honest = 0;
  let honestyBlocked = false;
  for (const q of OUT_OF_SYLLABUS) {
    const t = await tryAsk(STUDENTS.eval.id, q);
    if (t.blocked || !t.res) { honestyBlocked = true; break; }
    const r = t.res;
    const ok = r.grounded === false && r.sources.length === 0;
    if (ok) honest++;
    else console.log(`   [3.5 fail] "${q}" grounded=${r.grounded} sources=${r.sources.length}`);
    await sleep(SPACING_MS);
  }
  if (honestyBlocked) {
    record("3.5 honesty", false, "BLOCKED: provider quota exhausted (fresh generation unavailable)");
  } else {
    record("3.5 honesty", honest === OUT_OF_SYLLABUS.length, `${honest}/${OUT_OF_SYLLABUS.length} grounded:false, no citations`);
  }

  // ── Gate 3.7 budget: exhaust 30, ask a CACHED weak question ──
  await clearTodayUsage(STUDENTS.budget.id);
  for (let i = 0; i < 30; i++) {
    await db.insert(aiUsageEvents).values({
      id: randomUUID(),
      userId: STUDENTS.budget.id,
      feature: "filler",
      model: "test",
      tokens: 0,
      requestType: "filler",
    });
  }
  // budget student is not seeded weak, so set chain-rule weak inline for addendum
  const { studentConceptMastery } = await import("@/db/schema");
  await db
    .insert(studentConceptMastery)
    .values({
      id: randomUUID(),
      studentId: STUDENTS.budget.id,
      courseId: COURSE_ID,
      conceptName: CHAIN_RULE_CONCEPT,
      masteryScore: 40,
      confidence: 80,
      evidenceCount: 5,
      lastEvidenceAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        studentConceptMastery.studentId,
        studentConceptMastery.courseId,
        studentConceptMastery.conceptName,
      ],
      set: { masteryScore: 40 },
    });
  const budgetRes = await ask(STUDENTS.budget.id, CHAIN_RULE_Q); // already cached from 3.3
  record(
    "3.7 budget",
    budgetRes.cached && budgetRes.answer.length > 0 && !!budgetRes.addendum && budgetRes.personalized === null,
    `cached=${budgetRes.cached}(Tier1 served); addendum=${!!budgetRes.addendum}(Tier2 served); personalized=${budgetRes.personalized === null ? "null(Tier3 skipped)" : "present"}`
  );

  // ── Summary ──
  const passed = results.filter((r) => r.pass).length;
  const blocked = results.filter((r) => !r.pass && r.detail.startsWith("BLOCKED"));
  const realFail = results.filter((r) => !r.pass && !r.detail.startsWith("BLOCKED"));
  console.log(`\n=== ${passed}/${results.length} gates passed; ${blocked.length} blocked (quota); ${realFail.length} failed ===`);
  if (blocked.length) console.log(`Blocked (re-run after Gemini free-tier quota resets): ${blocked.map((b) => b.gate).join(", ")}`);
  process.exit(realFail.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("gate harness failed:", err?.stack || err?.message || err);
  process.exit(1);
});

/**
 * EIF E2: quiz remediation payload builder.
 *
 * Pure deterministic function. Given a completed attempt, builds the embedded
 * remediation view: per-concept mastery before/after delta, the prerequisite
 * root cause from the concept graph (E0), a review-time estimate, and the
 * misconception cards already produced deterministically by E1. No AI calls.
 */
import { db } from "@/db";
import { attemptFeedback } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getLearningContext } from "@/lib/learning-context";

const WEAK_THRESHOLD = 60;

export interface ConceptDelta {
  conceptName: string;
  before: number;
  after: number;
  delta: number;
}

export interface RootCause {
  conceptName: string;
  mastery: number;
  blockedBy: Array<{ conceptName: string; mastery: number }>;
}

export interface MisconceptionCard {
  misconceptionName: string;
  whyWrong: string;
  reviewHref: string;
}

export interface RemediationPayload {
  concepts: ConceptDelta[];
  rootCauses: RootCause[];
  misconceptions: MisconceptionCard[];
  estimatedMinutes: number;
}

interface AttemptLike {
  id: string;
  studentId: string;
  masteryBefore: Record<string, number> | null;
  weakAreas: string[] | null;
}

/**
 * Builds the remediation payload for one attempt. Reads current mastery + graph
 * from the E0 fabric, so "after" reflects the post-submit recompute.
 */
export async function buildRemediation(
  attempt: AttemptLike,
  courseId: string,
): Promise<RemediationPayload> {
  const before = attempt.masteryBefore ?? {};
  const conceptNames = Object.keys(before);

  // Pull current learning context per concept (after-score + graph position).
  const contexts = await Promise.all(
    conceptNames.map((name) =>
      getLearningContext(attempt.studentId, courseId, { conceptName: name }),
    ),
  );
  const ctxByConcept = new Map(contexts.map((c) => [c.conceptName, c]));
  // Current mastery for any concept (used to score root-cause prerequisites).
  const masteryByConcept = new Map<string, number>();
  for (const c of contexts) masteryByConcept.set(c.conceptName, c.mastery.score);

  const concepts: ConceptDelta[] = conceptNames.map((name) => {
    const after = ctxByConcept.get(name)?.mastery.score ?? before[name] ?? 0;
    return { conceptName: name, before: before[name] ?? 0, after, delta: after - (before[name] ?? 0) };
  });

  // Root cause: weak concepts (after < 60) that have blocking prerequisites.
  const weakConcepts = concepts.filter((c) => c.after < WEAK_THRESHOLD);
  const rootCauses: RootCause[] = [];
  for (const wc of weakConcepts) {
    const ctx = ctxByConcept.get(wc.conceptName);
    if (!ctx || ctx.blockedBy.length === 0) continue;
    const blockedBy = ctx.blockedBy
      .map((p) => ({ conceptName: p, mastery: masteryByConcept.get(p) ?? 0 }))
      .sort((a, b) => a.mastery - b.mastery);
    rootCauses.push({ conceptName: wc.conceptName, mastery: wc.after, blockedBy });
  }

  // Deterministic time estimate (no AI): blocked prereqs + weak concepts.
  const totalBlocked = rootCauses.reduce((sum, rc) => sum + rc.blockedBy.length, 0);
  const estimatedMinutes = totalBlocked * 4 + weakConcepts.length * 3;

  // Misconception cards from the E1 feedback rows (already deterministic).
  const feedbackRows = await db
    .select()
    .from(attemptFeedback)
    .where(eq(attemptFeedback.attemptId, attempt.id));
  const misconceptions: MisconceptionCard[] = [];
  for (const row of feedbackRows) {
    const payload = row.payload as { misconceptionName?: string | null; whyWrong?: string; reviewHref?: string };
    if (payload?.misconceptionName) {
      misconceptions.push({
        misconceptionName: payload.misconceptionName,
        whyWrong: payload.whyWrong ?? "",
        reviewHref: payload.reviewHref ?? `/courses/${courseId}`,
      });
    }
  }

  return { concepts, rootCauses, misconceptions, estimatedMinutes };
}

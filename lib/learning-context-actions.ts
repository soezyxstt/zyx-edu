"use server";

/**
 * EIF E3: server action feeding the interactive material popover from the E0
 * fabric. Deterministic, no AI. The only quota-spending path (the tutor) is the
 * client opening the existing tutor drawer, never this action.
 */
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getLearningContext } from "@/lib/learning-context";

export interface PopoverKO {
  title: string;
  content: string;
}

export interface ConceptPopoverData {
  conceptName: string;
  mastery: { score: number; trend: "improving" | "stable" | "declining" | null };
  quickExplain: PopoverKO | null;
  analogy: string | null;
  example: PopoverKO | null;
  commonMistake: PopoverKO | null;
  reviewHref: string;
}

export async function getConceptPopover(
  courseId: string,
  conceptName: string,
): Promise<ConceptPopoverData | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const ctx = await getLearningContext(session.user.id, courseId, { conceptName });
  if (!ctx.conceptName) return null;

  const def = ctx.kos.definition[0] ?? null;
  const example = ctx.kos.example[0] ?? null;
  const misc = ctx.kos.misconception[0] ?? null;
  const analogy = ctx.kos.definition.find((k) => k.analogy)?.analogy ?? null;

  return {
    conceptName: ctx.conceptName,
    mastery: { score: ctx.mastery.score, trend: ctx.mastery.trend },
    quickExplain: def ? { title: def.title, content: def.content } : null,
    analogy,
    example: example ? { title: example.title, content: example.content } : null,
    commonMistake: misc ? { title: misc.title, content: misc.content } : null,
    reviewHref: ctx.reviewHref,
  };
}

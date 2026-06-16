import { coursePolicies } from "@/db/schema";

export type CoursePolicyRow = typeof coursePolicies.$inferSelect;

/**
 * Validates a generated question against the course's pedagogical policies.
 */
export function validateQuestionAgainstPolicy(
  question: {
    prompt: string;
    options: string[];
    explanation: string;
    bloomLevel: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";
    pattern?: string;
    estimatedSteps?: number;
  },
  policy: CoursePolicyRow
): { success: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. Forbidden Contexts Check (case-insensitive keyword matching)
  const fullText = `${question.prompt} ${question.options.join(" ")} ${question.explanation}`.toLowerCase();
  if (Array.isArray(policy.forbiddenContexts)) {
    for (const term of policy.forbiddenContexts) {
      const cleanTerm = term.trim().toLowerCase();
      if (cleanTerm && fullText.includes(cleanTerm)) {
        errors.push(`Question contains forbidden term: "${term}"`);
      }
    }
  }

  // 2. Bloom Level Check
  const bloomLevelWeights: Record<string, number> = {
    remember: 0,
    understand: 1,
    apply: 2,
    analyze: 3,
    evaluate: 4,
    create: 5,
  };

  const levelNum = bloomLevelWeights[question.bloomLevel] ?? 2; // default to apply
  if (levelNum > policy.maxApplicationLevel) {
    errors.push(
      `Question Bloom Level '${question.bloomLevel}' (${levelNum}) exceeds the policy maximum of ${policy.maxApplicationLevel}.`
    );
  }

  // 3. Estimated Steps Check
  if (question.estimatedSteps !== undefined && question.estimatedSteps > policy.maxEstimatedSteps) {
    errors.push(
      `Question estimated steps (${question.estimatedSteps}) exceeds the policy maximum of ${policy.maxEstimatedSteps}.`
    );
  }

  // 4. Allowed Patterns Check
  if (question.pattern && Array.isArray(policy.allowedPatterns) && policy.allowedPatterns.length > 0) {
    if (!policy.allowedPatterns.includes(question.pattern)) {
      errors.push(
        `Question pattern '${question.pattern}' is not allowed by the policy. Allowed: [${policy.allowedPatterns.join(", ")}].`
      );
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

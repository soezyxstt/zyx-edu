import { knowledgeObjects } from "@/db/schema";

export interface QuestionBlueprint {
  koId: string;
  koType: string;
  bloomLevel: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";
  targetDifficulty: "easy" | "medium" | "hard";
  blueprintType: "conceptual" | "formula_application" | "numerical" | "multistep" | "misconception_detection" | "engineering_scenario";
  distractorStrategy: string;
  mathConstraints: string;
  tags: string[];
}

export type KnowledgeObject = typeof knowledgeObjects.$inferSelect;

/**
 * Translates a Knowledge Object into a detailed question blueprint.
 * Maps Bloom levels, target difficulties, distractor strategies, and formatting constraints.
 */
export function generateBlueprintForKO(ko: KnowledgeObject): QuestionBlueprint {
  const tags = Array.isArray(ko.tags) ? (ko.tags as string[]) : [];

  let blueprintType: QuestionBlueprint["blueprintType"] = "conceptual";
  let bloomLevel: QuestionBlueprint["bloomLevel"] = "understand";
  let targetDifficulty: QuestionBlueprint["targetDifficulty"] = "medium";
  let distractorStrategy = "";
  let mathConstraints = "";

  switch (ko.type) {
    case "definition":
      blueprintType = "conceptual";
      bloomLevel = "understand";
      targetDifficulty = "easy";
      distractorStrategy = "Use definitions of closely related concepts to form highly plausible vocabulary alternatives. Avoid obviously fake words.";
      mathConstraints = "No complex calculations. Keep it descriptive.";
      break;

    case "formula":
      blueprintType = "formula_application";
      bloomLevel = "apply";
      targetDifficulty = "medium";
      distractorStrategy = "Calculate numeric distractors based on typical algebraic calculation errors: inverted fraction terms, omitting constant conversion multipliers (such as g = 9.81 or pi), or addition instead of multiplication.";
      mathConstraints = "Enforce single-variable isolation and plug-in calculations. LaTeX formatting must be strictly valid and use standard variable representations.";
      break;

    case "misconception":
      blueprintType = "misconception_detection";
      bloomLevel = "analyze";
      targetDifficulty = "medium";
      distractorStrategy = "Include the erroneous misconception myth itself as the correct-looking option to capture students shortcutting physical rules. Provide clear corrections.";
      mathConstraints = "No mathematical calculations required; focus on analyzing physical assumptions.";
      break;

    case "concept_overview":
    case "summary":
    case "objective":
      blueprintType = "engineering_scenario";
      bloomLevel = "evaluate";
      targetDifficulty = "hard";
      distractorStrategy = "Focus on multi-variable system balance states, potential controller loop feedback failures, sensor errors, or component failure propagation.";
      mathConstraints = "Provide qualitative analysis of system states under failure or offset conditions.";
      break;

    case "example":
    case "exercise":
      blueprintType = "numerical";
      bloomLevel = "apply";
      targetDifficulty = (ko.difficulty as QuestionBlueprint["targetDifficulty"]) || "medium";
      distractorStrategy = "Apply algebraic derivations, units scaling shifts, and multi-step math errors to construct options.";
      mathConstraints = "Include multiple equations or algebraic steps. Ensure final values are calculated correctly.";
      break;

    default:
      blueprintType = "conceptual";
      bloomLevel = "understand";
      targetDifficulty = "medium";
      distractorStrategy = "Provide related conceptual distractors within the same domain.";
      mathConstraints = "Descriptive format.";
      break;
  }

  // Adjust difficulty if the source KO already has an explicit difficulty
  if (ko.difficulty && (ko.difficulty === "easy" || ko.difficulty === "medium" || ko.difficulty === "hard")) {
    targetDifficulty = ko.difficulty as QuestionBlueprint["targetDifficulty"];
  }

  // Adjust Bloom Level based on KO bloomLevel property if set
  if (ko.bloomLevel && ["remember", "understand", "apply", "analyze", "evaluate", "create"].includes(ko.bloomLevel)) {
    bloomLevel = ko.bloomLevel as QuestionBlueprint["bloomLevel"];
  }

  return {
    koId: ko.id,
    koType: ko.type,
    bloomLevel,
    targetDifficulty,
    blueprintType,
    distractorStrategy,
    mathConstraints,
    tags,
  };
}

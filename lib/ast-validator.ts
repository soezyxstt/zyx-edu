import { z } from "zod";

// ==========================================
// ZOD SCHEMAS FOR INDIVIDUAL AST BLOCKS
// ==========================================

export const BloomLevelSchema = z.enum([
  "remember",
  "understand",
  "apply",
  "analyze",
  "evaluate",
  "create",
]);

export const DifficultySchema = z.enum(["easy", "medium", "hard"]);

export const LearningObjectiveBlockSchema = z.object({
  id: z.string(),
  type: z.literal("learning_objective"),
  metadata: z.object({
    bloomLevel: BloomLevelSchema,
  }),
  content: z.object({
    objectives: z.array(z.string()),
  }),
});

export const ConceptBlockSchema = z.object({
  id: z.string(),
  type: z.literal("concept"),
  metadata: z.object({
    koId: z.string(),
  }),
  content: z.object({
    title: z.string(),
    bodyMarkdown: z.string(),
  }),
});

export const FormulaParameterSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  unit: z.string(),
  standardUnitSystem: z.string().optional(),
  description: z.string().optional(),
});

export const FormulaBlockSchema = z.object({
  id: z.string(),
  type: z.literal("formula"),
  metadata: z.object({
    koId: z.string(),
  }),
  content: z.object({
    title: z.string(),
    latex: z.string(),
    derivationMarkdown: z.string().optional(),
    parameters: z.array(FormulaParameterSchema),
  }),
});

export const FormulaReferenceBlockSchema = z.object({
  id: z.string(),
  type: z.literal("formula_reference"),
  metadata: z.object({
    linkedFormulaBlockId: z.string(),
  }),
  content: z.object({
    latex: z.string(),
    label: z.string(),
  }),
});

export const EngineeringInsightBlockSchema = z.object({
  id: z.string(),
  type: z.literal("engineering_insight"),
  metadata: z.object({
    discipline: z.enum(["physics", "mechanical", "control", "thermal", "general"]),
  }),
  content: z.object({
    title: z.string(),
    applicationMarkdown: z.string(),
  }),
});

export const ExampleBlockSchema = z.object({
  id: z.string(),
  type: z.literal("example"),
  metadata: z.object({
    difficulty: DifficultySchema,
    koId: z.string().optional(),
  }),
  content: z.object({
    problemStatement: z.string(),
    setupCheck: z
      .object({
        prompt: z.string(),
        type: z.enum(["mcq", "numeric"]),
        options: z.array(z.string()).optional(),
        correctAnswer: z.string(),
        explanation: z.string().optional(),
      })
      .optional(),
    solutionSteps: z.array(
      z.object({
        stepIndex: z.number(),
        label: z.string(),
        explanationMarkdown: z.string(),
        mathProof: z.string().optional(),
      })
    ),
  }),
});

export const MisconceptionBlockSchema = z.object({
  id: z.string(),
  type: z.literal("misconception"),
  metadata: z.object({
    koId: z.string(),
  }),
  content: z.object({
    myth: z.string(),
    correctionMarkdown: z.string(),
    physicalRationaleMarkdown: z.string(),
  }),
});

export const ExerciseBlockSchema = z.object({
  id: z.string(),
  type: z.literal("exercise"),
  metadata: z.object({
    questionId: z.string(),
  }),
  content: z.object({
    questionMarkdown: z.string(),
    questionType: z.enum(["multiple_choice", "numeric_input", "short_essay"]),
    options: z.array(z.string()).optional(),
    evaluationParameters: z
      .object({
        tolerance: z.number().optional(),
        expectedUnit: z.string().optional(),
      })
      .optional(),
  }),
});

export const SummaryBlockSchema = z.object({
  id: z.string(),
  type: z.literal("summary"),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  content: z.object({
    bullets: z.array(z.string()),
  }),
});

export const GlossaryTermBlockSchema = z.object({
  id: z.string(),
  type: z.literal("glossary_term"),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  content: z.object({
    term: z.string(),
    definition: z.string(),
    linkedFormulaIds: z.array(z.string()).optional(),
  }),
});

export const ImageBlockSchema = z.object({
  id: z.string(),
  type: z.literal("image"),
  metadata: z.object({
    aspectRatio: z.string().regex(/^[0-9]+:[0-9]+$/),
    zoomEnabled: z.boolean().optional().default(true),
    fullscreenEnabled: z.boolean().optional().default(true),
  }),
  content: z.object({
    url: z.string(),
    caption: z.string().optional(),
    alt: z.string(),
  }),
});

export const WarningNoteBlockSchema = z.object({
  id: z.string(),
  type: z.enum(["warning", "note"]),
  metadata: z.object({
    collapsible: z.boolean().optional().default(false),
  }),
  content: z.object({
    title: z.string().optional(),
    messageMarkdown: z.string(),
  }),
});

// Union of all possible block schemas
export const ASTBlockSchema = z.discriminatedUnion("type", [
  LearningObjectiveBlockSchema,
  ConceptBlockSchema,
  FormulaBlockSchema,
  FormulaReferenceBlockSchema,
  EngineeringInsightBlockSchema,
  ExampleBlockSchema,
  MisconceptionBlockSchema,
  ExerciseBlockSchema,
  SummaryBlockSchema,
  GlossaryTermBlockSchema,
  ImageBlockSchema,
  WarningNoteBlockSchema,
]);

export type ASTBlock = z.infer<typeof ASTBlockSchema>;

// Complete Document Schema
export const WebsiteMaterialASTSchema = z.object({
  schemaVersion: z.string(),
  chapterId: z.string(),
  courseId: z.string(),
  documentMetadata: z.object({
    title: z.string(),
    author: z.string().optional(),
    lastModified: z.string(),
    estimatedReadingTimeMin: z.number().int().nonnegative(),
  }),
  blocks: z.array(ASTBlockSchema),
});

export type WebsiteMaterialAST = z.infer<typeof WebsiteMaterialASTSchema>;

// ==========================================
// CUSTOM SEMANTIC VALIDATION RULES
// ==========================================

export interface ValidationError {
  path: string;
  message: string;
}

/**
 * Performs strict semantic validation checks on the compiled AST document.
 */
export function validateAST(ast: WebsiteMaterialAST): { success: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  // Parse using Zod schema first for structural check
  const zodResult = WebsiteMaterialASTSchema.safeParse(ast);
  if (!zodResult.success) {
    zodResult.error.issues.forEach(issue => {
      errors.push({
        path: issue.path.join("."),
        message: issue.message,
      });
    });
    return { success: false, errors };
  }

  const glossaryTerms = new Set<string>();
  const linkedFormulaBlockIds = new Set<string>();
  const formulaBlockIds = new Set<string>();

  // Gather glossary terms and formula IDs
  ast.blocks.forEach((block, index) => {
    if (block.type === "glossary_term") {
      glossaryTerms.add(block.content.term.toLowerCase().trim());
    }
    if (block.type === "formula") {
      formulaBlockIds.add(block.id);
    }
  });

  // Check each block individually for semantic constraints
  ast.blocks.forEach((block, blockIndex) => {
    const blockPath = `blocks[${blockIndex}] (${block.type})`;

    // 1. Formula Parameter Bounds Check
    if (block.type === "formula") {
      const latex = block.content.latex;
      block.content.parameters.forEach((param, pIdx) => {
        // Search for symbol in the LaTeX formula text
        const symbolEscaped = param.symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const found = latex.includes(param.symbol) || new RegExp(symbolEscaped).test(latex);
        if (!found) {
          errors.push({
            path: `${blockPath}.content.parameters[${pIdx}]`,
            message: `Symbol '${param.symbol}' declared in parameters table but not found in LaTeX expression: '${latex}'`,
          });
        }
      });
    }

    // 2. MCQ Setup Check Alignment
    if (block.type === "example") {
      const setupCheck = block.content.setupCheck;
      if (setupCheck) {
        if (setupCheck.type === "mcq") {
          const options = setupCheck.options || [];
          if (options.length < 2) {
            errors.push({
              path: `${blockPath}.content.setupCheck`,
              message: `MCQ setup checks must contain at least 2 options.`,
            });
          }
          if (!options.includes(setupCheck.correctAnswer)) {
            errors.push({
              path: `${blockPath}.content.setupCheck`,
              message: `Correct answer '${setupCheck.correctAnswer}' is not present in options array.`,
            });
          }
        }
      }
    }

    // 3. Formula Reference ID Existence
    if (block.type === "formula_reference") {
      linkedFormulaBlockIds.add(block.metadata.linkedFormulaBlockId);
      // Wait: can be checked later at document level or immediately if referenced formula block comes earlier/later.
    }

    // 4. Glossary Term Key Integrity (check [[term]] mentions)
    const bodyTextsToSearch: string[] = [];
    if (block.type === "concept") {
      bodyTextsToSearch.push(block.content.bodyMarkdown);
    } else if (block.type === "formula") {
      if (block.content.derivationMarkdown) bodyTextsToSearch.push(block.content.derivationMarkdown);
    } else if (block.type === "engineering_insight") {
      bodyTextsToSearch.push(block.content.applicationMarkdown);
    } else if (block.type === "example") {
      bodyTextsToSearch.push(block.content.problemStatement);
      block.content.solutionSteps.forEach(step => {
        bodyTextsToSearch.push(step.explanationMarkdown);
      });
    } else if (block.type === "misconception") {
      bodyTextsToSearch.push(block.content.myth);
      bodyTextsToSearch.push(block.content.correctionMarkdown);
      bodyTextsToSearch.push(block.content.physicalRationaleMarkdown);
    } else if (block.type === "exercise") {
      bodyTextsToSearch.push(block.content.questionMarkdown);
    } else if (block.type === "warning" || block.type === "note") {
      bodyTextsToSearch.push(block.content.messageMarkdown);
    }

    bodyTextsToSearch.forEach(text => {
      // Find all matches of [[term]]
      const matches = text.match(/\[\[(.*?)\]\]/g);
      if (matches) {
        matches.forEach(match => {
          const term = match.slice(2, -2).toLowerCase().trim();
          if (!glossaryTerms.has(term)) {
            errors.push({
              path: `${blockPath}`,
              message: `Mentions glossary term '[[${match.slice(2, -2)}]]' but no matching 'glossary_term' block is defined.`,
            });
          }
        });
      }
    });
  });

  // Verify all linked formula references refer to existing formulas
  linkedFormulaBlockIds.forEach(linkedId => {
    if (!formulaBlockIds.has(linkedId)) {
      errors.push({
        path: `documentMetadata`,
        message: `Formula reference links to non-existent formula block ID: '${linkedId}'`,
      });
    }
  });

  return {
    success: errors.length === 0,
    errors,
  };
}

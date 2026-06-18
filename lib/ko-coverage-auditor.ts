import { db } from "@/db";
import { knowledgeObjects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { WebsiteMaterialAST } from "./ast-validator";

export interface CoverageReport {
  totalKOs: number;
  mappedKOs: number;
  missingKOs: Array<{ id: string; title: string; type: string }>;
  formulaFailures: Array<{ koId: string; expected: string; actual: string; reason: string }>;
  issues: string[];
  verifiedAt: string;
}

export interface VerificationResult {
  status: "fully_covered" | "partially_covered" | "coverage_failed";
  report: CoverageReport;
}

/**
 * Extracts LaTeX math expressions from a text string.
 */
function extractLaTeX(text: string): string[] {
  const matches: string[] = [];
  
  // Match display math $$...$$
  const displayRegex = /\$\$([\s\S]+?)\$\$/g;
  let match;
  while ((match = displayRegex.exec(text)) !== null) {
    matches.push(match[1].trim());
  }
  
  // Match inline math $...$ (excluding display math double dollars)
  // Clean display math first to avoid double matching
  const cleanedText = text.replace(/\$\$[\s\S]+?\$\$/g, "");
  const inlineRegex = /\$([^\$]+?)\$/g;
  while ((match = inlineRegex.exec(cleanedText)) !== null) {
    matches.push(match[1].trim());
  }
  
  return matches;
}

/**
 * Normalizes a LaTeX formula to allow whitespace/operator-insensitive comparison.
 */
function normalizeFormula(latex: string): string {
  return latex
    .replace(/\s+/g, "")                    // strip all whitespace
    .replace(/\\cdot/g, "*")                // normalize dot multiplication
    .replace(/\\times/g, "*")               // normalize cross multiplication
    .replace(/\\left\(/g, "(")              // normalize dynamic parentheses
    .replace(/\\right\)/g, ")")
    .replace(/\\left\[/g, "[")
    .replace(/\\right\]/g, ")")
    .replace(/\{/g, "")                     // strip curly braces
    .replace(/\}/g, "")
    .toLowerCase();
}

/**
 * Tokenizes text and calculates Jaccard similarity coefficient.
 */
function calculateJaccardSimilarity(textA: string, textB: string): number {
  const tokenize = (t: string) => {
    return new Set(
      t.toLowerCase()
        .replace(/[^\w\s]+/g, "")
        .split(/\s+/)
        .filter(word => word.length > 2) // ignore small helper words
    );
  };

  const setA = tokenize(textA);
  const setB = tokenize(textB);

  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Performs out-of-band validation of chapter KOs coverage on the compiled AST.
 */
export async function verifyKOCoverage(
  chapterId: string,
  ast: WebsiteMaterialAST
): Promise<VerificationResult> {
  const verifiedAt = new Date().toISOString();
  
  // 1. Fetch active KOs for the chapter from Turso/SQLite
  const activeKOs = await db
    .select()
    .from(knowledgeObjects)
    .where(
      and(
        eq(knowledgeObjects.chapterId, chapterId),
        eq(knowledgeObjects.status, "active")
      )
    );

  if (activeKOs.length === 0) {
    return {
      status: "fully_covered",
      report: {
        totalKOs: 0,
        mappedKOs: 0,
        missingKOs: [],
        formulaFailures: [],
        issues: ["No active KOs found for chapter."],
        verifiedAt,
      },
    };
  }

  // 2. Extract mapped KO IDs from AST blocks
  const astMappedKoIds = new Set<string>();
  const astFormulaBlocks: Array<{ koId?: string; latex?: string; symbols?: any[] }> = [];
  const objectiveTexts: string[] = [];
  const summaryTexts: string[] = [];

  for (const block of ast.blocks) {
    // Collect direct IDs
    if (block.type === "concept" && block.metadata?.koId) {
      astMappedKoIds.add(block.metadata.koId);
    } else if (block.type === "formula") {
      if (block.metadata?.koId) {
        astMappedKoIds.add(block.metadata.koId);
      }
      astFormulaBlocks.push({
        koId: block.metadata?.koId,
        latex: block.content.latex,
        symbols: block.content.symbols,
      });
    } else if (block.type === "example" && block.metadata?.koId) {
      astMappedKoIds.add(block.metadata.koId);
    } else if (block.type === "misconception" && block.metadata?.koId) {
      astMappedKoIds.add(block.metadata.koId);
    } else if (block.type === "learning_objective" && block.content?.objectives) {
      objectiveTexts.push(...block.content.objectives);
    } else if (block.type === "summary" && block.content?.bullets) {
      summaryTexts.push(...block.content.bullets);
    }
  }

  const missingKOs: Array<{ id: string; title: string; type: string }> = [];
  const formulaFailures: Array<{ koId: string; expected: string; actual: string; reason: string }> = [];
  const issues: string[] = [];
  let mappedKOsCount = 0;

  // 3. Process active KOs one by one
  for (const ko of activeKOs) {
    if (ko.type === "definition" || ko.type === "concept_overview" || ko.type === "example" || ko.type === "misconception") {
      // Direct ID verification
      if (astMappedKoIds.has(ko.id)) {
        mappedKOsCount++;
      } else {
        missingKOs.push({ id: ko.id, title: ko.title, type: ko.type });
        issues.push(`Omission: ${ko.type.toUpperCase()} KO "${ko.title}" (ID: ${ko.id}) is missing from the material.`);
      }
    } 
    else if (ko.type === "formula") {
      // Formula metadata and LaTeX verification
      if (astMappedKoIds.has(ko.id)) {
        mappedKOsCount++;
        
        // LaTeX Math correctness audit
        const matchingAstFormula = astFormulaBlocks.find(f => f.koId === ko.id);
        if (matchingAstFormula && matchingAstFormula.latex) {
          const koMaths = extractLaTeX(ko.content).map(normalizeFormula);
          const astMath = normalizeFormula(matchingAstFormula.latex);
          
          if (koMaths.length > 0) {
            const mathMatches = koMaths.some(koMath => astMath.includes(koMath) || koMath.includes(astMath));
            if (!mathMatches) {
              formulaFailures.push({
                koId: ko.id,
                expected: koMaths.join(" OR "),
                actual: astMath,
                reason: "Math mismatch: compiled formula LaTeX differs semantically from raw KO content.",
              });
              issues.push(`Formula Mismatch: Formula KO "${ko.title}" (ID: ${ko.id}) has LaTeX mismatch (Expected: ${koMaths.join(" | ")}, Actual: ${astMath}).`);
            }
          }
        }
      } else {
        missingKOs.push({ id: ko.id, title: ko.title, type: ko.type });
        issues.push(`Omission: FORMULA KO "${ko.title}" (ID: ${ko.id}) is missing from the material.`);
      }
    } 
    else if (ko.type === "objective") {
      // Fuzzy token containment for Objectives
      const koCleanedText = ko.content.replace(/^-\s*/, "").trim();
      let isCovered = false;
      
      for (const objText of objectiveTexts) {
        if (calculateJaccardSimilarity(koCleanedText, objText) >= 0.60) {
          isCovered = true;
          break;
        }
      }
      
      if (isCovered) {
        mappedKOsCount++;
      } else {
        missingKOs.push({ id: ko.id, title: ko.title, type: ko.type });
        issues.push(`Omission: OBJECTIVE KO "${ko.title}" (ID: ${ko.id}) is not semantically represented in any learning objectives block.`);
      }
    }
    else if (ko.type === "summary") {
      // Fuzzy token containment for Summaries
      const koCleanedText = ko.content.replace(/^-\s*/, "").trim();
      let isCovered = false;
      
      for (const sumText of summaryTexts) {
        if (calculateJaccardSimilarity(koCleanedText, sumText) >= 0.60) {
          isCovered = true;
          break;
        }
      }
      
      if (isCovered) {
        mappedKOsCount++;
      } else {
        missingKOs.push({ id: ko.id, title: ko.title, type: ko.type });
        issues.push(`Omission: SUMMARY KO "${ko.title}" (ID: ${ko.id}) is not semantically represented in any summary block.`);
      }
    }
    else {
      // Fallback fallback
      if (astMappedKoIds.has(ko.id)) {
        mappedKOsCount++;
      } else {
        missingKOs.push({ id: ko.id, title: ko.title, type: ko.type });
      }
    }
  }

  // 4. Compute overall verification status
  let status: "fully_covered" | "partially_covered" | "coverage_failed" = "fully_covered";
  if (missingKOs.length > 0 || formulaFailures.length > 0) {
    const missingRatio = missingKOs.length / activeKOs.length;
    if (missingRatio > 0.30 || formulaFailures.length > 0) {
      status = "coverage_failed";
    } else {
      status = "partially_covered";
    }
  }

  const report: CoverageReport = {
    totalKOs: activeKOs.length,
    mappedKOs: mappedKOsCount,
    missingKOs,
    formulaFailures,
    issues,
    verifiedAt,
  };

  return {
    status,
    report,
  };
}

import { DiktatStructure, FormulaHandbookEntry } from "./diktat-generator";
import katex from "katex";

export interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Runs KaTeX compilations to test display or inline mathematical strings.
 */
function testLaTeXString(latex: string): string | null {
  if (!latex) return null;
  try {
    katex.renderToString(latex, { displayMode: true, throwOnError: true });
    return null;
  } catch (err: any) {
    return err?.message || err;
  }
}

/**
 * Runs Quality Control checks on a compiled DiktatStructure.
 */
export async function validateDiktat(
  diktat: DiktatStructure
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const formulaIds = new Set<string>();
  const glossaryTerms = new Set<string>(
    diktat.sections.glossary.map(g => g.term.toLowerCase().trim())
  );

  // 1. Validate Formulas
  diktat.sections.formulaHandbook.forEach((entry: FormulaHandbookEntry) => {
    formulaIds.add(entry.koId);
    const pathPrefix = `[Formula Handbook - ${entry.title}]`;

    // KaTeX rendering verification (Warning level to prevent blocking PDF generation on minor LaTeX formatting issues)
    if (!entry.latex) {
      warnings.push(`${pathPrefix}: LaTeX display formula is missing or blank.`);
    } else {
      const katexErr = testLaTeXString(entry.latex);
      if (katexErr) {
        warnings.push(`${pathPrefix}: KaTeX compile error in "${entry.latex}": ${katexErr}`);
      }
    }

    // Symbol parameter lookup (Warning level to prevent blocking PDF generation on minor metadata mismatches)
    entry.parameters.forEach((param, idx) => {
      if (!param.symbol) {
        warnings.push(`${pathPrefix}: Parameter at index ${idx} is missing a variable symbol.`);
        return;
      }
      
      const symbolClean = param.symbol.replace(/\\/g, "").trim();
      const latexClean = entry.latex.replace(/\\/g, "");
      
      if (!latexClean.includes(symbolClean)) {
        warnings.push(
          `${pathPrefix}: Symbol '${param.symbol}' declared in parameters table but not found in LaTeX expression: '${entry.latex}'`
        );
      }

      if (!param.name) {
        warnings.push(`${pathPrefix}: Parameter '${param.symbol}' is missing a definition name.`);
      }
      if (!param.unit) {
        warnings.push(`${pathPrefix}: Parameter '${param.symbol}' is missing an SI unit representation.`);
      }
    });

    if (entry.parameters.length === 0) {
      warnings.push(`${pathPrefix}: No parameters declared for formula. Highly recommended for engineering references.`);
    }
  });

  // 2. Validate Glossary references
  const searchTexts: string[] = [];
  diktat.sections.conceptSummaries.forEach(s => searchTexts.push(s.definition));
  diktat.sections.engineeringNotes.forEach(n => searchTexts.push(n.insightMarkdown));
  diktat.sections.commonMistakes.forEach(m => {
    searchTexts.push(m.myth);
    searchTexts.push(m.correction);
    searchTexts.push(m.rationale);
  });

  searchTexts.forEach(text => {
    const matches = text.match(/\[\[(.*?)\]\]/g) || [];
    matches.forEach(match => {
      const term = match.slice(2, -2).toLowerCase().trim();
      if (!glossaryTerms.has(term)) {
        warnings.push(`Mentions glossary term '[[${match.slice(2, -2)}]]' but no corresponding glossary term is defined in this Diktat.`);
      }
    });
  });

  // 3. Warning: Check for missing formula reference links in engineering sheets
  diktat.sections.engineeringNotes.forEach(note => {
    // If engineering sheets references a specific formula block via attributes, verify existence
    const matches = note.insightMarkdown.match(/linkedFormulaBlockId="([^"]+)"/g) || [];
    matches.forEach(match => {
      const formulaId = match.split("=")[1].replace(/"/g, "").trim();
      if (!formulaIds.has(formulaId)) {
        // Downgraded to warning as requested
        warnings.push(`[Engineering Notes]: Linked formula reference ID "${formulaId}" does not exist in the handbook.`);
      }
    });
  });

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}

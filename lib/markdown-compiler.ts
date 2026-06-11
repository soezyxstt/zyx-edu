import { WebsiteMaterialAST, ASTBlock, validateAST } from "./ast-validator";

// ==========================================
// STRING ATTRIBUTE PARSER UTILITY
// ==========================================

function parseAttributes(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (!attrStr) return attrs;

  // Matches key="value" or key='value' or key=value
  const regex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let match;
  while ((match = regex.exec(attrStr)) !== null) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? match[4];
    attrs[key] = value;
  }
  return attrs;
}

// ==========================================
// BLOCK PARSER ROUTINE
// ==========================================

function parseBlockNode(
  type: string,
  attrStr: string,
  lines: string[],
  id: string
): ASTBlock | null {
  const attrs = parseAttributes(attrStr);
  const blockId = id;

  switch (type) {
    case "learning_objective": {
      const objectives: string[] = [];
      lines.forEach(l => {
        const m = l.trim().match(/^[-*+]\s+(.*)/);
        if (m) {
          objectives.push(m[1].trim());
        }
      });
      return {
        id: blockId,
        type: "learning_objective",
        metadata: {
          bloomLevel: (attrs.bloomLevel as any) || "remember",
        },
        content: { objectives },
      };
    }

    case "concept": {
      return {
        id: blockId,
        type: "concept",
        metadata: {
          koId: attrs.koId || "",
        },
        content: {
          title: attrs.title || "Concept Overview",
          bodyMarkdown: lines.join("\n").trim(),
        },
      };
    }

    case "formula": {
      const blockText = lines.join("\n");
      const latexMatch = blockText.match(/\$\$\s*([\s\S]*?)\s*\$\$/);
      const latex = latexMatch ? latexMatch[1].trim() : "";

      // Parse parameters table
      const parameters: any[] = [];
      const tableLines = lines.filter(l => l.includes("|"));
      tableLines.forEach(l => {
        const parts = l
          .split("|")
          .map(p => p.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (parts.length >= 3) {
          const symbol = parts[0];
          const unit = parts[1];
          const name = parts[2];
          // Skip header and divider lines
          if (
            symbol.toLowerCase().includes("symbol") ||
            symbol.toLowerCase().includes("parameter") ||
            symbol.startsWith("---")
          ) {
            return;
          }
          parameters.push({
            symbol,
            unit,
            name,
            standardUnitSystem: "SI",
            description: name,
          });
        }
      });

      // Derivation is everything not matching latex block or table lines
      const derivationLines = lines.filter(l => !l.includes("|") && !l.includes("$$"));
      const derivationMarkdown = derivationLines.join("\n").trim();

      return {
        id: blockId,
        type: "formula",
        metadata: {
          koId: attrs.koId || "",
        },
        content: {
          title: attrs.title || "Mathematical Formulation",
          latex,
          derivationMarkdown: derivationMarkdown || undefined,
          parameters,
        },
      };
    }

    case "formula_reference": {
      const blockText = lines.join("\n");
      const latexMatch = blockText.match(/\$\$\s*([\s\S]*?)\s*\$\$/);
      const latex = latexMatch ? latexMatch[1].trim() : "";

      return {
        id: blockId,
        type: "formula_reference",
        metadata: {
          linkedFormulaBlockId: attrs.linkedFormulaBlockId || "",
        },
        content: {
          latex,
          label: attrs.label || "Formula Reference",
        },
      };
    }

    case "engineering_insight": {
      return {
        id: blockId,
        type: "engineering_insight",
        metadata: {
          discipline: (attrs.discipline as any) || "general",
        },
        content: {
          title: attrs.title || "Engineering Insight",
          applicationMarkdown: lines.join("\n").trim(),
        },
      };
    }

    case "example": {
      const blockText = lines.join("\n");
      let problemStatement = "";
      const solutionSteps: any[] = [];

      const probIndex = blockText.indexOf("**Problem**:");
      const solIndex = blockText.indexOf("**Solution**:");

      if (probIndex !== -1) {
        const endProb = solIndex !== -1 ? solIndex : blockText.length;
        problemStatement = blockText.slice(probIndex + "**Problem**:".length, endProb).trim();
      } else {
        problemStatement = blockText;
      }

      if (solIndex !== -1) {
        const solText = blockText.slice(solIndex + "**Solution**:".length);
        const solLines = solText.split(/\r?\n/);
        
        let stepIdx = 1;
        solLines.forEach(l => {
          const match = l.trim().match(/^(\d+)\.\s+(.*)/);
          if (match) {
            const stepText = match[2].trim();
            let label = `Step ${stepIdx}`;
            let explanationMarkdown = stepText;
            const labelMatch = stepText.match(/^\*\*(.*?)\*\*:\s*(.*)/);
            if (labelMatch) {
              label = labelMatch[1].trim();
              explanationMarkdown = labelMatch[2].trim();
            }

            const latexMatch = explanationMarkdown.match(/\$\$(.*?)\$\$/) || explanationMarkdown.match(/\$(.*?)\$/);
            const mathProof = latexMatch ? latexMatch[1].trim() : undefined;

            solutionSteps.push({
              stepIndex: stepIdx++,
              label,
              explanationMarkdown,
              mathProof,
            });
          }
        });
      }

      return {
        id: blockId,
        type: "example",
        metadata: {
          difficulty: (attrs.difficulty as any) || "medium",
          koId: attrs.koId,
        },
        content: {
          problemStatement,
          solutionSteps,
        },
      };
    }

    case "misconception": {
      const blockText = lines.join("\n");
      let myth = "";
      let correctionMarkdown = "";
      let physicalRationaleMarkdown = "";

      const miscIdx = blockText.indexOf("**Misconception**:");
      const corrIdx = blockText.indexOf("**Correction**:");

      if (miscIdx !== -1) {
        const endMisc = corrIdx !== -1 ? corrIdx : blockText.length;
        myth = blockText.slice(miscIdx + "**Misconception**:".length, endMisc).trim();
      }

      if (corrIdx !== -1) {
        const corrText = blockText.slice(corrIdx + "**Correction**:".length).trim();
        const paragraphs = corrText.split(/\n\s*\n/);
        correctionMarkdown = paragraphs[0].trim();
        if (paragraphs.length > 1) {
          physicalRationaleMarkdown = paragraphs.slice(1).join("\n\n").trim();
        } else {
          physicalRationaleMarkdown = correctionMarkdown;
        }
      }

      return {
        id: blockId,
        type: "misconception",
        metadata: {
          koId: attrs.koId || "",
        },
        content: {
          myth,
          correctionMarkdown,
          physicalRationaleMarkdown,
        },
      };
    }

    case "exercise": {
      const questionMarkdown = lines.join("\n").trim();
      return {
        id: blockId,
        type: "exercise",
        metadata: {
          questionId: attrs.questionId || "",
        },
        content: {
          questionMarkdown,
          questionType: "short_essay",
        },
      };
    }

    case "summary": {
      const bullets: string[] = [];
      lines.forEach(l => {
        const m = l.trim().match(/^[-*+]\s+(.*)/);
        if (m) {
          bullets.push(m[1].trim());
        }
      });
      return {
        id: blockId,
        type: "summary",
        metadata: {},
        content: { bullets },
      };
    }

    case "warning":
    case "note": {
      return {
        id: blockId,
        type: type as "warning" | "note",
        metadata: {
          collapsible: attrs.collapsible === "true",
        },
        content: {
          title: attrs.title || undefined,
          messageMarkdown: lines.join("\n").trim(),
        },
      };
    }

    case "glossary_term": {
      return {
        id: blockId,
        type: "glossary_term",
        metadata: {},
        content: {
          term: attrs.term || "",
          definition: lines.join("\n").trim(),
        },
      };
    }

    default:
      console.warn(`Unknown block type encountered: ${type}`);
      return null;
  }
}

// ==========================================
// CORE COMPILER SERVICE
// ==========================================

export async function compileMarkdownToAST(
  markdown: string,
  chapterId: string,
  courseId: string
): Promise<WebsiteMaterialAST> {
  const lines = markdown.split(/\r?\n/);
  const blocks: ASTBlock[] = [];
  let chapterTitle = "Untitled Chapter";

  let currentBlockType: string | null = null;
  let currentBlockAttrStr = "";
  let currentBlockLines: string[] = [];
  let currentBlockId: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Parse Chapter Title (H1 heading outside blocks)
    if (currentBlockType === null && line.startsWith("# ")) {
      chapterTitle = line.slice(2).trim();
      continue;
    }

    if (trimmed.startsWith(":::")) {
      if (currentBlockType !== null) {
        // Closing current block
        const block = parseBlockNode(
          currentBlockType,
          currentBlockAttrStr,
          currentBlockLines,
          currentBlockId || `block-${i}`
        );
        if (block) {
          blocks.push(block);
        }
        currentBlockType = null;
        currentBlockAttrStr = "";
        currentBlockLines = [];
        currentBlockId = null;
      } else {
        // Opening a new block
        const match = trimmed.match(/^:::(\w+)(?:\s+\{(.*?)\})?/);
        if (match) {
          currentBlockType = match[1];
          currentBlockAttrStr = match[2] || "";
          currentBlockLines = [];
          
          const attrs = parseAttributes(currentBlockAttrStr);
          currentBlockId = attrs.id || attrs.koId || `block-${i}-${currentBlockType}`;
        }
      }
    } else {
      if (currentBlockType !== null) {
        currentBlockLines.push(line);
      }
    }
  }

  // Auto-resolve glossary term mappings to prevent false validation failures
  const glossaryTerms = new Set<string>();
  blocks.forEach(b => {
    if (b.type === "glossary_term") {
      glossaryTerms.add(b.content.term.toLowerCase().trim());
    }
  });

  const mentionedTerms = new Set<string>();
  blocks.forEach(block => {
    const texts: string[] = [];
    if (block.type === "concept") texts.push(block.content.bodyMarkdown);
    else if (block.type === "formula") {
      if (block.content.derivationMarkdown) texts.push(block.content.derivationMarkdown);
    } else if (block.type === "engineering_insight") texts.push(block.content.applicationMarkdown);
    else if (block.type === "example") {
      texts.push(block.content.problemStatement);
      block.content.solutionSteps.forEach(s => texts.push(s.explanationMarkdown));
    } else if (block.type === "misconception") {
      texts.push(block.content.myth, block.content.correctionMarkdown, block.content.physicalRationaleMarkdown);
    } else if (block.type === "exercise") texts.push(block.content.questionMarkdown);
    else if (block.type === "warning" || block.type === "note") texts.push(block.content.messageMarkdown);

    texts.forEach(t => {
      const matches = t.match(/\[\[(.*?)\]\]/g);
      if (matches) {
        matches.forEach(m => {
          mentionedTerms.add(m.slice(2, -2).trim());
        });
      }
    });
  });

  // Automatically append stubbed glossary terms for mentioned bracket tags
  mentionedTerms.forEach(term => {
    const termLower = term.toLowerCase().trim();
    if (!glossaryTerms.has(termLower)) {
      blocks.push({
        id: `glossary-${termLower.replace(/\s+/g, "-")}`,
        type: "glossary_term",
        metadata: {},
        content: {
          term: term,
          definition: `Auto-generated definition of [[${term}]].`,
        },
      });
      glossaryTerms.add(termLower);
    }
  });

  // Calculate estimated reading duration
  let totalWords = 0;
  let formulaCount = 0;
  let exampleStepCount = 0;

  blocks.forEach(block => {
    const texts: string[] = [];
    if (block.type === "concept") {
      texts.push(block.content.title, block.content.bodyMarkdown);
    } else if (block.type === "formula") {
      formulaCount++;
      texts.push(block.content.title);
      if (block.content.derivationMarkdown) texts.push(block.content.derivationMarkdown);
    } else if (block.type === "formula_reference") {
      texts.push(block.content.label);
    } else if (block.type === "engineering_insight") {
      texts.push(block.content.title, block.content.applicationMarkdown);
    } else if (block.type === "example") {
      texts.push(block.content.problemStatement);
      exampleStepCount += block.content.solutionSteps.length;
      block.content.solutionSteps.forEach(s => texts.push(s.label, s.explanationMarkdown));
    } else if (block.type === "misconception") {
      texts.push(block.content.myth, block.content.correctionMarkdown, block.content.physicalRationaleMarkdown);
    } else if (block.type === "exercise") {
      texts.push(block.content.questionMarkdown);
    } else if (block.type === "summary") {
      block.content.bullets.forEach(b => texts.push(b));
    } else if (block.type === "glossary_term") {
      texts.push(block.content.term, block.content.definition);
    } else if (block.type === "warning" || block.type === "note") {
      if (block.content.title) texts.push(block.content.title);
      texts.push(block.content.messageMarkdown);
    }

    texts.forEach(text => {
      const words = text
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 0).length;
      totalWords += words;
    });
  });

  const estimatedReadingTimeMin = Math.ceil(
    totalWords / 200 + formulaCount * 2 + exampleStepCount * 5
  ) || 1;

  const ast: WebsiteMaterialAST = {
    schemaVersion: "1.0.0",
    chapterId,
    courseId,
    documentMetadata: {
      title: chapterTitle,
      lastModified: new Date().toISOString(),
      estimatedReadingTimeMin,
    },
    blocks,
  };

  // Run full validation suite
  const validation = validateAST(ast);
  if (!validation.success) {
    throw new Error(
      `AST Validation failed on compiled output:\n` +
        validation.errors.map(e => `  [${e.path}]: ${e.message}`).join("\n")
    );
  }

  return ast;
}

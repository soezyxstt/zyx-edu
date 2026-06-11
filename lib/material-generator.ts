import { db } from "@/db";
import { courses, chapters, knowledgeObjects } from "@/db/schema";
import { generateContentWithFallback } from "@/lib/gemini";
import { eq, asc } from "drizzle-orm";

// ─── STABLE BACKEND SLUGIFIER ────────────────────────────────────────────────

/**
 * Standard utility to convert text into stable, URL-safe, machine-readable slugs.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── GEMINI PROMPT BUILDER ───────────────────────────────────────────────────

/**
 * Standardized system prompt to instruct Gemini to compile KOs into canonical custom markdown containers.
 */
export function buildMaterialGenerationPrompt(
  courseTitle: string,
  chapterTitle: string,
  chapterOrderIndex: number,
  kos: (typeof knowledgeObjects.$inferSelect)[]
): string {
  const kosFormatted = kos.map(ko => {
    return `### Knowledge Object
- ID: ${ko.id}
- Title: ${ko.title}
- Type: ${ko.type}
- Difficulty: ${ko.difficulty}
- Bloom Level: ${ko.bloomLevel}
- Importance: ${ko.importance}
- Original Content:
${ko.content}`;
  }).join("\n\n-------------------\n\n");

  return `You are a senior curriculum developer in engineering and physics. Your task is to compile a single, cohesive Website Material chapter in Markdown format by synthesizing an ordered list of input Knowledge Objects (KOs).

COURSE TITLE: ${courseTitle}
CHAPTER TITLE: ${chapterTitle}
CHAPTER ORDER: ${chapterOrderIndex}

INPUT KNOWLEDGE OBJECTS:
${kosFormatted}

STRICT pedagogical instructions:
1. Synthesize a continuous, detailed, textbook-level learning chapter. Provide complete explanations, derivations, and examples.
2. Group and map each input Knowledge Object to a corresponding custom block. You MUST embed the exact Knowledge Object ID in the metadata parameter: \`koId="[KO_ID]"\`.
3. Use the exact custom delimiters:
   - For learning objectives:
     :::learning_objective {bloomLevel="[bloomLevel]"}
     - [Objective text]
     :::
   - For concepts:
     :::concept {koId="[KO_ID]", title="[Title]"}
     [Concept text and body explanation]
     :::
   - For formulas:
     :::formula {koId="[KO_ID]"}
     [LaTeX equations, e.g., $$\\Delta U = Q - W$$]
     | Parameter | Unit | Definition |
     |---|---|---|
     | [Symbol] | [Unit] | [Definition] |
     :::
   - For formula references:
     :::formula_reference {linkedFormulaBlockId="[BLOCK_ID]"}
     [LaTeX equations]
     :::
   - For engineering insights:
     :::engineering_insight {discipline="[discipline]"}
     [Description of real-world system applications]
     :::
   - For worked examples:
     :::example {koId="[KO_ID]", difficulty="[difficulty]"}
     **Problem**: [Problem statement]
     **Solution**:
     1. [Step 1]
     2. [Step 2]
     :::
   - For misconceptions:
     :::misconception {koId="[KO_ID]"}
     **Misconception**: [Incorrect belief]
     **Correction**: [Correct statement and physical explanation]
     :::
   - For warnings and notes:
     :::warning
     [Warning content]
     :::
   - For summaries:
     :::summary
     - [Summary bullet point]
     :::
4. Do not omit any Knowledge Objects. Every input KO ID must be mapped to at least one container block.
5. All equations must be formatted using LaTeX delimiters ($ for inline, $$ for display blocks).
6. Do not wrap code blocks in standard markdown fences unless it represents a custom container. Output ONLY the compiled Markdown.`;
}

// ─── CORE MATERIAL COMPILING ACTION ──────────────────────────────────────────

/**
 * Compiles a chapter's constituent Knowledge Objects into Website Material canonical Markdown.
 * Interacts with PostgreSQL to fetch course, chapter and KO records, and routes to Gemini.
 */
export async function generateMarkdownForChapter(chapterId: string): Promise<string> {
  // 1. Fetch chapter from database
  const [chapterRecord] = await db
    .select()
    .from(chapters)
    .where(eq(chapters.id, chapterId));

  if (!chapterRecord) {
    throw new Error(`Chapter not found with ID: ${chapterId}`);
  }

  // 2. Fetch parent course
  const [courseRecord] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, chapterRecord.courseId));

  if (!courseRecord) {
    throw new Error(`Parent course not found for chapter ID: ${chapterId}`);
  }

  // 3. Fetch constituent KOs sorted by order index
  const kos = await db
    .select()
    .from(knowledgeObjects)
    .where(eq(knowledgeObjects.chapterId, chapterId))
    .orderBy(asc(knowledgeObjects.learningOrder));

  if (kos.length === 0) {
    throw new Error(`No Knowledge Objects found for chapter ID: ${chapterId}`);
  }

  // 4. Fallback mock generation if MOCK_GEMINI is set to true
  if (process.env.MOCK_GEMINI === "true") {
    console.log(`[Mock Pipeline] Generating mock Markdown for Chapter: ${chapterRecord.title}`);
    let markdown = `# ${chapterRecord.title}\n\n`;
    
    // Add learning objectives block
    markdown += `:::learning_objective {bloomLevel="remember"}\n`;
    kos.forEach(ko => {
      markdown += `- Learn the key concepts of ${ko.title}\n`;
    });
    markdown += `:::\n\n`;

    // Map each KO to its corresponding block
    kos.forEach(ko => {
      if (ko.type === "definition" || ko.type === "concept_overview") {
        markdown += `:::concept {koId="${ko.id}", title="${ko.title}"}\n`;
        markdown += `${ko.content}\n`;
        markdown += `:::\n\n`;
      } else if (ko.type === "formula") {
        markdown += `:::formula {koId="${ko.id}"}\n`;
        markdown += `$$\\tau = r \\cdot F \\cdot \\sin(\\theta)$$\n`;
        markdown += `| Parameter | Unit | Definition |\n`;
        markdown += `|---|---|---|\n`;
        markdown += `| \\tau | N.m | Torque |\n`;
        markdown += `| r | m | Lever arm |\n`;
        markdown += `| F | N | Force magnitude |\n`;
        markdown += `| \\theta | rad | Angle |\n`;
        markdown += `:::\n\n`;
        
        markdown += `:::formula_reference {linkedFormulaBlockId="formula-ref-1"}\n`;
        markdown += `$$\\tau = r \\cdot F$$\n`;
        markdown += `:::\n\n`;
      } else if (ko.type === "example") {
        markdown += `:::example {koId="${ko.id}", difficulty="${ko.difficulty}"}\n`;
        markdown += `**Problem**: Calculate torque with force 10 N and length 0.25 m.\n`;
        markdown += `**Solution**:\n`;
        markdown += `1. Identify variables: F = 10 N, r = 0.25 m.\n`;
        markdown += `2. Compute: $\\tau = r \\cdot F = 2.5 \\text{ N.m}$.\n`;
        markdown += `:::\n\n`;
      } else if (ko.type === "misconception") {
        markdown += `:::misconception {koId="${ko.id}"}\n`;
        markdown += `**Misconception**: Torque depends only on force magnitude.\n`;
        markdown += `**Correction**: It depends on lever arm distance and angle too.\n`;
        markdown += `:::\n\n`;
      } else {
        markdown += `:::concept {koId="${ko.id}", title="${ko.title}"}\n`;
        markdown += `${ko.content}\n`;
        markdown += `:::\n\n`;
      }
    });

    // Add engineering insight
    markdown += `:::engineering_insight {discipline="mechanical"}\n`;
    markdown += `Torque measurements are vital in turbine shaft control loop systems.\n`;
    markdown += `:::\n\n`;

    // Add warning
    markdown += `:::warning\n`;
    markdown += `Never exceed structural limits of wrenches during load tests.\n`;
    markdown += `:::\n\n`;

    // Add summary
    markdown += `:::summary\n`;
    markdown += `- Torque is rotational equivalence of force.\n`;
    markdown += `- Always check coordinate angles.\n`;
    markdown += `:::\n\n`;

    return markdown.trim();
  }

  // 5. Query Gemini API
  console.log(`[AI Pipeline] Synthesizing Markdown from ${kos.length} KOs for Chapter: ${chapterRecord.title}...`);
  const prompt = buildMaterialGenerationPrompt(
    courseRecord.title,
    chapterRecord.title,
    chapterRecord.orderIndex,
    kos
  );

  const { response } = await generateContentWithFallback({
    contents: prompt,
  });

  const outputMarkdown = response.text ?? "";
  if (!outputMarkdown.trim()) {
    throw new Error("Gemini returned an empty compilation response.");
  }

  return outputMarkdown.trim();
}

import { db } from "@/db";
import { knowledgeObjects, vectorSyncQueue } from "@/db/schema";
import { generateContentWithFallback } from "@/lib/gemini";
import { randomUUID } from "crypto";
import { z } from "zod";

// ─── UTILITY FOR DETERMINISTIC BACKEND SLUGIFICATION ──────────────────────────

/**
 * Standard utility to convert text into stable, URL-safe, machine-readable slugs.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── ZOD SCHEMA CONTRACT FOR KNOWLEDGE OBJECTS ──────────────────────────────

export const KnowledgeObjectSchema = z.object({
  conceptName: z.string().min(2), // Simple human-friendly name of the abstract concept (e.g. "Displacement")
  title: z.string().min(2),
  content: z.string().min(10),
  type: z.enum([
    "definition",
    "formula",
    "example",
    "misconception",
    "exercise",
    "summary",
    "objective",
    "concept_overview",
  ]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  bloomLevel: z.enum([
    "remember",
    "understand",
    "apply",
    "analyze",
    "evaluate",
    "create",
  ]),
  tags: z.array(z.string()).min(1),
  importance: z.enum(["high", "medium", "low"]).default("medium"),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

export const KnowledgeObjectsListSchema = z.object({
  knowledge_objects: z.array(KnowledgeObjectSchema),
});

export type ValidatedKO = z.infer<typeof KnowledgeObjectSchema>;

// ─── GEMINI PROMPT BUILDER ───────────────────────────────────────────────────

export function buildKoExtractionPrompt(chapterTitle: string, chapterMarkdown: string): string {
  return `You are an expert educational content curator. 
Your task is to analyze the following chapter from a course textbook and decompose it into a set of granular, self-contained, and semantically independent "Knowledge Objects".

CHAPTER TITLE:
${chapterTitle}

CHAPTER CONTENT:
${chapterMarkdown}

EXTRACTION GUIDELINES:
1. Decompose the text into atomic, independent units of knowledge. Do not include large blocks. Each Knowledge Object must focus on a single concept, formula, example, definition, or misconception.
2. For each Knowledge Object, assign a valid category type:
   - "definition": A core terminology definition or glossary concept.
   - "formula": A mathematical formula, law, or relationship written with variables and units.
   - "example": A concrete word problem, scenario, or calculation demonstrating a concept.
   - "misconception": A common student pitfall, error, or incorrect assumption, paired with the correct understanding.
   - "exercise": A practice question or task for students.
   - "summary": A high-level chapter review block.
   - "objective": A learning target or syllabus goal.
   - "concept_overview": A general conceptual description that does not fit into other specific categories.
3. Assign a cognitive difficulty level ('easy', 'medium', 'hard') based on the complexity of the content.
4. For "bloomLevel", assign one of these exact lowercase values from Bloom's Taxonomy:
   - "remember": Retrieving, recognizing, and recalling relevant knowledge.
   - "understand": Constructing meaning from oral, written, and graphic messages.
   - "apply": Carrying out or using a procedure in a given situation.
   - "analyze": Breaking material into constituent parts, determining how parts relate.
   - "evaluate": Making judgments based on criteria and standards.
   - "create": Putting elements together to form a coherent or functional whole.
5. Provide keyword tags mapping the concept.
6. For "importance", assign one of these exact lowercase importance levels:
   - "high": Core concept, fundamental prerequisites, essential knowledge.
   - "medium": Secondary applications, supporting derivations, typical examples.
   - "low": Non-essential context, optional enrichment details.
7. The "conceptName" should be the simple human-friendly name of the abstract concept (e.g. "Displacement", "Newton's Second Law", "Mole Concept"). Do not format it as a slug.
8. The "content" field must be written in structural Markdown with clean LaTeX equations if math is present:
   - Wrap inline math in single dollar signs, like $x$ or $F = ma$.
   - Wrap block equations in double dollar signs on their own line, like $$F = m \\cdot a$$.
9. Ensure every object is completely self-contained (no references to "as mentioned in the paragraph above" or "see figure 2").

Respond ONLY with valid JSON matching this schema:
{
  "knowledge_objects": [
    {
      "conceptName": "string (human-friendly abstract concept name, e.g. 'Displacement')",
      "title": "string (clear human-readable title)",
      "content": "string (Markdown + LaTeX)",
      "type": "definition" | "formula" | "example" | "misconception" | "exercise" | "summary" | "objective" | "concept_overview",
      "difficulty": "easy" | "medium" | "hard",
      "bloomLevel": "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create",
      "tags": ["string"],
      "importance": "high" | "medium" | "low",
      "metadata": {}
    }
  ]
}`;
}

// ─── SINGLE CHAPTER EXTRACTION WORKFLOW ──────────────────────────────────────

/**
 * Calls Gemini to extract Knowledge Objects from a single chapter,
 * validates the output structure via Zod, and saves valid records to PostgreSQL.
 * Strict Scope: No Pinecone, No Vector Sync, No Embeddings.
 */
export async function extractKnowledgeObjectsForChapter(
  courseId: string,
  mtdId: string,
  chapterId: string,
  chapterTitle: string,
  chapterMarkdown: string
): Promise<ValidatedKO[]> {
  const prompt = buildKoExtractionPrompt(chapterTitle, chapterMarkdown);

  // Call Gemini Flash with priority model routing
  const { response, modelUsed } = await generateContentWithFallback({
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  const rawOutput = response.text ?? "";
  
  let parsed: { knowledge_objects: ValidatedKO[] };
  try {
    const json = JSON.parse(rawOutput);
    parsed = KnowledgeObjectsListSchema.parse(json);
  } catch (err: any) {
    // Retry once with a schema-corrective prompt if validation fails
    console.warn(`JSON validation failed on model ${modelUsed}. Retrying with error details...`);
    const retryPrompt = `${prompt}\n\nIMPORTANT: Your previous response was invalid. Error detail: ${err?.message || err}. Respond ONLY with valid JSON fitting the schema.`;
    
    const { response: retryResponse } = await generateContentWithFallback({
      contents: retryPrompt,
      config: { responseMimeType: "application/json" },
    });
    
    const retryRaw = retryResponse.text ?? "";
    const retryJson = JSON.parse(retryRaw);
    parsed = KnowledgeObjectsListSchema.parse(retryJson);
  }

  // Database Save Pipeline (PostgreSQL writes with Transactional Outbox)
  if (parsed.knowledge_objects.length > 0) {
    await db.transaction(async (tx) => {
      // 1. Map and generate KO objects
      const koValues = parsed.knowledge_objects.map((ko, idx) => {
        const generatedConceptId = `${slugify(courseId)}-${slugify(ko.conceptName)}-${ko.type}`;
        return {
          id: randomUUID(),
          courseId,
          mtdId,
          chapterId,
          conceptId: generatedConceptId,
          learningOrder: idx + 1,
          title: ko.title,
          conceptName: ko.conceptName,
          content: ko.content,
          type: ko.type,
          difficulty: ko.difficulty,
          bloomLevel: ko.bloomLevel,
          tags: ko.tags,
          importance: ko.importance,
          metadata: ko.metadata || {},
          pineconeVectorId: null,
          status: "active" as const,
        };
      });

      // 2. Insert KOs
      await tx.insert(knowledgeObjects).values(koValues);

      // 3. For each KO, insert a vector sync task into the transactional outbox queue
      const outboxPayloads = koValues.map((ko) => {
        const embeddingText = `Title: ${ko.title}\nConcept: ${ko.conceptName}\nContent: ${ko.content}`;
        return {
          id: randomUUID(),
          courseId,
          koId: ko.id,
          action: "upsert" as const,
          payload: {
            text: embeddingText,
            metadata: {
              chapterId: ko.chapterId,
              type: ko.type,
              bloomLevel: ko.bloomLevel,
              difficulty: ko.difficulty,
              tags: ko.tags,
            },
          },
          status: "pending" as const,
          attempts: 0,
        };
      });

      await tx.insert(vectorSyncQueue).values(outboxPayloads);
    });
  }

  return parsed.knowledge_objects;
}

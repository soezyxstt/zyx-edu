import { db } from "@/db";
import {
  assessmentSources,
  assessmentSourceChapters,
  chapterAliases,
  assessmentObjects,
  assessmentProfiles,
  coursePolicies,
  concepts,
  conceptLocalizations,
  knowledgeObjects,
  assessmentObjectConcepts,
  assessmentObjectKos,
  chapters,
  vectorSyncQueue
} from "@/db/schema";
import { VECTOR_NAMESPACES } from "@/lib/namespaces";
import { generateContentWithFallback, withGeminiRetry, embedText } from "@/lib/gemini";
import { USE_CASES } from "@/lib/ai-router";
import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { repairJsonString, slugify } from "./ko-utils";
import { normalizeConceptName, cosineSimilarity } from "./ko-extractor";
import { generateCanonicalHash } from "./assessment-utils";

// Zod schema matching the required response from Gemini
const AssessmentObjectExtractionSchema = z.object({
  questionType: z.string().min(1),
  difficulty: z.number().int().min(1).max(3),
  applicationLevel: z.number().int().min(0).max(5),
  concepts: z.array(z.string()).min(1),
  pattern: z.enum(["direct_computation", "graph_interpretation", "proof", "parameter_analysis", "modeling"]),
  reasoningType: z.enum(["procedural", "conceptual", "analytical"]),
  estimatedSteps: z.number().int().min(1).max(10),
  answerMarkdown: z.string().optional(),
  options: z.array(z.string()).optional(),
});

interface Frontmatter {
  category?: "tutorial" | "quiz" | "uts" | "uas" | "tryout";
  year?: number;
  semester?: number;
  chapters?: string[];
}

/**
 * Parses markdown frontmatter and splits it from raw content.
 */
export function parseFrontmatter(markdown: string): { frontmatter: Frontmatter; content: string } {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = normalized.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, content: normalized };
  }

  const yamlText = match[1];
  const content = normalized.replace(frontmatterRegex, "").trim();
  const frontmatter: Frontmatter = {};

  const lines = yamlText.split("\n");
  let currentKey: keyof Frontmatter | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("-") && currentKey === "chapters") {
      const val = trimmed.slice(1).trim().replace(/^['"]|['"]$/g, "");
      if (val) {
        if (!frontmatter.chapters) frontmatter.chapters = [];
        frontmatter.chapters.push(val);
      }
      continue;
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim() as keyof Frontmatter;
    const value = trimmed.slice(colonIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key === "category") {
      const cat = value.toLowerCase();
      if (["tutorial", "quiz", "uts", "uas", "tryout"].includes(cat)) {
        frontmatter.category = cat as any;
      }
    } else if (key === "year") {
      const yr = parseInt(value, 10);
      if (!isNaN(yr)) frontmatter.year = yr;
    } else if (key === "semester") {
      const sem = parseInt(value, 10);
      if (!isNaN(sem)) frontmatter.semester = sem;
    } else if (key === "chapters") {
      currentKey = "chapters";
      if (value.startsWith("[") && value.endsWith("]")) {
        frontmatter.chapters = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean);
      }
    } else {
      currentKey = null;
    }
  }

  return { frontmatter, content };
}

/**
 * Deterministically parses assessment markdown into discrete question blocks.
 * Splits on H2 headings like "## Question 1", "## Soal 2", "## 1." etc.
 */
export function parseAssessmentMarkdownIntoBlocks(markdown: string): string[] {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  const lines = normalized.split("\n");
  const blocks: string[] = [];
  let currentLines: string[] = [];

  const headingPattern = /^##\s+(?:soal|question|pertanyaan|\d+)/i;

  for (const line of lines) {
    if (headingPattern.test(line.trim())) {
      if (currentLines.length > 0) {
        const blockText = currentLines.join("\n").trim();
        if (blockText.length > 0) {
          blocks.push(blockText);
        }
        currentLines = [];
      }
      currentLines.push(line);
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    const blockText = currentLines.join("\n").trim();
    if (blockText.length > 0) {
      blocks.push(blockText);
    }
  }

  // Fallback to double-newlines if no H2 question headings were found
  if (blocks.length === 0 && normalized.length > 0) {
    return normalized.split(/\n\n+/).filter((block) => block.trim().length > 0);
  }

  return blocks;
}

/**
 * Resolves a free-form concept name against the global Concept Registry.
 * Uses exact matching, alias matching, cosine similarity vector search, and fallbacks.
 * Auto-creates the Concept and Localization if no matching concept exists.
 */
async function resolveConceptId(conceptName: string): Promise<string> {
  const normName = normalizeConceptName(conceptName);

  // 1. Fetch registered localizations from the registry
  const registeredLocalizations = await db
    .select({
      conceptId: conceptLocalizations.conceptId,
      displayName: conceptLocalizations.displayName,
      aliases: conceptLocalizations.aliases,
      embedding: conceptLocalizations.embedding,
    })
    .from(conceptLocalizations);

  // Step A: Deterministic Exact Match (and Aliases)
  const matchedLoc = registeredLocalizations.find((loc) => {
    if (normalizeConceptName(loc.displayName) === normName) return true;
    const aliases = Array.isArray(loc.aliases) ? loc.aliases : [];
    return aliases.some((alias) => normalizeConceptName(alias) === normName);
  });

  if (matchedLoc) {
    return matchedLoc.conceptId;
  }

  // Step B: Cosine Similarity Matching
  let embedding: number[] | null = null;
  if (process.env.MOCK_GEMINI !== "true") {
    try {
      embedding = await withGeminiRetry(() => embedText(conceptName));
    } catch (err) {
      console.warn(`Failed to embed candidate concept "${conceptName}":`, err);
    }
  }

  if (embedding) {
    let bestMatch: typeof registeredLocalizations[0] | null = null;
    let highestScore = 0;

    for (const loc of registeredLocalizations) {
      if (Array.isArray(loc.embedding) && loc.embedding.length > 0) {
        const score = cosineSimilarity(embedding, loc.embedding);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = loc;
        }
      }
    }

    if (bestMatch && highestScore > 0.90) {
      return bestMatch.conceptId;
    }
  }

  // Step C: If not matched, create new concept and localizations (deterministic fallback)
  const newConceptId = randomUUID();
  const slug = slugify(conceptName);

  await db.insert(concepts).values({
    id: newConceptId,
    canonicalSlug: slug || `concept-${newConceptId.slice(0, 8)}`,
    isVerified: false,
  });

  let newEmbedding: number[] | null = null;
  if (process.env.MOCK_GEMINI !== "true" && !embedding) {
    try {
      newEmbedding = await withGeminiRetry(() => embedText(conceptName));
    } catch {}
  } else {
    newEmbedding = embedding;
  }

  await db.insert(conceptLocalizations).values({
    id: `cl-${randomUUID()}`,
    conceptId: newConceptId,
    lang: "id",
    displayName: conceptName,
    aliases: [],
    technicalStandardTerm: "id",
    embedding: newEmbedding,
  });

  return newConceptId;
}

/**
 * Resolves a chapter name against the existing Chapters table or Aliases registry.
 */
async function resolveChapterId(courseId: string, chapterName: string): Promise<string | null> {
  const cleanName = chapterName.trim();
  if (!cleanName) return null;

  // 1. Check exact match in chapters table
  const [exactChapter] = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.courseId, courseId), eq(chapters.title, cleanName)));

  if (exactChapter) {
    return exactChapter.id;
  }

  // 2. Check in chapter_aliases table
  const [aliasMatch] = await db
    .select({ chapterId: chapterAliases.chapterId })
    .from(chapterAliases)
    .innerJoin(chapters, eq(chapterAliases.chapterId, chapters.id))
    .where(and(eq(chapters.courseId, courseId), eq(chapterAliases.aliasName, cleanName)));

  if (aliasMatch) {
    return aliasMatch.chapterId;
  }

  return null;
}

/**
 * Extracts Assessment Objects from an Assessment Source document.
 */
export async function extractAssessmentObjectsForSource(
  sourceId: string,
  isMockOverride?: boolean
): Promise<void> {
  const isMock = isMockOverride ?? (process.env.MOCK_GEMINI === "true");

  // Fetch assessment source
  const [source] = await db
    .select()
    .from(assessmentSources)
    .where(eq(assessmentSources.id, sourceId));

  if (!source) {
    throw new Error(`Assessment source with ID "${sourceId}" not found.`);
  }

  console.log(`[Assessment Ingest] Starting ingestion for source: ${source.title}`);

  // Mark status as processing
  await db
    .update(assessmentSources)
    .set({
      ingestionStatus: "processing",
      ingestionStartedAt: new Date(),
      ingestionError: null,
    })
    .where(eq(assessmentSources.id, sourceId));

  try {
    const { frontmatter, content } = parseFrontmatter(source.sourceMarkdown);
    const blocks = parseAssessmentMarkdownIntoBlocks(content);
    console.log(`[Assessment Ingest] Split assessment into ${blocks.length} blocks.`);

    // 1. Process Chapter Mapping
    // Clear old chapters mapping
    await db.delete(assessmentSourceChapters).where(eq(assessmentSourceChapters.assessmentSourceId, sourceId));

    const chapterList = frontmatter.chapters || [];
    for (const chapName of chapterList) {
      const resolvedId = await resolveChapterId(source.courseId, chapName);
      if (resolvedId) {
        await db.insert(assessmentSourceChapters).values({
          id: `asc-${randomUUID()}`,
          assessmentSourceId: sourceId,
          chapterId: resolvedId,
        });
      } else {
        console.warn(`[Assessment Ingest] Chapter not found in registry: "${chapName}". Warning diagnostic created.`);
      }
    }

    // Update metadata fields if extracted from frontmatter
    await db
      .update(assessmentSources)
      .set({
        category: frontmatter.category ?? source.category,
        year: frontmatter.year ?? source.year,
        semester: frontmatter.semester ?? source.semester,
      })
      .where(eq(assessmentSources.id, sourceId));

    // Clear old objects
    const oldObjects = await db
      .select({ id: assessmentObjects.id })
      .from(assessmentObjects)
      .where(eq(assessmentObjects.sourceId, sourceId));

    const oldObjectIds = oldObjects.map((o) => o.id);

    if (oldObjectIds.length > 0) {
      // Clear concept links
      for (const oId of oldObjectIds) {
        await db.delete(assessmentObjectConcepts).where(eq(assessmentObjectConcepts.assessmentObjectId, oId));
        await db.delete(assessmentObjectKos).where(eq(assessmentObjectKos.assessmentObjectId, oId));
      }
      await db.delete(assessmentObjects).where(eq(assessmentObjects.sourceId, sourceId));
    }

    // 2. Extract Questions
    let order = 1;
    for (const block of blocks) {
      let extracted: z.infer<typeof AssessmentObjectExtractionSchema>;

      // Deduce sourceQuestionNumber (e.g., extract label like "## Soal 2" or "## 1a")
      const headingMatch = block.match(/^##\s+([a-zA-Z\d\s.-]+)/i);
      const sourceQuestionNumber = headingMatch ? headingMatch[1].trim() : String(order);

      if (isMock) {
        extracted = {
          questionType: "multiple_choice",
          difficulty: block.includes("difficult") || block.includes("hard") ? 3 : 2,
          applicationLevel: block.includes("advanced") ? 2 : 1,
          concepts: ["limits", "functions"],
          pattern: block.includes("graph") ? "graph_interpretation" : "direct_computation",
          reasoningType: "procedural",
          estimatedSteps: 2,
          answerMarkdown: "Mock explanation: Limit of f(x) as x approaches a is L.",
          options: ["Option A", "Option B", "Option C", "Option D"],
        };
      } else {
        const prompt = `Analyze the following engineering/math test question block and classify its attributes, solution explanation, and multiple-choice options according to the schema provided.

QUESTION BLOCK:
"""
${block}
"""

You must return a single JSON object matching this schema:
{
  "questionType": "multiple_choice | essay | multiple_choices | boolean",
  "difficulty": [Integer: 1 (easy), 2 (medium), or 3 (hard)],
  "applicationLevel": [Integer from 0 to 5 representing Bloom/Application level],
  "concepts": ["concept name 1", "concept name 2"],
  "pattern": "direct_computation | graph_interpretation | proof | parameter_analysis | modeling",
  "reasoningType": "procedural | conceptual | analytical",
  "estimatedSteps": [Integer representing estimated number of calculation steps, e.g. 1, 2, 3, 4],
  "answerMarkdown": "[Optional: Detailed markdown answer/solution explanation if available in the text block, else null]",
  "options": [Optional: Array of options (strings) if questionType is multiple_choice or multiple_choices, else null]
}

Ensure all fields are fully populated and valid JSON is returned. Do not wrap in markdown code blocks.`;

        try {
          const { response } = await generateContentWithFallback({
            useCase: USE_CASES.KO_EXTRACTION,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
            },
          });

          const rawText = response.text || "";
          const cleanJson = repairJsonString(rawText);
          const parsed = JSON.parse(cleanJson);
          extracted = AssessmentObjectExtractionSchema.parse(parsed);
        } catch (err: any) {
          console.error(`[Assessment Ingest] Failed to extract from block: ${block.slice(0, 100)}... Error:`, err);
          extracted = {
            questionType: "multiple_choice",
            difficulty: 2,
            applicationLevel: 1,
            concepts: ["general"],
            pattern: "direct_computation",
            reasoningType: "procedural",
            estimatedSteps: 2,
            answerMarkdown: undefined,
            options: undefined,
          };
        }
      }

      const assessmentObjectId = `ao-${randomUUID()}`;
      const canonicalHash = generateCanonicalHash(block);

      await db.insert(assessmentObjects).values({
        id: assessmentObjectId,
        sourceId: sourceId,
        questionOrder: order++,
        sourceQuestionNumber,
        questionType: extracted.questionType,
        difficulty: extracted.difficulty,
        applicationLevel: extracted.applicationLevel,
        pattern: extracted.pattern,
        reasoningType: extracted.reasoningType,
        estimatedSteps: extracted.estimatedSteps,
        questionMarkdown: block,
        answerMarkdown: extracted.answerMarkdown || null,
        options: extracted.options || null,
        canonicalQuestionHash: canonicalHash,
      });

      // Concept-First Normalization and Mapping
      let resolvedChapterId: string | null = null;
      for (const conceptName of extracted.concepts) {
        try {
          const conceptId = await resolveConceptId(conceptName);

          await db.insert(assessmentObjectConcepts).values({
            id: `aoc-${randomUUID()}`,
            assessmentObjectId,
            conceptId,
          });

          // Link to ALL active KOs sharing this Concept ID
          const activeKOs = await db
            .select({ id: knowledgeObjects.id, chapterId: knowledgeObjects.chapterId })
            .from(knowledgeObjects)
            .where(
              and(
                eq(knowledgeObjects.conceptId, conceptId),
                eq(knowledgeObjects.status, "active")
              )
            );

          for (const ko of activeKOs) {
            await db.insert(assessmentObjectKos).values({
              id: `aok-${randomUUID()}`,
              assessmentObjectId,
              koId: ko.id,
            });
            if (!resolvedChapterId) {
              resolvedChapterId = ko.chapterId;
            }
          }
        } catch (err) {
          console.error(`[Assessment Ingest] Failed to resolve concept "${conceptName}" or map KOs:`, err);
        }
      }

      // Fallback: If no KO was matched, check the assessmentSourceChapters for the parent source
      if (!resolvedChapterId) {
        const sourceChaps = await db
          .select({ chapterId: assessmentSourceChapters.chapterId })
          .from(assessmentSourceChapters)
          .where(eq(assessmentSourceChapters.assessmentSourceId, sourceId))
          .limit(1);
        if (sourceChaps.length > 0) {
          resolvedChapterId = sourceChaps[0].chapterId;
        }
      }

      // Queue for vector sync under the 'past_exams' namespace
      await db.insert(vectorSyncQueue).values({
        id: `sync-${randomUUID()}`,
        courseId: source.courseId,
        koId: null,
        action: "upsert",
        namespace: VECTOR_NAMESPACES.past_exams,
        payload: {
          id: assessmentObjectId,
          text: `Question: ${block}\nSolution: ${extracted.answerMarkdown || ""}`,
          metadata: {
            chapterId: resolvedChapterId || "",
            type: "past_exam",
            bloomLevel: extracted.applicationLevel === 1 ? "remember" : extracted.applicationLevel === 2 ? "understand" : "apply",
            difficulty: extracted.difficulty === 1 ? "easy" : extracted.difficulty === 3 ? "hard" : "medium",
            tags: extracted.concepts,
          }
        },
        status: "pending",
        attempts: 0,
      });
    }

    // Mark as completed
    await db
      .update(assessmentSources)
      .set({
        ingestionStatus: "completed",
        ingestionCompletedAt: new Date(),
      })
      .where(eq(assessmentSources.id, sourceId));

    console.log(`[Assessment Ingest] Ingestion completed for source: ${source.title}`);

    // Update dynamic course assessment profile
    await updateAssessmentProfile(source.courseId);
  } catch (error: any) {
    console.error(`[Assessment Ingest] Critical failure during ingestion of source ${sourceId}:`, error);
    await db
      .update(assessmentSources)
      .set({
        ingestionStatus: "failed",
        ingestionError: error.message || String(error),
        ingestionCompletedAt: new Date(),
      })
      .where(eq(assessmentSources.id, sourceId));
    throw error;
  }
}

/**
 * Dynamically aggregates all Assessment Objects of a course to update/insert the Assessment Profile.
 */
export async function updateAssessmentProfile(courseId: string): Promise<void> {
  console.log(`[Assessment Profile] Recalculating profile for course ${courseId}...`);

  const objects = await db
    .select({
      id: assessmentObjects.id,
      difficulty: assessmentObjects.difficulty,
      applicationLevel: assessmentObjects.applicationLevel,
      pattern: assessmentObjects.pattern,
      questionType: assessmentObjects.questionType,
    })
    .from(assessmentObjects)
    .innerJoin(assessmentSources, eq(assessmentObjects.sourceId, assessmentSources.id))
    .where(and(eq(assessmentSources.courseId, courseId), eq(assessmentSources.ingestionStatus, "completed")));

  if (objects.length === 0) {
    console.log(`[Assessment Profile] No assessment objects found for course ${courseId}. Skipping profile update.`);
    return;
  }

  // 1. Calculate average applicationLevel
  const totalLevel = objects.reduce((sum, obj) => sum + obj.applicationLevel, 0);
  const avgApplicationLevel = Math.round(totalLevel / objects.length);

  // 2. Calculate difficultyDistribution
  let easyCount = 0;
  let mediumCount = 0;
  let hardCount = 0;
  for (const obj of objects) {
    if (obj.difficulty === 1) easyCount++;
    else if (obj.difficulty === 2) mediumCount++;
    else if (obj.difficulty === 3) hardCount++;
  }
  const totalCount = objects.length;
  const difficultyDistribution = {
    easy: Math.round((easyCount / totalCount) * 100),
    medium: Math.round((mediumCount / totalCount) * 100),
    hard: Math.round((hardCount / totalCount) * 100),
  };

  // 3. Find commonPatterns
  const patternCounts: Record<string, number> = {};
  for (const obj of objects) {
    patternCounts[obj.pattern] = (patternCounts[obj.pattern] || 0) + 1;
  }
  const commonPatterns = Object.keys(patternCounts).sort((a, b) => patternCounts[b] - patternCounts[a]);

  // 4. Calculate topContexts (concept frequencies)
  const conceptRows = await db
    .select({
      displayName: conceptLocalizations.displayName,
    })
    .from(assessmentObjectConcepts)
    .innerJoin(conceptLocalizations, eq(assessmentObjectConcepts.conceptId, conceptLocalizations.conceptId))
    .innerJoin(assessmentObjects, eq(assessmentObjectConcepts.assessmentObjectId, assessmentObjects.id))
    .innerJoin(assessmentSources, eq(assessmentObjects.sourceId, assessmentSources.id))
    .where(eq(assessmentSources.courseId, courseId));

  const conceptCounts: Record<string, number> = {};
  let totalConceptReferences = 0;
  for (const row of conceptRows) {
    conceptCounts[row.displayName] = (conceptCounts[row.displayName] || 0) + 1;
    totalConceptReferences++;
  }

  const topContexts = Object.entries(conceptCounts)
    .map(([conceptName, count]) => ({
      conceptName,
      percentage: Math.round((count / totalConceptReferences) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  // 5. Update or insert into assessmentProfiles
  const [existingProfile] = await db
    .select()
    .from(assessmentProfiles)
    .where(eq(assessmentProfiles.courseId, courseId));

  if (existingProfile) {
    await db
      .update(assessmentProfiles)
      .set({
        applicationLevel: avgApplicationLevel,
        difficultyDistribution,
        commonPatterns,
        topContexts,
        updatedAt: new Date(),
      })
      .where(eq(assessmentProfiles.id, existingProfile.id));
  } else {
    await db.insert(assessmentProfiles).values({
      id: `ap-${randomUUID()}`,
      courseId,
      applicationLevel: avgApplicationLevel,
      difficultyDistribution,
      commonPatterns,
      topContexts,
    });
  }

  // Dynamic initialization of Course Policy if it doesn't exist yet (defensive programming)
  const [existingPolicy] = await db
    .select()
    .from(coursePolicies)
    .where(eq(coursePolicies.courseId, courseId));

  if (!existingPolicy) {
    console.log(`[Course Policy] Initializing default policy for course ${courseId}.`);
    await db.insert(coursePolicies).values({
      id: `cp-${randomUUID()}`,
      courseId,
      maxApplicationLevel: 2,
      maxEstimatedSteps: 4,
      maxReadingComplexity: 2,
      allowEngineeringTerms: true,
      forbiddenContexts: [],
      allowedPatterns: ["direct_computation", "graph_interpretation", "parameter_analysis"],
    });
  }

  console.log(`[Assessment Profile] Recalculated profile successfully for course ${courseId}.`);
}

import { db } from "@/db";
import {
  assessmentObjects,
  assessmentProfiles,
  coursePolicies,
  masterTeachingDocuments,
  concepts,
  conceptLocalizations,
  knowledgeObjects,
  assessmentObjectConcepts,
  assessmentObjectKos
} from "@/db/schema";
import { generateContentWithFallback, withGeminiRetry, embedText } from "@/lib/gemini";
import { USE_CASES } from "@/lib/ai-router";
import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { repairJsonString, slugify } from "./ko-utils";
import { normalizeConceptName, cosineSimilarity } from "./ko-extractor";

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
    return normalized.split(/\n\n+/).filter(block => block.trim().length > 0);
  }

  return blocks;
}

/**
 * Extracts Assessment Objects from a Canonical Assessment Markdown document using Gemini.
 */
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
  const matchedLoc = registeredLocalizations.find(loc => {
    if (normalizeConceptName(loc.displayName) === normName) return true;
    const aliases = Array.isArray(loc.aliases) ? loc.aliases : [];
    return aliases.some(alias => normalizeConceptName(alias) === normName);
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
 * Extracts Assessment Objects from a Canonical Assessment Markdown document using Gemini.
 */
export async function extractAssessmentObjectsForMtd(
  courseId: string,
  mtdId: string,
  markdownContent: string,
  isMockOverride?: boolean
): Promise<void> {
  const isMock = isMockOverride ?? (process.env.MOCK_GEMINI === "true");
  const blocks = parseAssessmentMarkdownIntoBlocks(markdownContent);
  console.log(`[Assessment Ingest] Split assessment into ${blocks.length} blocks.`);

  // Dual-Hashing implementation for Assessment Canonical Documents
  const { createHash } = await import("crypto");
  const sourceHash = createHash("sha256").update(markdownContent).digest("hex");
  const derivedHashInput = [...blocks].sort().join("|");
  const derivedHash = createHash("sha256").update(derivedHashInput).digest("hex");

  const [existingMtd] = await db
    .select()
    .from(masterTeachingDocuments)
    .where(eq(masterTeachingDocuments.id, mtdId));

  const derivedHashChanged = !existingMtd || existingMtd.derivedHash !== derivedHash;
  const nextVersion = existingMtd ? (derivedHashChanged ? existingMtd.version + 1 : existingMtd.version) : 1;

  await db
    .update(masterTeachingDocuments)
    .set({
      sourceHash,
      derivedHash,
      version: nextVersion,
      updatedAt: new Date(),
    })
    .where(eq(masterTeachingDocuments.id, mtdId));

  // Delete previous assessment objects for this MTD before re-extracting
  await db.delete(assessmentObjects).where(eq(assessmentObjects.sourceMtdId, mtdId));

  for (const block of blocks) {
    let extracted: z.infer<typeof AssessmentObjectExtractionSchema>;

    if (isMock) {
      // Mock extraction for local dev/testing
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
      // Call Gemini for structured metadata classification and content extraction
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
        // Fallback default so ingestion does not completely fail
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

    // Save extracted object to Turso
    await db.insert(assessmentObjects).values({
      id: assessmentObjectId,
      courseId,
      sourceMtdId: mtdId,
      questionType: extracted.questionType,
      difficulty: extracted.difficulty,
      applicationLevel: extracted.applicationLevel,
      concepts: extracted.concepts,
      pattern: extracted.pattern,
      reasoningType: extracted.reasoningType,
      estimatedSteps: extracted.estimatedSteps,
      questionMarkdown: block,
      answerMarkdown: extracted.answerMarkdown || null,
      options: extracted.options || null,
    });

    // Concept-First Normalization and Mapping
    for (const conceptName of extracted.concepts) {
      try {
        const conceptId = await resolveConceptId(conceptName);

        // Link Assessment Object to Concept Registry
        await db.insert(assessmentObjectConcepts).values({
          id: `aoc-${randomUUID()}`,
          assessmentObjectId,
          conceptId,
        });

        // Link to ALL active KOs sharing this Concept ID
        const activeKOs = await db
          .select({ id: knowledgeObjects.id })
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
        }
      } catch (err) {
        console.error(`[Assessment Ingest] Failed to resolve concept "${conceptName}" or map KOs:`, err);
      }
    }
  }

  // Recalculate dynamic course Assessment Profile after new objects are saved
  await updateAssessmentProfile(courseId);
}

/**
 * Dynamically aggregates all Assessment Objects of a course to update/insert the Assessment Profile.
 */
export async function updateAssessmentProfile(courseId: string): Promise<void> {
  console.log(`[Assessment Profile] Recalculating profile for course ${courseId}...`);

  const objects = await db
    .select()
    .from(assessmentObjects)
    .where(eq(assessmentObjects.courseId, courseId));

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
  const conceptCounts: Record<string, number> = {};
  let totalConceptReferences = 0;
  for (const obj of objects) {
    for (const concept of obj.concepts) {
      conceptCounts[concept] = (conceptCounts[concept] || 0) + 1;
      totalConceptReferences++;
    }
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

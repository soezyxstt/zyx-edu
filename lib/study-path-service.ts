import { randomUUID } from "node:crypto";
import { db } from "@/db";
import {
  knowledgeObjects,
  knowledgeRelationships,
  chapters,
  studentConceptMastery,
  websiteMaterials,
  quizTemplates,
  flashcards,
  studyPaths,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import * as Sentry from "@sentry/nextjs";

export interface StudyPathStep {
  conceptName: string;
  status: "locked" | "available" | "in_progress" | "mastered";
  actions: {
    moduleHref?: string;
    quizTemplateId?: string;
    flashcardCount?: number;
  };
  estimatedMinutes: number;
  prerequisites: string[]; // List of prereq concept names for UI unlocks-after description
  masteryScore?: number;
}

/**
 * Computes the study path for a student in a course and returns the list of steps.
 */
export async function computeStudyPath(
  studentId: string,
  courseId: string
): Promise<StudyPathStep[]> {
  // 1. Fetch all active Knowledge Objects for this course joined with published chapters
  const activeKOs = await db
    .select({
      id: knowledgeObjects.id,
      conceptId: knowledgeObjects.conceptId,
      conceptName: knowledgeObjects.conceptName,
      importance: knowledgeObjects.importance,
      chapterId: knowledgeObjects.chapterId,
      chapterOrderIndex: chapters.orderIndex,
      tags: knowledgeObjects.tags,
    })
    .from(knowledgeObjects)
    .innerJoin(chapters, eq(knowledgeObjects.chapterId, chapters.id))
    .where(
      and(
        eq(knowledgeObjects.courseId, courseId),
        eq(knowledgeObjects.status, "active"),
        eq(chapters.status, "published")
      )
    );

  if (activeKOs.length === 0) return [];

  // Group KOs by normalized conceptName
  const conceptMap = new Map<string, typeof activeKOs>();
  for (const ko of activeKOs) {
    const key = ko.conceptName.trim();
    const list = conceptMap.get(key) || [];
    list.push(ko);
    conceptMap.set(key, list);
  }

  const conceptNames = Array.from(conceptMap.keys());

  // 2. Fetch student's concept mastery
  const masteryRows = await db
    .select()
    .from(studentConceptMastery)
    .where(
      and(
        eq(studentConceptMastery.studentId, studentId),
        eq(studentConceptMastery.courseId, courseId)
      )
    );

  const masteryMap = new Map<string, { masteryScore: number; confidence: number }>();
  for (const row of masteryRows) {
    masteryMap.set(row.conceptName.trim(), {
      masteryScore: row.masteryScore,
      confidence: row.confidence,
    });
  }

  // 3. Fetch knowledge relationships of type prerequisite
  const relationships = await db
    .select({
      sourceKoId: knowledgeRelationships.sourceKoId,
      targetKoId: knowledgeRelationships.targetKoId,
    })
    .from(knowledgeRelationships)
    .where(eq(knowledgeRelationships.type, "prerequisite"));

  // Create a mapping of KO ID to normalized concept name
  const koIdToConcept = new Map<string, string>();
  for (const ko of activeKOs) {
    koIdToConcept.set(ko.id, ko.conceptName.trim());
  }

  // 4. Build prerequisite edges between conceptNames
  const adjList = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  for (const name of conceptNames) {
    adjList.set(name, new Set());
    inDegree.set(name, 0);
  }

  const edgeTracker = new Set<string>();

  for (const rel of relationships) {
    const srcConcept = koIdToConcept.get(rel.sourceKoId);
    const tgtConcept = koIdToConcept.get(rel.targetKoId);

    if (srcConcept && tgtConcept && srcConcept !== tgtConcept) {
      const edgeKey = `${srcConcept}->${tgtConcept}`;
      if (!edgeTracker.has(edgeKey)) {
        edgeTracker.add(edgeKey);
        adjList.get(srcConcept)!.add(tgtConcept);
        inDegree.set(tgtConcept, inDegree.get(tgtConcept)! + 1);
      }
    }
  }

  // Helper values for sorting ready set
  const conceptChapterOrder = new Map<string, number>();
  const conceptImportance = new Map<string, number>();

  for (const [name, kos] of conceptMap.entries()) {
    // Concept chapter order = minimum orderIndex among all its KOs
    const minOrder = Math.min(...kos.map((k) => k.chapterOrderIndex));
    conceptChapterOrder.set(name, minOrder);

    // Concept importance = maximum importance among all its KOs (high=3, medium=2, low=1)
    const impScores = kos.map((k) => {
      if (k.importance === "high") return 3;
      if (k.importance === "low") return 1;
      return 2; // medium
    });
    conceptImportance.set(name, Math.max(...impScores));
  }

  // 5. Kahn's Topological Sort with Cycle Resolution
  const sortedConcepts: string[] = [];
  const remainingNodes = new Set<string>(conceptNames);

  // We maintain mutable copies of inDegree and adjList for the sort process
  const workingInDegree = new Map(inDegree);
  const workingAdjList = new Map<string, Set<string>>();
  for (const [k, v] of adjList.entries()) {
    workingAdjList.set(k, new Set(v));
  }

  const getReadySet = () => {
    const ready: string[] = [];
    for (const node of remainingNodes) {
      if ((workingInDegree.get(node) || 0) === 0) {
        ready.push(node);
      }
    }
    return ready;
  };

  while (remainingNodes.size > 0) {
    const readySet = getReadySet();

    if (readySet.length === 0) {
      // Cycle detected! Log warning and break an edge
      const cycleDescription = `Cycle detected in course ${courseId} prerequisites among: ${Array.from(
        remainingNodes
      ).join(", ")}`;
      console.warn(cycleDescription);
      Sentry.captureMessage(cycleDescription, "warning");

      // Find all remaining edges
      const remainingEdges: { source: string; target: string }[] = [];
      for (const src of remainingNodes) {
        const targets = workingAdjList.get(src) || new Set();
        for (const tgt of targets) {
          if (remainingNodes.has(tgt)) {
            remainingEdges.push({ source: src, target: tgt });
          }
        }
      }

      if (remainingEdges.length === 0) {
        // Fallback: If no edges remain, just break the remaining nodes by forcing empty inDegree
        for (const node of remainingNodes) {
          workingInDegree.set(node, 0);
        }
        continue;
      }

      // Filter edges where target is later in chapter order than source
      let candidates = remainingEdges.filter(
        (e) => (conceptChapterOrder.get(e.target) || 0) > (conceptChapterOrder.get(e.source) || 0)
      );

      // If no forward edges in the cycle, consider all remaining edges
      if (candidates.length === 0) {
        candidates = remainingEdges;
      }

      // Sort candidates to deterministically select the edge to break
      candidates.sort((a, b) => {
        const targetOrderDiff =
          (conceptChapterOrder.get(b.target) || 0) - (conceptChapterOrder.get(a.target) || 0);
        if (targetOrderDiff !== 0) return targetOrderDiff;

        const srcOrderDiff =
          (conceptChapterOrder.get(a.source) || 0) - (conceptChapterOrder.get(b.source) || 0);
        if (srcOrderDiff !== 0) return srcOrderDiff;

        const targetNameDiff = a.target.localeCompare(b.target);
        if (targetNameDiff !== 0) return targetNameDiff;

        return a.source.localeCompare(b.source);
      });

      // Break the selected edge
      const edgeToBreak = candidates[0];
      workingAdjList.get(edgeToBreak.source)!.delete(edgeToBreak.target);
      workingInDegree.set(
        edgeToBreak.target,
        Math.max(0, (workingInDegree.get(edgeToBreak.target) || 0) - 1)
      );

      console.warn(`Broke cycle edge: ${edgeToBreak.source} -> ${edgeToBreak.target}`);
      continue;
    }

    // Sort readySet
    readySet.sort((a, b) => {
      const masteryA = masteryMap.get(a)?.masteryScore || 0;
      const masteryB = masteryMap.get(b)?.masteryScore || 0;
      if (masteryA !== masteryB) return masteryA - masteryB;

      const orderA = conceptChapterOrder.get(a) || 0;
      const orderB = conceptChapterOrder.get(b) || 0;
      if (orderA !== orderB) return orderA - orderB;

      const impA = conceptImportance.get(a) || 0;
      const impB = conceptImportance.get(b) || 0;
      if (impA !== impB) return impB - impA;

      return a.localeCompare(b);
    });

    const current = readySet[0];
    sortedConcepts.push(current);
    remainingNodes.delete(current);

    const targets = workingAdjList.get(current) || new Set();
    for (const tgt of targets) {
      if (remainingNodes.has(tgt)) {
        workingInDegree.set(tgt, Math.max(0, (workingInDegree.get(tgt) || 0) - 1));
      }
    }
  }

  // 6. Fetch published website materials
  const materials = await db
    .select({
      id: websiteMaterials.id,
      chapterId: websiteMaterials.chapterId,
      structuredContent: websiteMaterials.structuredContent,
    })
    .from(websiteMaterials)
    .where(
      and(
        eq(websiteMaterials.courseId, courseId),
        eq(websiteMaterials.status, "published")
      )
    );

  const chapterToMaterial = new Map<string, typeof materials[0]>();
  for (const mat of materials) {
    chapterToMaterial.set(mat.chapterId, mat);
  }

  // 7. Fetch published quiz templates
  const quizTemplatesList = await db
    .select({
      id: quizTemplates.id,
      title: quizTemplates.title,
      selectionRules: quizTemplates.selectionRules,
    })
    .from(quizTemplates)
    .where(eq(quizTemplates.courseId, courseId));

  // 8. Fetch active flashcards count
  const activeKoIds = activeKOs.map((k) => k.id);
  const flashcardRows = activeKoIds.length > 0
    ? await db
        .select({
          id: flashcards.id,
          koId: flashcards.koId,
        })
        .from(flashcards)
        .where(
          and(
            eq(flashcards.status, "active"),
            inArray(flashcards.koId, activeKoIds)
          )
        )
    : [];

  const koIdToFlashcardCount = new Map<string, number>();
  for (const card of flashcardRows) {
    if (card.koId) {
      koIdToFlashcardCount.set(card.koId, (koIdToFlashcardCount.get(card.koId) || 0) + 1);
    }
  }

  // 9. Map relationships back to concept-level prerequisites
  const conceptPrereqs = new Map<string, string[]>();
  for (const name of conceptNames) {
    conceptPrereqs.set(name, []);
  }

  for (const rel of relationships) {
    const srcConcept = koIdToConcept.get(rel.sourceKoId);
    const tgtConcept = koIdToConcept.get(rel.targetKoId);

    if (srcConcept && tgtConcept && srcConcept !== tgtConcept) {
      const list = conceptPrereqs.get(tgtConcept) || [];
      if (!list.includes(srcConcept)) {
        list.push(srcConcept);
        conceptPrereqs.set(tgtConcept, list);
      }
    }
  }

  // 10. Assemble steps
  const steps: StudyPathStep[] = [];

  for (const conceptName of sortedConcepts) {
    const kos = conceptMap.get(conceptName) || [];
    const firstKo = kos[0];

    // Find website material
    const material = firstKo ? chapterToMaterial.get(firstKo.chapterId) : undefined;
    const moduleHref = material
      ? `/courses/${courseId}/material/${material.id}`
      : undefined;

    // Estimate material reading time
    let readingTime = 0;
    if (material?.structuredContent) {
      try {
        const parsed = material.structuredContent as {
          documentMetadata?: {
            estimatedReadingTimeMin?: number;
          };
        } | null;
        readingTime = parsed?.documentMetadata?.estimatedReadingTimeMin || 0;
      } catch {
        readingTime = 0;
      }
    }

    // Match quiz template
    const matchedQuiz = quizTemplatesList.find((template) => {
      try {
        const rules = template.selectionRules as {
          tags?: string[];
        } | null;
        const tags = rules?.tags || [];
        const matchesTag = tags.some((t) => t.toLowerCase() === conceptName.toLowerCase());
        const matchesKoTag = tags.some((t) =>
          kos.some((k) =>
            ((k.tags as string[] | undefined) || []).some(
              (kt) => kt.toLowerCase() === t.toLowerCase()
            )
          )
        );
        const matchesTitle = template.title.toLowerCase().includes(conceptName.toLowerCase());
        return matchesTag || matchesKoTag || matchesTitle;
      } catch {
        return false;
      }
    });

    const quizTemplateId = matchedQuiz?.id;

    // Count flashcards
    let flashcardCount = 0;
    for (const ko of kos) {
      flashcardCount += koIdToFlashcardCount.get(ko.id) || 0;
    }

    // Calculate estimatedMinutes
    const estimatedMinutes = Math.ceil(readingTime + (quizTemplateId ? 10 : 0) + 0.5 * flashcardCount);

    // Compute status
    const mastery = masteryMap.get(conceptName);
    const score = mastery?.masteryScore || 0;
    const confidence = mastery?.confidence || 0;

    let status: StudyPathStep["status"] = "available";

    // mastered = score >= 70 && confidence >= 50
    const isMastered = score >= 70 && confidence >= 50;

    // Fetch prerequisite names
    const prereqsList = conceptPrereqs.get(conceptName) || [];

    // locked = any prereq score < 40
    let isLocked = false;
    for (const prereqName of prereqsList) {
      const prereqMastery = masteryMap.get(prereqName);
      const prereqScore = prereqMastery?.masteryScore || 0;
      if (prereqScore < 40) {
        isLocked = true;
        break;
      }
    }

    if (isMastered) {
      status = "mastered";
    } else if (isLocked) {
      status = "locked";
    } else if (mastery) {
      status = "in_progress";
    } else {
      status = "available";
    }

    steps.push({
      conceptName,
      status,
      actions: {
        moduleHref,
        quizTemplateId,
        flashcardCount: flashcardCount > 0 ? flashcardCount : undefined,
      },
      estimatedMinutes,
      prerequisites: prereqsList,
      masteryScore: score,
    });
  }

  return steps;
}

/**
 * Recomputes the study path and saves it to the database.
 */
export async function recomputeStudyPath(studentId: string, courseId: string): Promise<StudyPathStep[]> {
  const start = Date.now();
  const steps = await computeStudyPath(studentId, courseId);

  await db
    .insert(studyPaths)
    .values({
      id: randomUUID(),
      studentId,
      courseId,
      pathJson: steps,
      computedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [studyPaths.studentId, studyPaths.courseId],
      set: {
        pathJson: steps,
        computedAt: new Date(),
      },
    });

  const duration = Date.now() - start;
  console.log(`Recomputed study path for student ${studentId} in course ${courseId} in ${duration}ms`);
  return steps;
}

/**
 * Gets the student's study path from the cache, or computes it if missing.
 */
export async function getOrComputeStudyPath(studentId: string, courseId: string): Promise<StudyPathStep[]> {
  const [existing] = await db
    .select()
    .from(studyPaths)
    .where(
      and(
        eq(studyPaths.studentId, studentId),
        eq(studyPaths.courseId, courseId)
      )
    )
    .limit(1);

  if (existing) {
    return existing.pathJson as StudyPathStep[];
  }

  return recomputeStudyPath(studentId, courseId);
}

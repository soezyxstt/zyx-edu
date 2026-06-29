"use server";

import { db } from "@/db";
import {
  user as userTable,
  courses,
  concepts,
  conceptLocalizations,
  masterTeachingDocuments,
  chapters,
  knowledgeObjects,
  websiteMaterials,
  flashcardSets,
  flashcards,
  assessmentSources,
  assessmentSourceChapters,
  assessmentObjects,
  knowledgeRelationships,
  vectorSyncQueue,
  assessmentObjectConcepts,
  assessmentObjectKos,
} from "@/db/schema";
import { slugify } from "@/lib/ko-utils";
import { assertAdmin } from "@/lib/uploadthing-admin";
import { randomUUID, createHash } from "crypto";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Import post-processing functions
import { compileMarkdown } from "@/lib/markdown-compiler";
import { verifyKOCoverage } from "@/lib/ko-coverage-auditor";
import { buildTermIndex } from "@/lib/term-index";
import { buildConceptGraph } from "@/lib/graph-trace";
import { updateAssessmentProfile } from "@/lib/assessment-extractor";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function computeMaterialHash(kos: any[]): string {
  const hash = createHash("sha256");
  kos.forEach((ko) => {
    hash.update(`${ko.title}:${ko.content}`);
  });
  return hash.digest("hex");
}

function computeFlashcardSetHash(fcs: any[]): string {
  const hash = createHash("sha256");
  fcs.forEach((fc) => {
    hash.update(`${fc.front}:${fc.back}`);
  });
  return hash.digest("hex");
}

function canonicalizeMarkdown(md: string, idMap: Map<string, string>): string {
  return md.replace(/ref="([^"]+)"/g, (match, ref) => {
    const uuid = idMap.get(ref);
    if (!uuid) throw new Error(`Unresolvable markdown ref: "${ref}"`);
    return `koId="${uuid}"`;
  });
}

function chunks<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export interface ImportResult {
  success: boolean;
  error: string | null;
  friendlyExplanation?: string | null;
  jsonSnippet?: string | null;
  errorContext?: {
    courseTitle?: string;
    chapterTitle?: string;
    chapterIndex?: number;
    entityType?: "Mata Kuliah" | "Bab" | "Knowledge Object (Materi)" | "Konsep" | "Materi Website" | "Kartu Flash" | "Sumber Ujian" | "Butir Soal" | "Relasi Pengetahuan";
    entityName?: string;
    propertyName?: string;
  } | null;
  logs: string[];
  stats?: {
    courseId: string;
    chapterCount: number;
    koCount: number;
    wmCount: number;
    fsetCount: number;
    fcCount: number;
    asCount: number;
    aoCount: number;
    krCount: number;
  };
}

interface ErrorContext {
  courseTitle?: string;
  chapterTitle?: string;
  chapterIndex?: number;
  entityType?: "Mata Kuliah" | "Bab" | "Knowledge Object (Materi)" | "Konsep" | "Materi Website" | "Kartu Flash" | "Sumber Ujian" | "Butir Soal" | "Relasi Pengetahuan";
  entityName?: string;
  propertyName?: string;
}

function findJsonErrorContext(jsonText: string, errorPos: number): ErrorContext | null {
  try {
    let i = 0;
    const stack: { type: "object" | "array"; key?: string; index?: number }[] = [];
    let currentKey: string | undefined = undefined;

    let courseTitle = "";
    let chapterTitle = "";
    let chapterIndex = -1;
    let koTitle = "";
    let conceptSlug = "";
    let conceptName = "";
    let fsetTitle = "";
    let asTitle = "";
    let aoOrder = -1;
    let krSource = "";
    let krTarget = "";

    while (i < errorPos) {
      const char = jsonText[i];
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      if (char === '"') {
        let str = "";
        i++;
        while (i < errorPos) {
          if (jsonText[i] === '"') {
            break;
          }
          if (jsonText[i] === '\\') {
            str += '\\';
            i++;
            if (i < errorPos) {
              str += jsonText[i];
            }
          } else {
            str += jsonText[i];
          }
          i++;
        }
        i++;

        let nextIdx = i;
        while (nextIdx < errorPos && /\s/.test(jsonText[nextIdx])) {
          nextIdx++;
        }

        if (nextIdx < errorPos && jsonText[nextIdx] === ':') {
          currentKey = str;
          i = nextIdx + 1;
        } else {
          if (currentKey) {
            const parent = stack[stack.length - 1];
            if (parent && parent.type === "object") {
              const grandparent = stack[stack.length - 2];
              
              if (currentKey === "title") {
                if (stack.length === 2 && stack[0].key === "course") {
                  courseTitle = str;
                } else if (parent.key === "chapters" || (grandparent && grandparent.key === "chapters")) {
                  chapterTitle = str;
                } else if (parent.key === "knowledgeObjects" || (grandparent && grandparent.key === "knowledgeObjects")) {
                  koTitle = str;
                } else if (parent.key === "flashcardSets" || (grandparent && grandparent.key === "flashcardSets")) {
                  fsetTitle = str;
                } else if (parent.key === "assessmentSources" || (grandparent && grandparent.key === "assessmentSources")) {
                  asTitle = str;
                }
              } else if (currentKey === "canonicalSlug") {
                conceptSlug = str;
              } else if (currentKey === "displayName") {
                conceptName = str;
              } else if (currentKey === "sourceKo$ref") {
                krSource = str;
              } else if (currentKey === "targetKo$ref") {
                krTarget = str;
              }
            }
            currentKey = undefined;
          }
        }
        continue;
      }

      if (char === '{') {
        stack.push({ type: "object", key: currentKey });
        currentKey = undefined;
        i++;
        continue;
      }

      if (char === '}') {
        stack.pop();
        currentKey = undefined;
        i++;
        continue;
      }

      if (char === '[') {
        stack.push({ type: "array", key: currentKey, index: 0 });
        currentKey = undefined;
        i++;
        continue;
      }

      if (char === ']') {
        stack.pop();
        currentKey = undefined;
        i++;
        continue;
      }

      if (char === ',') {
        const top = stack[stack.length - 1];
        if (top && top.type === "array" && top.index !== undefined) {
          top.index++;
        }
        currentKey = undefined;
        i++;
        continue;
      }

      if (/[0-9\-tfn]/.test(char)) {
        let valStr = "";
        while (i < errorPos && /[0-9\.a-zA-Z\-+]/.test(jsonText[i])) {
          valStr += jsonText[i];
          i++;
        }
        if (currentKey === "questionOrder") {
          const num = parseInt(valStr, 10);
          if (!isNaN(num)) aoOrder = num;
        }
        currentKey = undefined;
        continue;
      }

      i++;
    }

    let entityType: ErrorContext["entityType"] = undefined;
    let entityName = "";
    let propertyName = currentKey;

    const chaptersElement = stack.find(el => el.key === "chapters");
    if (chaptersElement && chaptersElement.index !== undefined) {
      chapterIndex = chaptersElement.index;
    }

    const currentContainer = stack[stack.length - 1];
    const parentContainer = stack[stack.length - 2];

    if (currentContainer) {
      if (currentContainer.key === "course" || (parentContainer && parentContainer.key === "course")) {
        entityType = "Mata Kuliah";
        entityName = courseTitle || "Mata Kuliah Baru";
      } else if (currentContainer.key === "chapters" || (parentContainer && parentContainer.key === "chapters" && stack.length <= 5)) {
        entityType = "Bab";
        entityName = chapterTitle || `Bab ke-${chapterIndex + 1}`;
      } else if (stack.some(el => el.key === "knowledgeObjects")) {
        entityType = "Knowledge Object (Materi)";
        entityName = koTitle || "Materi Baru";
      } else if (stack.some(el => el.key === "concepts")) {
        entityType = "Konsep";
        entityName = conceptName || conceptSlug || "Konsep Baru";
      } else if (stack.some(el => el.key === "websiteMaterials")) {
        entityType = "Materi Website";
        entityName = "Dokumen Markdown Bab";
      } else if (stack.some(el => el.key === "flashcardSets")) {
        entityType = "Kartu Flash";
        entityName = fsetTitle || "Set Flashcard";
      } else if (stack.some(el => el.key === "assessmentSources")) {
        entityType = "Sumber Ujian";
        entityName = asTitle || "Sumber Ujian Baru";
      } else if (stack.some(el => el.key === "assessmentObjects")) {
        entityType = "Butir Soal";
        entityName = aoOrder !== -1 ? `Soal nomor ${aoOrder}` : "Butir Soal Baru";
      } else if (stack.some(el => el.key === "knowledgeRelationships")) {
        entityType = "Relasi Pengetahuan";
        entityName = krSource && krTarget ? `Relasi (${krSource} -> ${krTarget})` : "Hubungan Antar Materi";
      }
    }

    return {
      courseTitle: courseTitle || undefined,
      chapterTitle: chapterTitle || undefined,
      chapterIndex: chapterIndex !== -1 ? chapterIndex + 1 : undefined,
      entityType,
      entityName: entityName || undefined,
      propertyName: propertyName || undefined,
    };
  } catch (e) {
    console.error("Failed to extract JSON error context:", e);
    return null;
  }
}

function getFriendlyJsonError(errorMsg: string, jsonText: string): {
  message: string;
  snippet?: string;
  line?: number;
  column?: number;
  context?: ErrorContext | null;
} {
  let position: number | null = null;
  let line: number | null = null;
  let column: number | null = null;

  const posMatch = errorMsg.match(/position (\d+)/i);
  if (posMatch) {
    position = parseInt(posMatch[1], 10);
  }

  const lineColMatch = errorMsg.match(/line (\d+)\s+column (\d+)/i);
  if (lineColMatch) {
    line = parseInt(lineColMatch[1], 10);
    column = parseInt(lineColMatch[2], 10);
  }

  if (line !== null && column !== null && position === null) {
    const lines = jsonText.split("\n");
    let pos = 0;
    for (let i = 0; i < line - 1; i++) {
      pos += lines[i].length + 1;
    }
    pos += column - 1;
    position = pos;
  }

  if (position !== null && (line === null || column === null)) {
    const lines = jsonText.slice(0, position).split("\n");
    line = lines.length;
    column = lines[lines.length - 1].length + 1;
  }

  let explanation = "Format data JSON tidak valid.";
  const lowerMsg = errorMsg.toLowerCase();
  
  if (lowerMsg.includes("bad escaped character")) {
    explanation = "Terdapat karakter backslash (\\) yang tidak ditulis dengan benar. Di dalam JSON, garis miring terbalik (\\) harus ditulis ganda (\\\\) jika bermaksud menulis karakter backslash biasa. Contoh: ubah \"C:\\materi\" menjadi \"C:\\\\materi\".";
  } else if (lowerMsg.includes("unexpected token }")) {
    explanation = "Terdapat tanda koma (,) berlebih di akhir item sebelum kurung penutup (}). Silakan hapus tanda koma terakhir tersebut.";
  } else if (lowerMsg.includes("unexpected token ]")) {
    explanation = "Terdapat tanda koma (,) berlebih sebelum kurung siku penutup (]). Silakan hapus tanda koma di item terakhir dalam daftar.";
  } else if (lowerMsg.includes("unexpected string")) {
    explanation = "Ada string/teks yang tidak dipisahkan oleh tanda koma (,) atau tanda titik dua (:). Pastikan semua properti dipisahkan tanda koma.";
  } else if (lowerMsg.includes("unexpected end of json input")) {
    explanation = "File JSON terputus di tengah jalan. Pastikan semua kurung pembuka { atau [ memiliki pasangan penutup } atau ] yang lengkap.";
  } else if (lowerMsg.includes("unexpected token")) {
    explanation = "Ada karakter yang tidak dikenali atau salah letak. Pastikan tanda kutip ganda (\"), koma (,), dan tanda kurung seimbang.";
  }

  let snippet = "";
  if (line !== null && column !== null) {
    const allLines = jsonText.split("\n");
    const startLine = Math.max(0, line - 4);
    const endLine = Math.min(allLines.length - 1, line + 3);
    
    const linesToDisplay: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      const lineNum = i + 1;
      const isErrorLine = lineNum === line;
      const prefix = isErrorLine ? "👉 " : "   ";
      linesToDisplay.push(`${prefix}${lineNum.toString().padStart(4, " ")} | ${allLines[i]}`);
      
      if (isErrorLine) {
        const indent = " ".repeat(11);
        const caretIndent = " ".repeat(column);
        linesToDisplay.push(`${indent}${caretIndent}^ (Karakter salah di sekitar kolom ${column})`);
      }
    }
    snippet = linesToDisplay.join("\n");
  }

  const context = position !== null ? findJsonErrorContext(jsonText, position) : null;

  const cleanMessage = `Gagal Membaca File JSON: ${explanation}\n\nLokasi error: Baris ${line}, Kolom ${column}`;
  return {
    message: cleanMessage,
    snippet,
    line: line || undefined,
    column: column || undefined,
    context
  };
}

export async function importCourseBundleAction(
  bundleJsonText: string,
  options: {
    mode: "create" | "upsert" | "append";
    postProcess: boolean;
    dryRun: boolean;
  }
): Promise<ImportResult> {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(`[${new Date().toISOString().split("T")[1].slice(0, 8)}] ${msg}`);
  };

  try {
    // 1. Authorization
    await assertAdmin();
    log("=== BUNDLE IMPORTER STARTED ===");
    log(`Options: Mode=${options.mode}, PostProcess=${options.postProcess}, DryRun=${options.dryRun}`);

    // 2. Parse JSON
    let bundle: any;
    try {
      bundle = JSON.parse(bundleJsonText);
      log("Successfully parsed JSON payload.");
    } catch (err: any) {
      const friendly = getFriendlyJsonError(err.message || String(err), bundleJsonText);
      return {
        success: false,
        error: `Invalid JSON format: ${err.message}`,
        friendlyExplanation: friendly.message,
        jsonSnippet: friendly.snippet,
        errorContext: friendly.context,
        logs
      };
    }

    // 3. Basic Validation
    if (!bundle.metadata || !bundle.metadata.schemaVersion) {
      return {
        success: false,
        error: "Missing bundle metadata or schemaVersion.",
        friendlyExplanation: "Format file bundel tidak dikenali. File yang diunggah tidak memiliki informasi metadata atau versi skema (schemaVersion). Pastikan file tersebut adalah file bundel matakuliah Zyx yang valid.",
        logs
      };
    }
    const ver = bundle.metadata.schemaVersion;
    log(`Detected schema version: ${ver}`);
    if (ver !== "1.0" && ver !== "1.1" && ver !== "1.1.1") {
      return {
        success: false,
        error: `Unsupported schema version "${ver}". Supported: 1.0, 1.1, 1.1.1.`,
        friendlyExplanation: `Versi skema "${ver}" tidak didukung oleh sistem. Versi skema yang didukung saat ini adalah: 1.0, 1.1, atau 1.1.1. Silakan periksa kembali file bundel Anda atau lakukan ekspor ulang menggunakan versi compiler yang sesuai.`,
        logs
      };
    }

    if (!bundle.course || !bundle.course.title || !bundle.course.category) {
      return {
        success: false,
        error: "Course object must specify a title and category.",
        friendlyExplanation: "Informasi matakuliah tidak lengkap. Properti \"course\" dalam file JSON harus mencantumkan nama matakuliah (title) dan kategori (category).",
        logs
      };
    }

    if (!Array.isArray(bundle.course.chapters) || bundle.course.chapters.length === 0) {
      return {
        success: false,
        error: "Course must contain a non-empty chapters array.",
        friendlyExplanation: "Bundel matakuliah ini kosong. Properti \"chapters\" harus berupa daftar (array) bab belajar dan tidak boleh kosong.",
        logs
      };
    }

    // 4. Setup Author User
    const importerEmail = "bundle-importer@zyx.internal";
    let authorUuid = "bundle-importer";

    const authorEmail = bundle.author?.email || importerEmail;
    const [dbUser] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, authorEmail))
      .limit(1);

    let isNewUser = false;
    let userRow: any = null;

    if (dbUser) {
      authorUuid = dbUser.id;
      log(`Resolved author to user ID: ${authorUuid}`);
    } else {
      if (authorEmail === importerEmail) {
        isNewUser = true;
        userRow = {
          id: "bundle-importer",
          name: "Bundle Importer",
          email: importerEmail,
          emailVerified: true,
          role: "teacher" as const,
        };
        authorUuid = "bundle-importer";
        log("System user not found. Will create 'bundle-importer'.");
      } else {
        const [systemUser] = await db
          .select()
          .from(userTable)
          .where(eq(userTable.email, importerEmail))
          .limit(1);
        if (systemUser) {
          authorUuid = systemUser.id;
        } else {
          isNewUser = true;
          userRow = {
            id: "bundle-importer",
            name: "Bundle Importer",
            email: importerEmail,
            emailVerified: true,
            role: "teacher" as const,
          };
          authorUuid = "bundle-importer";
        }
        log(`Author "${authorEmail}" not found. Falling back to system importer user.`);
      }
    }

    // 5. Construct Reference Maps & Generate UUIDs (Pass 1)
    const idMap = new Map<string, string>();
    const chapterMtdMap = new Map<string, string>();
    const conceptDisplayNameMap = new Map<string, string>();

    // Resolve course UUID
    let courseUuid: string = randomUUID();
    if (options.mode === "upsert") {
      const [existingCourse] = await db
        .select()
        .from(courses)
        .where(eq(courses.title, bundle.course.title))
        .limit(1);
      if (existingCourse) {
        courseUuid = existingCourse.id;
        log(`Found existing course: "${bundle.course.title}" (${courseUuid}). Reusing ID.`);
      }
    }
    idMap.set("$course", courseUuid);

    const mtdRows: any[] = [];
    const chapterRows: any[] = [];
    const conceptRows: any[] = [];
    const localizationRows: any[] = [];
    const koRows: any[] = [];
    const wmRows: any[] = [];
    const fsetRows: any[] = [];
    const fcRows: any[] = [];

    for (const [chIdx, chapter] of bundle.course.chapters.entries()) {
      let chapterUuid: string = randomUUID();
      const chapterRefKey = chapter.$id || chapter.id || `$chapter-${chIdx}`;

      if (options.mode === "upsert") {
        const [existingChapter] = await db
          .select()
          .from(chapters)
          .where(and(eq(chapters.courseId, courseUuid), eq(chapters.title, chapter.title)))
          .limit(1);
        if (existingChapter) {
          chapterUuid = existingChapter.id;
        }
      }
      idMap.set(chapterRefKey, chapterUuid);

      // Resolve MTD ID
      let mtdUuid: string = `mtd-${randomUUID()}`;
      if (options.mode === "upsert") {
        const [existingWm] = await db
          .select()
          .from(websiteMaterials)
          .where(and(eq(websiteMaterials.courseId, courseUuid), eq(websiteMaterials.chapterId, chapterUuid)))
          .limit(1);
        if (existingWm) {
          mtdUuid = existingWm.sourceMtdId;
        } else {
          const [existingKo] = await db
            .select()
            .from(knowledgeObjects)
            .where(and(eq(knowledgeObjects.courseId, courseUuid), eq(knowledgeObjects.chapterId, chapterUuid)))
            .limit(1);
          if (existingKo) {
            mtdUuid = existingKo.mtdId;
          }
        }
      }
      chapterMtdMap.set(chapterUuid, mtdUuid);

      chapterRows.push({
        id: chapterUuid,
        courseId: courseUuid,
        title: chapter.title,
        description: chapter.description || null,
        orderIndex: chIdx + 1,
        status: "draft",
        assetGenStatus: "idle",
      });

      for (const [conIdx, concept] of (chapter.concepts || []).entries()) {
        let conceptUuid: string = randomUUID();
        const conceptRefKey = concept.$id || concept.id || `$concept-${chIdx}-${conIdx}`;

        if (options.mode === "upsert" || options.mode === "append") {
          const [existingConcept] = await db
            .select()
            .from(concepts)
            .where(eq(concepts.canonicalSlug, concept.canonicalSlug))
            .limit(1);
          if (existingConcept) {
            conceptUuid = existingConcept.id;
          }
        }
        idMap.set(conceptRefKey, conceptUuid);

        const firstDisplayName = concept.localizations?.[0]?.displayName || "Concept";
        const conceptRefId = concept.$id || concept.id;
        if (conceptRefId) {
          conceptDisplayNameMap.set(conceptRefId, firstDisplayName);
        }

        conceptRows.push({
          id: conceptUuid,
          canonicalSlug: concept.canonicalSlug,
          isVerified: false,
        });

        for (const loc of (concept.localizations || [])) {
          localizationRows.push({
            id: randomUUID(),
            conceptId: conceptUuid,
            lang: loc.lang,
            displayName: loc.displayName,
            aliases: loc.aliases || [],
            technicalStandardTerm: "id",
          });
        }
      }

      for (const [koIdx, ko] of (chapter.knowledgeObjects || []).entries()) {
        let koUuid: string = `ko-${randomUUID()}`;
        const koRefKey = ko.$id || ko.id || `$ko-${chIdx}-${koIdx}`;
        if (options.mode === "upsert") {
          const [existingKo] = await db
            .select()
            .from(knowledgeObjects)
            .where(and(eq(knowledgeObjects.chapterId, chapterUuid), eq(knowledgeObjects.title, ko.title)))
            .limit(1);
          if (existingKo) {
            koUuid = existingKo.id;
          }
        }
        idMap.set(koRefKey, koUuid);
      }

      const firstWm = chapter.websiteMaterials?.[0];
      const canonicalMarkdown = firstWm ? canonicalizeMarkdown(firstWm.canonicalMarkdown, idMap) : `# ${chapter.title}`;

      mtdRows.push({
        id: mtdUuid,
        courseId: courseUuid,
        title: `MTD - ${chapter.title}`,
        markdownContent: canonicalMarkdown,
        version: 1,
        status: "draft",
        type: "learning",
        createdById: authorUuid,
      });

      if (firstWm) {
        let wmUuid: string = `wm-${randomUUID()}`;
        if (options.mode === "upsert") {
          const [existingWm] = await db
            .select()
            .from(websiteMaterials)
            .where(and(eq(websiteMaterials.chapterId, chapterUuid), eq(websiteMaterials.slug, firstWm.slug || slugify(firstWm.title))))
            .limit(1);
          if (existingWm) {
            wmUuid = existingWm.id;
          }
        }
        wmRows.push({
          id: wmUuid,
          courseId: courseUuid,
          chapterId: chapterUuid,
          sourceMtdId: mtdUuid,
          sourceMtdVersion: 1,
          generationHash: computeMaterialHash(chapter.knowledgeObjects || []),
          title: firstWm.title,
          slug: firstWm.slug || slugify(firstWm.title),
          canonicalMarkdown,
          structuredContent: firstWm.structuredContent || {},
          status: "draft",
        });
      }

      for (const fset of (chapter.flashcardSets || [])) {
        let fsetUuid: string = `fset-${randomUUID()}`;
        if (options.mode === "upsert") {
          const [existingFset] = await db
            .select()
            .from(flashcardSets)
            .where(and(eq(flashcardSets.chapterId, chapterUuid), eq(flashcardSets.title, fset.title)))
            .limit(1);
          if (existingFset) {
            fsetUuid = existingFset.id;
          }
        }
        fsetRows.push({
          id: fsetUuid,
          courseId: courseUuid,
          chapterId: chapterUuid,
          sourceMtdId: mtdUuid,
          sourceMtdVersion: 1,
          generationHash: computeFlashcardSetHash(fset.flashcards || []),
          title: fset.title,
          status: "draft",
        });

        for (const fcard of (fset.flashcards || [])) {
          let fcUuid: string = `fc-${randomUUID()}`;
          if (options.mode === "upsert") {
            const [existingFc] = await db
              .select()
              .from(flashcards)
              .where(and(eq(flashcards.setId, fsetUuid), eq(flashcards.front, fcard.front)))
              .limit(1);
            if (existingFc) {
              fcUuid = existingFc.id;
            }
          }
          fcRows.push({
            id: fcUuid,
            setId: fsetUuid,
            koId: fcard.ko$ref ? idMap.get(fcard.ko$ref) || null : null,
            front: fcard.front,
            back: fcard.back,
            explanation: fcard.explanation || null,
            metadata: fcard.source ? { _source: fcard.source } : {},
          });
        }
      }
    }

    // Generate KOs Rows (Pass 2)
    for (const [chIdx, chapter] of bundle.course.chapters.entries()) {
      const chapterUuid = idMap.get(chapter.$id || chapter.id || `$chapter-${chIdx}`)!;
      const mtdUuid = chapterMtdMap.get(chapterUuid)!;

      for (const [koIdx, ko] of (chapter.knowledgeObjects || []).entries()) {
        const koUuid = idMap.get(ko.$id || ko.id || `$ko-${chIdx}-${koIdx}`)!;
        let resolvedConceptUuid = "";
        let resolvedConceptName = "";

        if (ko.concept$ref) {
          const matchingUuid = idMap.get(ko.concept$ref);
          if (matchingUuid) resolvedConceptUuid = matchingUuid;
          resolvedConceptName = conceptDisplayNameMap.get(ko.concept$ref) || "Concept";
        } else if (ko.conceptName) {
          const chapterConcepts = chapter.concepts || [];
          const matched = chapterConcepts.find((c: any) =>
            (c.localizations || []).some((loc: any) => loc.displayName === ko.conceptName)
          );
          if (matched) {
            resolvedConceptUuid = idMap.get(matched.$id || matched.id || `$concept-${chIdx}-${chapterConcepts.indexOf(matched)}`)!;
          }
          resolvedConceptName = ko.conceptName;
        }

        if (!resolvedConceptUuid) {
          return { success: false, error: `Failed to resolve concept for KO "${ko.title}" in Chapter "${chapter.title}".`, logs };
        }

        koRows.push({
          id: koUuid,
          courseId: courseUuid,
          mtdId: mtdUuid,
          chapterId: chapterUuid,
          conceptId: resolvedConceptUuid,
          learningOrder: koIdx + 1,
          title: ko.title,
          conceptName: resolvedConceptName,
          content: ko.content,
          type: ko.type,
          bloomLevel: ko.bloomLevel,
          difficulty: ko.difficulty || "medium",
          tags: ko.tags || [],
          importance: ko.importance || "medium",
          metadata: ko.source ? { _source: ko.source } : {},
        });
      }
    }

    // 6. Process Assessment Sources (Pass 2)
    const asRows: any[] = [];
    const ascRows: any[] = [];
    const aoRows: any[] = [];
    const krRows: any[] = [];

    const rootSources = bundle.course["course.assessmentSources"] || bundle.course.assessmentSources || [];
    const chapterSources: any[] = [];
    if (Array.isArray(bundle.course.chapters)) {
      for (const [chIdx, chapter] of bundle.course.chapters.entries()) {
        if (Array.isArray(chapter.assessmentSources)) {
          for (const as of chapter.assessmentSources) {
            if (as) {
              const cloned = { ...as };
              if (!cloned.chapters || cloned.chapters.length === 0) {
                cloned.chapters = [chapter.$id || chapter.id || `$chapter-${chIdx}`];
              }
              chapterSources.push(cloned);
            }
          }
        }
      }
    }

    const combinedSourcesMap = new Map<string, any>();
    for (const as of [...rootSources, ...chapterSources]) {
      if (as && as.title) {
        combinedSourcesMap.set(as.title, as);
      }
    }
    const bundleAssessmentSources = Array.from(combinedSourcesMap.values());
    for (const as of bundleAssessmentSources) {
      let asrcUuid: string = `asrc-${randomUUID()}`;
      if (options.mode === "upsert") {
        const [existingAsrc] = await db
          .select()
          .from(assessmentSources)
          .where(and(eq(assessmentSources.courseId, courseUuid), eq(assessmentSources.title, as.title)))
          .limit(1);
        if (existingAsrc) {
          asrcUuid = existingAsrc.id;
        }
      }

      asRows.push({
        id: asrcUuid,
        courseId: courseUuid,
        title: as.title,
        origin: "generated",
        category: as.category,
        year: as.year,
        semester: as.semester || null,
        sourceMarkdown: as.sourceMarkdown,
        sourceHash: sha256(as.sourceMarkdown),
        originalFilename: as.source?.file || null,
        uploadedByUserId: authorUuid,
        ingestionStatus: "completed" as const,
        ingestionCompletedAt: new Date(),
      });

      for (const ref of (as.chapters || [])) {
        let resolvedChapterUuid = "";
        const matchedChapterUuid = idMap.get(ref);
        if (matchedChapterUuid) {
          resolvedChapterUuid = matchedChapterUuid;
        } else {
          const matched = bundle.course.chapters.find((c: any) => c.title === ref);
          if (matched) {
            const index = bundle.course.chapters.indexOf(matched);
            resolvedChapterUuid = idMap.get(`$chapter-${index}`)!;
          }
        }

        if (!resolvedChapterUuid) {
          return { success: false, error: `Failed to resolve chapter ref "${ref}" for Assessment Source "${as.title}".`, logs };
        }

        let ascUuid: string = `asc-${randomUUID()}`;
        if (options.mode === "upsert") {
          const [existingAsc] = await db
            .select()
            .from(assessmentSourceChapters)
            .where(and(eq(assessmentSourceChapters.assessmentSourceId, asrcUuid), eq(assessmentSourceChapters.chapterId, resolvedChapterUuid)))
            .limit(1);
          if (existingAsc) {
            ascUuid = existingAsc.id;
          }
        }

        ascRows.push({
          id: ascUuid,
          assessmentSourceId: asrcUuid,
          chapterId: resolvedChapterUuid,
        });
      }

      for (const [aoIdx, ao] of (as.assessmentObjects || []).entries()) {
        let aoUuid: string = `ao-${randomUUID()}`;
        if (options.mode === "upsert") {
          const [existingAo] = await db
            .select()
            .from(assessmentObjects)
            .where(and(eq(assessmentObjects.sourceId, asrcUuid), eq(assessmentObjects.questionOrder, aoIdx + 1)))
            .limit(1);
          if (existingAo) {
            aoUuid = existingAo.id;
          }
        }

        aoRows.push({
          id: aoUuid,
          sourceId: asrcUuid,
          questionOrder: aoIdx + 1,
          questionType: ao.questionType,
          difficulty: ao.difficulty,
          pattern: ao.pattern || "general",
          reasoningType: ao.reasoningType || "analytical",
          estimatedSteps: ao.estimatedSteps || 1,
          applicationLevel: ao.applicationLevel || 1,
          questionMarkdown: ao.questionMarkdown || "",
          answerMarkdown: ao.answerMarkdown || null,
          options: ao.options || null,
          canonicalQuestionHash: ao.canonicalQuestionHash || sha256(ao.questionMarkdown || ""),
        });
      }
    }

    // Process Relationships
    for (const kr of (bundle.course.knowledgeRelationships || [])) {
      const srcUuid = idMap.get(kr.sourceKo$ref);
      const tgtUuid = idMap.get(kr.targetKo$ref);
      if (!srcUuid || !tgtUuid) {
        return { success: false, error: `Failed to resolve KO refs for relationship: ${kr.sourceKo$ref} -> ${kr.targetKo$ref}`, logs };
      }

      let krUuid: string = `kr-${randomUUID()}`;
      if (options.mode === "upsert") {
        const [existingKr] = await db
          .select()
          .from(knowledgeRelationships)
          .where(and(eq(knowledgeRelationships.sourceKoId, srcUuid), eq(knowledgeRelationships.targetKoId, tgtUuid), eq(knowledgeRelationships.type, kr.type)))
          .limit(1);
        if (existingKr) {
          krUuid = existingKr.id;
        }
      }

      krRows.push({
        id: krUuid,
        sourceKoId: srcUuid,
        targetKoId: tgtUuid,
        type: kr.type,
      });
    }

    // 7. DB Write Execution
    if (options.dryRun) {
      log("Validation complete. Dry Run enabled, skipping database writes.");
      return {
        success: true,
        error: null,
        logs,
        stats: {
          courseId: courseUuid,
          chapterCount: chapterRows.length,
          koCount: koRows.length,
          wmCount: wmRows.length,
          fsetCount: fsetRows.length,
          fcCount: fcRows.length,
          asCount: asRows.length,
          aoCount: aoRows.length,
          krCount: krRows.length,
        },
      };
    }

    log("Writing data to database inside transaction...");
    const stats = await db.transaction(async (tx) => {
      if (isNewUser && userRow) {
        await tx.insert(userTable).values(userRow).onConflictDoNothing();
      }

      if (options.mode === "upsert") {
        await tx.insert(courses).values({
          id: courseUuid,
          title: bundle.course.title,
          category: bundle.course.category,
          description: bundle.course.description || null,
        }).onConflictDoUpdate({
          target: courses.id,
          set: {
            title: bundle.course.title,
            category: bundle.course.category,
            description: bundle.course.description || null,
          }
        });
      } else if (options.mode === "append") {
        await tx.insert(courses).values({
          id: courseUuid,
          title: bundle.course.title,
          category: bundle.course.category,
          description: bundle.course.description || null,
        }).onConflictDoNothing();
      } else {
        await tx.insert(courses).values({
          id: courseUuid,
          title: bundle.course.title,
          category: bundle.course.category,
          description: bundle.course.description || null,
        });
      }

      for (const c of conceptRows) {
        await tx.insert(concepts).values(c).onConflictDoNothing();
      }

      for (const loc of localizationRows) {
        await tx.insert(conceptLocalizations).values(loc).onConflictDoNothing();
      }

      for (const mtd of mtdRows) {
        if (options.mode === "upsert") {
          await tx.insert(masterTeachingDocuments).values(mtd).onConflictDoUpdate({
            target: masterTeachingDocuments.id,
            set: {
              title: mtd.title,
              markdownContent: mtd.markdownContent,
              updatedAt: new Date(),
            }
          });
        } else {
          await tx.insert(masterTeachingDocuments).values(mtd).onConflictDoNothing();
        }
      }

      for (const chap of chapterRows) {
        if (options.mode === "upsert") {
          await tx.insert(chapters).values(chap).onConflictDoUpdate({
            target: chapters.id,
            set: {
              title: chap.title,
              description: chap.description,
              orderIndex: chap.orderIndex,
              updatedAt: new Date(),
            }
          });
        } else {
          await tx.insert(chapters).values(chap).onConflictDoNothing();
        }
      }

      for (const row of koRows) {
        if (options.mode === "upsert") {
          await tx.insert(knowledgeObjects).values(row).onConflictDoUpdate({
            target: knowledgeObjects.id,
            set: {
              conceptId: row.conceptId,
              learningOrder: row.learningOrder,
              title: row.title,
              conceptName: row.conceptName,
              content: row.content,
              type: row.type,
              bloomLevel: row.bloomLevel,
              difficulty: row.difficulty,
              tags: row.tags,
              importance: row.importance,
              metadata: row.metadata,
              updatedAt: new Date(),
            }
          });
        } else {
          await tx.insert(knowledgeObjects).values(row).onConflictDoNothing();
        }
      }

      for (const row of wmRows) {
        if (options.mode === "upsert") {
          await tx.insert(websiteMaterials).values(row).onConflictDoUpdate({
            target: websiteMaterials.id,
            set: {
              title: row.title,
              slug: row.slug,
              canonicalMarkdown: row.canonicalMarkdown,
              structuredContent: row.structuredContent,
              generationHash: row.generationHash,
              updatedAt: new Date(),
            }
          });
        } else {
          await tx.insert(websiteMaterials).values(row).onConflictDoNothing();
        }
      }

      for (const row of fsetRows) {
        if (options.mode === "upsert") {
          await tx.insert(flashcardSets).values(row).onConflictDoUpdate({
            target: flashcardSets.id,
            set: {
              title: row.title,
              generationHash: row.generationHash,
              updatedAt: new Date(),
            }
          });
        } else {
          await tx.insert(flashcardSets).values(row).onConflictDoNothing();
        }
      }

      for (const row of fcRows) {
        if (options.mode === "upsert") {
          await tx.insert(flashcards).values(row).onConflictDoUpdate({
            target: flashcards.id,
            set: {
              koId: row.koId,
              front: row.front,
              back: row.back,
              explanation: row.explanation,
              metadata: row.metadata,
            }
          });
        } else {
          await tx.insert(flashcards).values(row).onConflictDoNothing();
        }
      }

      for (const row of asRows) {
        if (options.mode === "upsert") {
          await tx.insert(assessmentSources).values(row).onConflictDoUpdate({
            target: assessmentSources.id,
            set: {
              title: row.title,
              sourceMarkdown: row.sourceMarkdown,
              sourceHash: row.sourceHash,
              originalFilename: row.originalFilename,
              ingestionStatus: row.ingestionStatus,
              ingestionCompletedAt: row.ingestionCompletedAt,
              updatedAt: new Date(),
            }
          });
        } else {
          await tx.insert(assessmentSources).values(row).onConflictDoNothing();
        }
      }

      for (const row of ascRows) {
        await tx.insert(assessmentSourceChapters).values(row).onConflictDoNothing();
      }

      for (const row of aoRows) {
        if (options.mode === "upsert") {
          await tx.insert(assessmentObjects).values(row).onConflictDoUpdate({
            target: assessmentObjects.id,
            set: {
              questionType: row.questionType,
              difficulty: row.difficulty,
              pattern: row.pattern,
              reasoningType: row.reasoningType,
              estimatedSteps: row.estimatedSteps,
              applicationLevel: row.applicationLevel,
              questionMarkdown: row.questionMarkdown,
              answerMarkdown: row.answerMarkdown,
              options: row.options,
              canonicalQuestionHash: row.canonicalQuestionHash,
              updatedAt: new Date(),
            }
          });
        } else {
          await tx.insert(assessmentObjects).values(row).onConflictDoNothing();
        }
      }

      for (const row of krRows) {
        await tx.insert(knowledgeRelationships).values(row).onConflictDoNothing();
      }

      return {
        courseId: courseUuid,
        chapterCount: chapterRows.length,
        koCount: koRows.length,
        wmCount: wmRows.length,
        fsetCount: fsetRows.length,
        fcCount: fcRows.length,
        asCount: asRows.length,
        aoCount: aoRows.length,
        krCount: krRows.length,
      };
    });

    log(`Database insert transaction completed. Course ID: ${stats.courseId}`);

    // 8. Post-Processing Phase
    if (options.postProcess) {
      log("Starting post-processing routines...");

      const materialsList = await db.select().from(websiteMaterials).where(eq(websiteMaterials.courseId, courseUuid));
      for (const row of materialsList) {
        log(`Processing material for Chapter ID: ${row.chapterId} ("${row.title}")`);
        try {
          const compilerResult = compileMarkdown(row.canonicalMarkdown, row.chapterId, courseUuid);
          const errors = compilerResult.diagnostics.filter(d => d.severity === "error");
          if (errors.length > 0) {
            log(`  [FAIL] Compilation failed with ${errors.length} errors:`);
            errors.forEach(e => log(`    - ${e.message}`));
            continue;
          }

          const verification = await verifyKOCoverage(row.chapterId, compilerResult.ast);
          const termIndex = await buildTermIndex(row.chapterId);

          const structuredContent = {
            markdown: row.canonicalMarkdown,
            compilerResult,
            compiledAt: new Date().toISOString(),
            compilerVersion: "2.1.0",
            schemaVersion: "1.0.0",
          };

          await db
            .update(websiteMaterials)
            .set({
              structuredContent,
              coverageStatus: verification.status as any,
              coverageReport: verification.report,
              termIndex,
              status: "published",
              isStale: false,
              updatedAt: new Date(),
            })
            .where(eq(websiteMaterials.id, row.id));

          log(`  [SUCCESS] Material AST and term index saved.`);
        } catch (err: any) {
          log(`  [FAIL] Error compiling material: ${err.message || err}`);
        }
      }

      log("Rebuilding concept graph rollup...");
      try {
        const edgeCount = await buildConceptGraph(courseUuid);
        log(`[SUCCESS] Rebuilt concept graph with ${edgeCount} edges.`);
      } catch (err: any) {
        log(`[FAIL] Error building concept graph: ${err.message || err}`);
      }

      log("Enqueuing KOs to Vector Sync Queue...");
      const activeKOs = await db
        .select()
        .from(knowledgeObjects)
        .where(and(eq(knowledgeObjects.courseId, courseUuid), eq(knowledgeObjects.status, "active")));

      let koQueueCount = 0;
      for (const ko of activeKOs) {
        const textToEmbed = `Title: ${ko.title}\nConcept: ${ko.conceptName}\nContent: ${ko.content}`;
        const syncId = `sync-import-${randomUUID()}`;
        await db.insert(vectorSyncQueue).values({
          id: syncId,
          courseId: courseUuid,
          koId: ko.id,
          action: "upsert" as const,
          namespace: "learning" as const,
          payload: {
            text: textToEmbed,
            metadata: {
              chapterId: ko.chapterId,
              type: ko.type,
              bloomLevel: ko.bloomLevel,
              difficulty: ko.difficulty,
              tags: ko.tags,
            }
          },
          status: "pending" as const,
          attempts: 0,
        }).onConflictDoNothing();
        koQueueCount++;
      }
      log(`[SUCCESS] Enqueued ${koQueueCount} KOs to Vector Sync Queue.`);

      log("Processing past exam questions (assessmentObjects) for RAG and concept mapping...");
      try {
        const aos = await db
          .select({
            id: assessmentObjects.id,
            sourceId: assessmentObjects.sourceId,
            questionMarkdown: assessmentObjects.questionMarkdown,
            answerMarkdown: assessmentObjects.answerMarkdown,
            difficulty: assessmentObjects.difficulty,
            applicationLevel: assessmentObjects.applicationLevel,
          })
          .from(assessmentObjects)
          .innerJoin(assessmentSources, eq(assessmentObjects.sourceId, assessmentSources.id))
          .where(eq(assessmentSources.courseId, courseUuid));

        log(`Found ${aos.length} assessment objects to map and enqueue.`);

        const localizations = await db
          .select({
            conceptId: conceptLocalizations.conceptId,
            displayName: conceptLocalizations.displayName,
            aliases: conceptLocalizations.aliases,
          })
          .from(conceptLocalizations)
          .innerJoin(concepts, eq(conceptLocalizations.conceptId, concepts.id));

        let aoQueueCount = 0;
        for (const ao of aos) {
          const sourceChaps = await db
            .select({ chapterId: assessmentSourceChapters.chapterId })
            .from(assessmentSourceChapters)
            .where(eq(assessmentSourceChapters.assessmentSourceId, ao.sourceId));

          const chapterIds = sourceChaps.map(sc => sc.chapterId);
          const resolvedChapterId = chapterIds[0] || "";

          const matchedConceptIds = new Set<string>();
          const matchedConceptNames: string[] = [];

          const questionTextLower = (ao.questionMarkdown + " " + (ao.answerMarkdown || "")).toLowerCase();

          for (const loc of localizations) {
            const nameLower = loc.displayName.toLowerCase();
            const aliases = Array.isArray(loc.aliases) ? loc.aliases : [];

            const isMatched = questionTextLower.includes(nameLower) || 
                              aliases.some(alias => questionTextLower.includes(alias.toString().toLowerCase()));

            if (isMatched) {
              matchedConceptIds.add(loc.conceptId);
              matchedConceptNames.push(loc.displayName);
            }
          }

          if (matchedConceptIds.size === 0 && chapterIds.length > 0) {
            const chapterKOs = await db
              .select({ conceptId: knowledgeObjects.conceptId, conceptName: knowledgeObjects.conceptName })
              .from(knowledgeObjects)
              .where(and(inArray(knowledgeObjects.chapterId, chapterIds), eq(knowledgeObjects.status, "active")));

            for (const ko of chapterKOs) {
              matchedConceptIds.add(ko.conceptId);
              if (!matchedConceptNames.includes(ko.conceptName)) {
                matchedConceptNames.push(ko.conceptName);
              }
            }
          }

          for (const cId of matchedConceptIds) {
            await db.insert(assessmentObjectConcepts).values({
              id: `aoc-import-${randomUUID()}`,
              assessmentObjectId: ao.id,
              conceptId: cId,
            }).onConflictDoNothing();

            let whereClause = and(
              eq(knowledgeObjects.conceptId, cId),
              eq(knowledgeObjects.status, "active")
            );
            if (chapterIds.length > 0) {
              whereClause = and(whereClause, inArray(knowledgeObjects.chapterId, chapterIds));
            }
            const activeKOs = await db
              .select({ id: knowledgeObjects.id })
              .from(knowledgeObjects)
              .where(whereClause);

            for (const ko of activeKOs) {
              await db.insert(assessmentObjectKos).values({
                id: `aok-import-${randomUUID()}`,
                assessmentObjectId: ao.id,
                koId: ko.id,
              }).onConflictDoNothing();
            }
          }

          const textToEmbed = `Question: ${ao.questionMarkdown}\nSolution: ${ao.answerMarkdown || ""}`;
          const syncId = `sync-import-ae-${randomUUID()}`;

          const bloomLevel = ao.applicationLevel === 1 ? "remember" : ao.applicationLevel === 2 ? "understand" : "apply";
          const difficultyText = ao.difficulty <= 3 ? "easy" : ao.difficulty >= 7 ? "hard" : "medium";

          await db.insert(vectorSyncQueue).values({
            id: syncId,
            courseId: courseUuid,
            koId: null,
            action: "upsert" as const,
            namespace: "past_exams" as const,
            payload: {
              id: ao.id,
              text: textToEmbed,
              metadata: {
                chapterId: resolvedChapterId,
                type: "past_exam",
                bloomLevel,
                difficulty: difficultyText,
                tags: matchedConceptNames,
              }
            },
            status: "pending" as const,
            attempts: 0,
          }).onConflictDoNothing();

          aoQueueCount++;
        }
        log(`[SUCCESS] Mapped and enqueued ${aoQueueCount} assessment objects to Vector Sync Queue.`);
      } catch (err: any) {
        log(`[FAIL] Error processing assessment objects: ${err.message || err}`);
      }

      log("Recalculating course assessment profile...");
      try {
        await updateAssessmentProfile(courseUuid);
        log("[SUCCESS] Recalculated course assessment profile.");
      } catch (err: any) {
        log(`[FAIL] Error recalculating course assessment profile: ${err.message || err}`);
      }
    }

    log("=== BUNDLE IMPORTER COMPLETED SUCCESSFULLY ===");

    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    revalidatePath(`/courses/${courseUuid}`);

    return {
      success: true,
      error: null,
      logs,
      stats,
    };
  } catch (err: any) {
    console.error("Bundle importer crash:", err);
    log(`[CRITICAL CRASH] Importer failed: ${err.message || err}`);
    const errMsg = err.message || String(err);
    let friendly = errMsg;
    let errorContext: ImportResult["errorContext"] = null;

    if (errMsg.includes("UNIQUE constraint failed: courses.title")) {
      friendly = "Gagal menyimpan karena nama mata kuliah ini sudah terdaftar di sistem. Silakan gunakan mode 'Upsert' atau ubah judul mata kuliah di file bundel Anda.";
      errorContext = {
        entityType: "Mata Kuliah",
        propertyName: "title",
      };
    } else if (errMsg.includes("UNIQUE constraint failed: concepts.canonical_slug")) {
      friendly = "Gagal menyimpan karena kode unik konsep (canonicalSlug) sudah terdaftar di database. Silakan pastikan tidak ada kode konsep yang duplikat.";
      errorContext = {
        entityType: "Konsep",
        propertyName: "canonicalSlug",
      };
    } else if (errMsg.includes("UNIQUE constraint failed: chapters.course_id, chapters.title") || errMsg.includes("UNIQUE constraint failed: chapters.title")) {
      friendly = "Gagal menyimpan karena judul bab ini sudah terdaftar dalam mata kuliah tersebut. Silakan ubah judul bab agar tidak ada yang sama.";
      errorContext = {
        entityType: "Bab",
        propertyName: "title",
      };
    } else if (errMsg.includes("UNIQUE constraint failed: knowledge_objects.id")) {
      friendly = "Gagal menyimpan karena ada materi (Knowledge Object) yang memiliki ID duplikat. Pastikan setiap materi memiliki ID unik.";
      errorContext = {
        entityType: "Knowledge Object (Materi)",
        propertyName: "id",
      };
    } else if (errMsg.includes("UNIQUE constraint failed: website_materials.slug")) {
      friendly = "Gagal menyimpan karena materi website memiliki slug URL yang sudah terdaftar. Periksa judul atau slug materi website Anda.";
      errorContext = {
        entityType: "Materi Website",
        propertyName: "slug",
      };
    } else if (errMsg.includes("UNIQUE constraint failed")) {
      friendly = `Gagal menyimpan karena adanya duplikasi data unik di sistem (Unique Constraint): ${errMsg}. Pastikan data seperti kode bab, email user, atau ID materi bersifat unik.`;
    } else if (errMsg.includes("foreign key constraint failed")) {
      friendly = "Gagal menyimpan karena ada relasi data yang tidak valid (Foreign Key Constraint). Ini biasanya terjadi jika Anda mereferensikan ID materi, konsep, atau bab yang tidak ada dalam database.";
      errorContext = {
        entityType: "Relasi Pengetahuan",
      };
    }

    return {
      success: false,
      error: errMsg,
      friendlyExplanation: friendly,
      errorContext,
      logs,
    };
  }
}

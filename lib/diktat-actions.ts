import { db } from "@/db";
import { diktats, masterTeachingDocuments, knowledgeObjects } from "@/db/schema";
import { generateDiktatStructure } from "./diktat-generator";
import { validateDiktat } from "./diktat-validator";
import { renderDiktatToHTML } from "./diktat-renderer";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { storage } from "@/lib/storage";

/**
 * Extracts the unique file key from an UploadThing CDN URL.
 */
export function extractFileKeyFromUrl(url: string): string | null {
  if (!url) return null;
  const parts = url.split("/f/");
  return parts.length > 1 ? parts[1] : url;
}

/**
 * Action: Initiates a new Diktat compilation draft from selected chapters.
 */
export async function generateDiktatDraft(
  courseId: string,
  chapterIds: string[]
): Promise<{ success: boolean; diktatId?: string; errors?: string[] }> {
  try {
    // 1. Compile structured Diktat content JSON
    const compiledStructure = await generateDiktatStructure(courseId, chapterIds);

    // 2. Fetch primary MTD from Knowledge Objects in the selected chapters
    const activeKOs = await db
      .select()
      .from(knowledgeObjects)
      .where(and(eq(knowledgeObjects.chapterId, chapterIds[0]), eq(knowledgeObjects.status, "active")));

    if (activeKOs.length === 0) {
      return { success: false, errors: ["No active KOs found to link MTD information."] };
    }

    const mtdId = activeKOs[0].mtdId;
    const [mtdRecord] = await db
      .select()
      .from(masterTeachingDocuments)
      .where(eq(masterTeachingDocuments.id, mtdId));

    const sourceMtdVersion = mtdRecord ? mtdRecord.version : 1;

    // 3. Save Diktat draft to DB
    const diktatId = `dk-${randomUUID()}`;
    await db.insert(diktats).values({
      id: diktatId,
      courseId,
      sourceMtdId: mtdId,
      sourceMtdVersion,
      isStale: false,
      generationHash: compiledStructure.generationHash,
      title: compiledStructure.title,
      chapterIds,
      status: "draft",
      settings: {
        compiledStructure,
        tutorOverrides: {},
      },
    });

    return { success: true, diktatId };
  } catch (err: any) {
    return { success: false, errors: [err.message] };
  }
}

/**
 * Action: Saves a tutor text adjustment/override for a specific Diktat card block.
 * Overwrites are preserved during regenerations.
 */
export async function saveTutorDiktatOverride(
  diktatId: string,
  sectionKey: string, // e.g. "formula_ko-123"
  overrideData: any // e.g. { latex: "...", assumptions: ["..."] }
): Promise<{ success: boolean; errors?: string[] }> {
  const [diktat] = await db
    .select()
    .from(diktats)
    .where(eq(diktats.id, diktatId));

  if (!diktat) {
    return { success: false, errors: [`Diktat not found: ${diktatId}`] };
  }

  const currentSettings = (diktat.settings as any) || {};
  const currentOverrides = currentSettings.tutorOverrides || {};

  currentOverrides[sectionKey] = {
    ...currentOverrides[sectionKey],
    ...overrideData,
  };

  const updatedSettings = {
    ...currentSettings,
    tutorOverrides: currentOverrides,
  };

  await db
    .update(diktats)
    .set({
      settings: updatedSettings,
      updatedAt: new Date(),
    })
    .where(eq(diktats.id, diktatId));

  console.log(`[Tutor Action] Saved override for section ${sectionKey} inside Diktat ${diktatId}`);
  return { success: true };
}

/**
 * Compiles HTML to PDF using Puppeteer and uploads it to UploadThing.
 * Handles old file deletion (long-term storage strategy) and mock fallback execution.
 */
export async function executeDiktatPDFGeneration(
  diktatId: string
): Promise<{ success: boolean; fileUrl?: string; errors?: string[] }> {
  const [diktat] = await db
    .select()
    .from(diktats)
    .where(eq(diktats.id, diktatId));

  if (!diktat) {
    return { success: false, errors: [`Diktat not found: ${diktatId}`] };
  }

  const settings = (diktat.settings as any) || {};
  const structure = settings.compiledStructure;
  const overrides = settings.tutorOverrides || {};

  if (!structure) {
    return { success: false, errors: ["Missing compiled JSON structure inside Diktat settings."] };
  }

  // 1. Run Quality Gates validation
  const validation = await validateDiktat(structure);
  if (!validation.success) {
    return {
      success: false,
      errors: ["Quality validation checks failed:", ...validation.errors],
    };
  }

  // 2. Render structured layout to HTML
  const compiledHTML = renderDiktatToHTML(structure, overrides);

  let pdfBuffer: Buffer;
  const isMock = process.env.MOCK_GEMINI === "true";

  if (isMock) {
    // Generate simulated PDF text buffer for headless environments
    pdfBuffer = Buffer.from(
      `%PDF-1.4\n%MOCK_PDF_FILE\nTitle: ${structure.title}\nHash: ${diktat.generationHash}\n`
    );
  } else {
    // Attempt live Puppeteer compile
    let puppeteer: any;
    try {
      const puppeteerModule = await import("puppeteer");
      puppeteer = puppeteerModule.default || puppeteerModule;
    } catch (err: any) {
      return {
        success: false,
        errors: [
          `Puppeteer package not installed or failed to load. Run NPM install or toggle MOCK_GEMINI=true to run mock compilers. Detail: ${err.message}`,
        ],
      };
    }

    let browser: any = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(compiledHTML, { waitUntil: "networkidle0" });
      pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        scale: 1.0,
        margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
      });
    } catch (err: any) {
      return { success: false, errors: [`Puppeteer PDF compiler crash: ${err.message}`] };
    } finally {
      if (browser) await browser.close();
    }
  }

  // 3. Long-Term PDF Storage Strategy: Upload new and clean up old CDN files
  try {
    const oldUrl = diktat.fileUrl;

    // Upload using unified storage provider
    const filename = `${diktat.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.pdf`;
    const uploadedData = await storage.upload(pdfBuffer, filename, "application/pdf");
    const fileUrl = uploadedData.url; // Storing only key/reference URL

    // Trigger cleanup of the old file
    if (oldUrl) {
      const oldKey = extractFileKeyFromUrl(oldUrl);
      if (oldKey) {
        try {
          await storage.delete(oldKey);
          console.log(`[Storage Cleanup] Deleted obsolete Diktat file with key ${oldKey}.`);
        } catch (delErr: any) {
          console.warn(`[Storage Warning] Failed to delete obsolete file ${oldKey}: ${delErr.message}`);
        }
      }
    }

    // Save final location to DB
    await db
      .update(diktats)
      .set({
        fileUrl,
        status: "ready",
        updatedAt: new Date(),
      })
      .where(eq(diktats.id, diktatId));

    return { success: true, fileUrl };
  } catch (err: any) {
    return { success: false, errors: [`Storage pipeline failure: ${err.message}`] };
  }
}

/**
 * Action: Promotes the Diktat status to published and runs PDF compilers.
 */
export async function publishDiktat(
  diktatId: string
): Promise<{ success: boolean; fileUrl?: string; errors?: string[] }> {
  // Update state to 'generating'
  await db
    .update(diktats)
    .set({
      status: "generating",
    })
    .where(eq(diktats.id, diktatId));

  console.log(`[Tutor Action] Publishing Diktat ${diktatId} (PDF compilation initiated).`);

  // Execute compiler (in production this could be delegated to Inngest)
  const result = await executeDiktatPDFGeneration(diktatId);
  if (!result.success) {
    await db
      .update(diktats)
      .set({
        status: "failed",
      })
      .where(eq(diktats.id, diktatId));
  } else {
    await db
      .update(diktats)
      .set({
        status: "ready",
      })
      .where(eq(diktats.id, diktatId));
  }

  return result;
}

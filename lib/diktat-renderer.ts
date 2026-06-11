import { DiktatStructure, FormulaHandbookEntry, FormulaParameter } from "./diktat-generator";
import katex from "katex";

/**
 * Pre-renders all LaTeX math blocks inside a markdown string into static KaTeX HTML nodes.
 * Guarantees print compatibility and zero rendering delay in Puppeteer viewports.
 * Compiles basic markdown styling (bold, italic, list items, etc.) on non-math text.
 */
export function preRenderMathInText(text: string): string {
  if (!text) return "";

  const mathBlocks: { type: string; eq: string; placeholder: string }[] = [];

  // 1. Temporarily extract block equations ($$ ... $$) and replace with safe placeholder
  let processedText = text.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_, eq) => {
    const placeholder = `%%BLOCKMATH${mathBlocks.length}%%`;
    mathBlocks.push({ type: "block", eq: eq.trim(), placeholder });
    return placeholder;
  });

  // 2. Temporarily extract inline equations ($ ... $) and replace with safe placeholder
  // We ignore numeric strings like "$100"
  processedText = processedText.replace(/\$([^\$]+?)\$/g, (orig, eq) => {
    const trimmed = eq.trim();
    if (!trimmed || trimmed.match(/^\d+(\.\d+)?$/) || (trimmed.length === 1 && trimmed.match(/[0-9]/))) {
      return orig;
    }
    const placeholder = `%%INLINEMATH${mathBlocks.length}%%`;
    mathBlocks.push({ type: "inline", eq: trimmed, placeholder });
    return placeholder;
  });

  // 3. Process markdown formatting on the non-math text line by line
  const lines = processedText.split(/\r?\n/);
  const processedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Horizontal Rule
    if (trimmed === "---") {
      processedLines.push('<hr class="my-4" style="border: 0; border-top: 1px dashed #dddddd;" />');
      continue;
    }

    // Headers
    const h3Match = trimmed.match(/^###\s+(.*)/);
    if (h3Match) {
      processedLines.push(`<h4 class="font-bold text-gray-800" style="font-size: 10pt; margin-top: 10pt; margin-bottom: 4pt;">${convertInlineMarkdown(h3Match[1])}</h4>`);
      continue;
    }
    const h2Match = trimmed.match(/^##\s+(.*)/);
    if (h2Match) {
      processedLines.push(`<h3 class="font-bold text-gray-900" style="font-size: 11pt; margin-top: 14pt; margin-bottom: 6pt; color: #002B49;">${convertInlineMarkdown(h2Match[1])}</h3>`);
      continue;
    }

    // Unordered List Items (- or *)
    const ulMatch = trimmed.match(/^[-*]\s+(.*)/);
    if (ulMatch) {
      const content = convertInlineMarkdown(ulMatch[1]);
      processedLines.push(`<li class="text-gray-700" style="margin-left: 20px; list-style-type: disc; margin-bottom: 3pt;">${content}</li>`);
      continue;
    }

    // Ordered List Items (1. )
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (olMatch) {
      const content = convertInlineMarkdown(olMatch[2]);
      processedLines.push(`<li class="text-gray-700" style="margin-left: 20px; list-style-type: decimal; margin-bottom: 3pt;">${content}</li>`);
      continue;
    }

    // Regular line
    processedLines.push(convertInlineMarkdown(line));
  }

  function convertInlineMarkdown(str: string): string {
    return str
      // Bold **text** or __text__
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-black">$1</strong>')
      .replace(/__(.*?)__/g, '<strong class="font-bold text-black">$1</strong>')
      // Italic *text* or _text_
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/_(.*?)_/g, '<em class="italic">$1</em>')
      // Inline code `code`
      .replace(/`(.*?)`/g, '<code class="font-mono" style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 4px; font-size: 8.5pt; color: #dc2626;">$1</code>');
  }

  let output = processedLines.join("<br />");

  // Clean up adjacent `<br />` before/after list items and rules
  output = output
    .replace(/(<br\s*\/?>\s*)*(<li[^>]*>.*?<\/li>)(<br\s*\/?>\s*)*/g, "$2")
    .replace(/<\/li>\s*<br\s*\/?>\s*<li/g, "</li><li")
    .replace(/<hr[^>]*>\s*<br\s*\/?>/g, '<hr class="my-4" style="border: 0; border-top: 1px dashed #dddddd;" />')
    .replace(/<br\s*\/?>\s*<hr/g, '<hr');

  // 4. Render math equations and replace placeholders back with KaTeX HTML
  for (const item of mathBlocks) {
    let rendered = "";
    if (item.type === "block") {
      try {
        rendered = katex.renderToString(item.eq, {
          displayMode: true,
          throwOnError: false,
        });
        rendered = `<div class="math-block" style="margin: 10pt 0; text-align: center; overflow-x: auto;">${rendered}</div>`;
      } catch {
        rendered = `<div class="math-error" style="color: #dc2626; font-family: monospace; font-size: 9pt; padding: 4px 0;">$$${item.eq}$$</div>`;
      }
    } else {
      try {
        rendered = katex.renderToString(item.eq, {
          displayMode: false,
          throwOnError: false,
        });
        rendered = `<span class="math-inline" style="display: inline-block; padding: 0 1px;">${rendered}</span>`;
      } catch {
        rendered = `<span class="math-error" style="color: #dc2626; font-family: monospace; font-size: 9pt;">$${item.eq}$</span>`;
      }
    }
    output = output.replace(item.placeholder, rendered);
  }

  return output;
}

/**
 * Converts a structured JSON Diktat payload into a print-ready HTML page.
 * Implements strict A4 textbook styling, box-free compact layout, and natural breaks.
 */
export function renderDiktatToHTML(
  diktat: DiktatStructure,
  tutorOverrides?: any
): string {
  const overrides = tutorOverrides || {};

  // Cover Page
  const coverHtml = `
    <div class="cover-page">
      <div class="cover-header">
        <p class="cover-subtitle">ZYX Academy Student Handbook</p>
        <h1 class="cover-title">${diktat.title}</h1>
        <p style="font-size: 11pt; color: #555555; margin-top: 10px;">Diktat ringkas berorientasi pemahaman konsep dan persiapan ujian.</p>
      </div>
      <div class="cover-footer">
        <p><strong>DOCUMENT CLASS:</strong> STUDENT DIKTAT KULIAH</p>
        <p><strong>GENERATION HASH:</strong> <span style="font-family: monospace; font-size: 8.5pt;">${diktat.generationHash}</span></p>
        <p><strong>DATE COMPILED:</strong> ${new Date().toLocaleDateString()}</p>
      </div>
    </div>
  `;

  // Section 1 — Learning Roadmap (Max 1 page)
  const roadmapHtml = `
    <div class="roadmap-page">
      <h1 style="font-size: 20pt; margin-top: 5mm; margin-bottom: 20px; font-family: 'Lexend', sans-serif;">Apa yang Akan Dipelajari</h1>
      <p style="color: #333333; font-size: 10.5pt; margin-bottom: 15px; text-align: justify;">
        Diktat ini dirancang khusus untuk membantu mahasiswa memahami konsep secara cepat dan mempersiapkan ujian dengan optimal. Berikut bab-bab materi yang akan kita bahas:
      </p>
      
      <ol style="margin-left: 20px; font-size: 10.5pt; line-height: 1.6; margin-bottom: 25px;">
        ${diktat.chapters.map(c => `<li style="font-weight: 600; margin-bottom: 4px; color: #000000;">${c.title}</li>`).join("")}
      </ol>

      <h2 style="font-size: 13pt; border-bottom: 1.5px solid #000000; padding-bottom: 3px; margin-top: 25px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Capaian Belajar Utama</h2>
      <p style="color: #333333; font-size: 10.5pt; margin-bottom: 12px;">Setelah menuntaskan diktat ini, Anda diharapkan mampu menguasai:</p>
      <ul style="padding-left: 20px; font-size: 10.5pt; line-height: 1.6;">
        ${diktat.sections.learningObjectives.slice(0, 5).map(obj => `<li style="margin-bottom: 6px; text-align: justify; color: #333333;">${preRenderMathInText(obj)}</li>`).join("")}
      </ul>
    </div>
  `;

  // Section 2 — Concept Chapters (Continuous Flow)
  const chaptersHtml = diktat.chapters.map((ch, chIdx) => {
    const conceptsHtml = ch.concepts.map(concept => {
      // 1. Render definitions & summaries
      const definitionsHtml = concept.definitions.map(d => {
        // If marked as high importance, wrap in an Exam Focus Box
        if (d.importance === "high") {
          return `
            <div class="exam-focus-box" style="background-color: #fffbeb; border-left: 4px solid #d97706; padding: 10px; margin-bottom: 10pt; border-radius: 0 4px 4px 0; page-break-inside: avoid; break-inside: avoid;">
              <div style="font-weight: 700; color: #b45309; font-size: 8pt; text-transform: uppercase; margin-bottom: 3px; display: flex; align-items: center;">
                <span style="margin-right: 5px;">⚠️</span> Konsep Kunci / Sering Keluar Ujian
              </div>
              <div style="font-size: 10pt; color: #78350f; line-height: 1.4;">${preRenderMathInText(d.content)}</div>
            </div>
          `;
        }
        return `<p class="text-gray-700" style="text-align: justify;">${preRenderMathInText(d.content)}</p>`;
      }).join("");

      // 2. Render concept overviews
      const overviewsHtml = concept.overviews.map(o => {
        return `<p class="text-gray-700" style="text-align: justify;">${preRenderMathInText(o.content)}</p>`;
      }).join("");

      // 3. Render formulas
      const formulasHtml = concept.formulas.map(f => {
        let renderedKatex = "";
        try {
          renderedKatex = katex.renderToString(f.latex.trim(), {
            displayMode: true,
            throwOnError: false,
          });
        } catch {
          renderedKatex = `<span style="color: #dc2626; font-family: monospace;">$$${f.latex}$$</span>`;
        }

        const paramList = f.parameters.length > 0
          ? `
          <div style="margin-left: 10px; margin-bottom: 8pt; margin-top: 4pt;">
            <ul class="parameter-list">
              ${f.parameters.map(p => `
                <li class="parameter-item">
                  <span class="parameter-symbol">${p.symbol}</span>: ${p.name}${p.unit ? ` (${p.unit})` : ""}${p.description && p.description !== p.name ? ` &mdash; ${p.description}` : ""}
                </li>
              `).join("")}
            </ul>
          </div>
          `
          : "";

        const formulaBox = f.importance === "high"
          ? `
          <div class="exam-focus-box" style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 10px; margin-bottom: 10pt; border-radius: 0 4px 4px 0; margin-top: 8pt; page-break-inside: avoid; break-inside: avoid;">
            <div style="font-weight: 700; color: #1d4ed8; font-size: 8pt; text-transform: uppercase; margin-bottom: 3px; display: flex; align-items: center;">
              <span style="margin-right: 5px;">⚠️</span> Hafalkan Rumus Penting Ini
            </div>
            <div class="formula-display" style="margin: 5pt 0;">${renderedKatex}</div>
            ${paramList}
          </div>
          `
          : `
          <div style="margin-top: 8pt; margin-bottom: 10pt; page-break-inside: avoid; break-inside: avoid;">
            <div class="formula-display">${renderedKatex}</div>
            ${paramList}
          </div>
          `;

        return `
          <div style="margin-top: 10pt; margin-bottom: 10pt; page-break-inside: avoid; break-inside: avoid;">
            <div class="meta-label">Definisi Matematis / Persamaan &mdash; ${f.title}</div>
            ${formulaBox}
          </div>
        `;
      }).join("");

      // 4. Render examples
      const examplesHtml = concept.examples.map(ex => {
        return `
          <div style="margin-top: 12pt; margin-bottom: 12pt; page-break-inside: avoid; break-inside: avoid;">
            <h4 style="margin-top: 0; margin-bottom: 4pt; color: #002B49; font-size: 10pt;">Contoh Soal & Pembahasan &mdash; ${ex.title}</h4>
            <div class="example-content" style="padding-left: 10px; border-left: 2px solid #002B49; color: #333333; font-size: 9.5pt; text-align: justify; line-height: 1.5;">
              ${preRenderMathInText(ex.content)}
            </div>
          </div>
        `;
      }).join("");

      // 5. Render misconceptions (inline warnings)
      const misconceptionsHtml = concept.misconceptions.map(m => {
        return `
          <div class="pitfall-block" style="margin-top: 14pt; margin-bottom: 14pt; border-left: 3px solid #dc2626; padding-left: 10pt; page-break-inside: avoid; break-inside: avoid;">
            <div class="pitfall-title" style="color: #991b1b; font-weight: 700; margin-bottom: 5px; font-size: 10pt;">⚠️ Mahasiswa Sering Salah &mdash; ${m.title}</div>
            <div style="display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 6pt;">
              <div style="background-color: #fef2f2; border: 1px solid #fee2e2; padding: 8px; border-radius: 4px; font-size: 9pt;">
                <strong style="color: #991b1b; text-transform: uppercase; font-size: 7.5pt;">❌ Salah (Myth):</strong>
                <div style="margin-top: 2px; line-height: 1.4;">${preRenderMathInText(m.myth)}</div>
              </div>
              <div style="background-color: #f0fdf4; border: 1px solid #dcfce7; padding: 8px; border-radius: 4px; font-size: 9pt;">
                <strong style="color: #166534; text-transform: uppercase; font-size: 7.5pt;">✅ Benar (Koreksi):</strong>
                <div style="margin-top: 2px; line-height: 1.4;">${preRenderMathInText(m.correction)}</div>
              </div>
            </div>
            <div style="font-size: 9pt; color: #555555; margin-top: 6pt; line-height: 1.4;">
              <strong>Rasional Pembahasan:</strong> ${preRenderMathInText(m.rationale)}
            </div>
          </div>
        `;
      }).join("");

      return `
        <div class="entry-block" style="margin-bottom: 25pt;">
          <h3 style="font-size: 12pt; border-bottom: 1px solid #dddddd; padding-bottom: 2px; margin-top: 15pt; margin-bottom: 8pt; color: #000000; font-family: 'Lexend', sans-serif;">${concept.conceptName}</h3>
          ${definitionsHtml}
          ${overviewsHtml}
          ${formulasHtml}
          ${examplesHtml}
          ${misconceptionsHtml}
        </div>
      `;
    }).join("");

    return `
      <div class="chapter-block" style="page-break-before: always; break-before: page;">
        <div style="font-size: 9pt; color: #FF6B35; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">BAB 0${chIdx + 1}</div>
        <h1 style="font-size: 20pt; border-bottom: 2px solid #000000; padding-bottom: 4px; margin-top: 2px; margin-bottom: 15pt; text-transform: uppercase; font-family: 'Lexend', sans-serif;">${ch.title}</h1>
        ${conceptsHtml}
      </div>
    `;
  }).join("");

  // Appendix A — Formula Handbook Summary (H-1 quick review)
  const hasFormulas = diktat.sections.formulaHandbook && diktat.sections.formulaHandbook.length > 0;
  const appendixFormulasHtml = hasFormulas
    ? `
    <div class="section-block" style="page-break-before: always; break-before: page;">
      <h2>Appendix A &mdash; Ringkasan Rumus Penting</h2>
      <p class="text-gray-700" style="margin-bottom: 15px; font-size: 10pt;">Gunakan ringkasan komparatif di bawah ini untuk review cepat rumus-rumus utama H-1 sebelum menempuh ujian:</p>
      <div style="margin-top: 15pt;">
        ${diktat.sections.formulaHandbook
          .map((f: FormulaHandbookEntry, idx: number) => {
            let renderedKatex = "";
            try {
              renderedKatex = katex.renderToString(f.latex.trim(), {
                displayMode: true,
                throwOnError: false,
              });
            } catch {
              renderedKatex = `<span style="color: #dc2626;">$$${f.latex}$$</span>`;
            }

            const paramSummary = f.parameters.length > 0
              ? `
              <div style="font-size: 8.5pt; color: #555555; margin-top: 4px;">
                <strong>Variabel:</strong> 
                ${f.parameters.map(p => `<span class="parameter-symbol" style="font-weight: 600;">${p.symbol}</span> (${p.name}${p.unit ? `, ${p.unit}` : ""})`).join(" &middot; ")}
              </div>
              `
              : "";

            return `
            <div style="margin-bottom: 12pt; page-break-inside: avoid; break-inside: avoid; border-bottom: 1px solid #eeeeee; padding-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 10pt;">
                <span>${f.title}</span>
                <span style="color: #666666; font-size: 8.5pt;">#${idx + 1}</span>
              </div>
              <div class="formula-display" style="margin: 4pt 0;">${renderedKatex}</div>
              ${paramSummary}
            </div>
          `;
          })
          .join("")}
      </div>
    </div>
  `
    : "";

  // Appendix B — Pitfalls Compendium
  const hasMistakes = diktat.sections.commonMistakes && diktat.sections.commonMistakes.length > 0;
  const appendixMistakesHtml = hasMistakes
    ? `
    <div class="section-block" style="page-break-before: always; break-before: page;">
      <h2>Appendix B &mdash; Lembar Jebakan Ujian (Pitfalls)</h2>
      <p class="text-gray-700" style="margin-bottom: 15px; font-size: 10pt;">Berikut kompendium kesalahpahaman umum yang sering sengaja dikeluarkan sebagai jebakan dalam soal ujian:</p>
      <div style="margin-top: 15pt;">
        ${diktat.sections.commonMistakes
          .map(m => `
          <div class="pitfall-block" style="margin-bottom: 12pt; page-break-inside: avoid; break-inside: avoid;">
            <div class="pitfall-title" style="color: #991b1b; font-weight: 700; font-size: 10.5pt;">${m.title}</div>
            <div style="margin-top: 3pt; font-size: 9pt; line-height: 1.4;">
              ❌ <strong>Salah:</strong> <span style="color: #991b1b;">${preRenderMathInText(m.myth)}</span><br />
              ✅ <strong>Benar:</strong> <span style="color: #166534;">${preRenderMathInText(m.correction)}</span>
            </div>
            <div style="font-size: 8.5pt; color: #555555; margin-top: 3px;">
              <strong>Tips Menghindari:</strong> ${preRenderMathInText(m.rationale)}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `
    : "";

  // Appendix C — Reference Glossary (Filtered to remove duplicate concept definitions)
  const conceptNames = new Set(
    diktat.chapters.flatMap(ch => ch.concepts.map(c => c.conceptName.toLowerCase().trim()))
  );
  const filteredGlossary = diktat.sections.glossary.filter(
    g => !conceptNames.has(g.term.toLowerCase().trim())
  );
  const hasGlossary = filteredGlossary.length > 0;

  const glossaryHtml = hasGlossary
    ? `
    <div class="section-block" style="page-break-before: always; break-before: page;">
      <h2>Appendix C &mdash; Glosarium Istilah Tambahan</h2>
      <p class="text-gray-700" style="margin-bottom: 15px; font-size: 10pt;">Daftar istilah pembantu yang belum didefinisikan secara eksplisit di dalam bab utama:</p>
      <table class="glossary-table">
        <thead>
          <tr>
            <th style="width: 25%;">Istilah / Simbol</th>
            <th>Definisi Ringkas</th>
          </tr>
        </thead>
        <tbody>
          ${filteredGlossary
            .map(
              entry => `
            <tr>
              <td><strong>${entry.term}</strong></td>
              <td>${preRenderMathInText(entry.definition)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      
      <div class="provenance-box">
        <strong>Provenance & Ingestion Compliance Log</strong><br />
        diktatHash: ${diktat.generationHash}<br />
        generatedAt: ${new Date().toISOString()}<br />
        complianceStatus: verified<br />
        renderedBy: ZYX PDF Compiler v1 (Textbook Layout Engine)
      </div>
    </div>
  `
    : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="zyx-provenance" content="hash=${diktat.generationHash}&date=${new Date().toISOString()}" />
        <title>${diktat.title}</title>
        <!-- KaTeX CSS CDN -->
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/katex.min.css" />
        <!-- Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lexend:wght@600;700&display=swap" rel="stylesheet" />
        <style>
          /* CSS Reset & General */
          @page {
            size: A4;
            margin: 20mm 15mm 20mm 15mm;
          }
          
          body {
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #111111;
            background: #ffffff;
            line-height: 1.5;
            font-size: 10.5pt;
          }
          
          /* Typography */
          h1, h2, h3, h4 {
            font-family: "Lexend", "Inter", sans-serif;
            color: #000000;
            font-weight: 700;
            margin-top: 0;
            page-break-after: avoid;
            break-after: avoid;
          }
          
          h1 {
            font-size: 24pt;
            line-height: 1.1;
            margin-bottom: 5px;
          }
          
          h2 {
            font-size: 14pt;
            border-bottom: 1.5px solid #000000;
            padding-bottom: 3px;
            margin-top: 25pt;
            margin-bottom: 12pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          h3 {
            font-size: 11pt;
            margin-top: 16pt;
            margin-bottom: 6pt;
          }
          
          h4 {
            font-size: 10pt;
            font-weight: 600;
            margin-top: 10pt;
            margin-bottom: 4pt;
          }
          
          p {
            margin-top: 0;
            margin-bottom: 8pt;
            text-align: justify;
          }
          
          /* Lists */
          ul, ol {
            margin-top: 0;
            margin-bottom: 8pt;
            padding-left: 20px;
          }
          
          li {
            margin-bottom: 3pt;
          }
          
          /* Flow Layout & Page Breaks */
          .section-block {
            margin-bottom: 20pt;
          }
          
          .entry-block {
            margin-bottom: 15pt;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Cover Page */
          .cover-page {
            height: 255mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
            break-after: page;
          }
          
          /* Roadmap Page */
          .roadmap-page {
            height: 255mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
            break-after: page;
          }
          
          .cover-header {
            margin-top: 50mm;
            border-bottom: 3px solid #000000;
            padding-bottom: 15px;
          }
          
          .cover-title {
            font-size: 28pt;
            font-weight: 800;
            line-height: 1.1;
            margin-bottom: 10px;
          }
          
          .cover-subtitle {
            font-size: 13pt;
            color: #FF6B35; /* Orange accent */
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
          }
          
          .cover-footer {
            margin-bottom: 20mm;
            font-size: 9pt;
            color: #555555;
            line-height: 1.6;
          }
          
          /* Formulas */
          .formula-title {
            font-size: 10.5pt;
            font-weight: 700;
            margin-bottom: 4pt;
            display: flex;
            justify-content: space-between;
          }
          
          .formula-display {
            margin: 10pt 0;
            text-align: center;
            position: relative;
            padding: 8pt 0;
          }
          
          .parameter-list {
            list-style-type: none;
            padding-left: 15px;
            margin-bottom: 8pt;
          }
          
          .parameter-item {
            margin-bottom: 2pt;
            text-indent: -15px;
            padding-left: 15px;
            font-size: 9.5pt;
            color: #333333;
          }
          
          .parameter-symbol {
            font-weight: 700;
            font-family: "Inter", sans-serif;
            color: #FF6B35; /* Orange */
          }
          
          .meta-label {
            font-size: 8.5pt;
            font-weight: 700;
            text-transform: uppercase;
            color: #666666;
            letter-spacing: 0.3px;
            margin-top: 6pt;
            margin-bottom: 2pt;
          }
          
          /* Common Pitfalls */
          .pitfall-block {
            border-left: 3px solid #dc2626; /* Red border */
            padding-left: 10pt;
            margin-bottom: 12pt;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .pitfall-title {
            font-weight: 700;
            color: #991b1b;
            margin-bottom: 3pt;
          }
          
          /* Reference Glossary */
          .glossary-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10pt;
          }
          
          .glossary-table th, .glossary-table td {
            border: 1px solid #dddddd;
            padding: 6pt 8pt;
            text-align: left;
            font-size: 9.5pt;
          }
          
          .glossary-table th {
            background-color: #f5f5f5;
            font-weight: 700;
          }
          
          /* Provenance */
          .provenance-box {
            margin-top: 30pt;
            padding: 8pt;
            background-color: #f9f9f9;
            border: 1px solid #e3e3e3;
            font-family: monospace;
            font-size: 8pt;
            color: #666666;
            line-height: 1.4;
          }
          
          /* General Classes */
          .italic { font-style: italic; }
          .font-semibold { font-weight: 600; }
          .font-bold { font-weight: 700; }
          .text-black { color: #000000; }
          .text-gray-500 { color: #666666; }
          .text-gray-700 { color: #333333; }
          
          /* Math display adjustments */
          .math-block {
            margin: 8pt 0;
          }
          
          .math-inline {
            padding: 0 1px;
          }
        </style>
      </head>
      <body>
        <div style="max-w: 650pt; margin: 0 auto; padding: 0 10pt;">
          ${coverHtml}
          ${roadmapHtml}
          ${chaptersHtml}
          ${appendixFormulasHtml}
          ${appendixMistakesHtml}
          ${glossaryHtml}
        </div>
      </body>
    </html>
  `;
}

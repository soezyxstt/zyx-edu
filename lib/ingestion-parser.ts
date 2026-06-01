/**
 * Splits raw material text into sections and overlapping chunks for Pinecone indexing.
 * Sections are delineated by Markdown headings (##, ###) or double newlines.
 * Chunks are 1000–2000 characters with a 15% sliding window overlap.
 */

export interface ParsedChunk {
  chunkText: string;
  orderIndex: number;
}

export interface ParsedSection {
  title: string | null;
  orderIndex: number;
  chunks: ParsedChunk[];
}

const CHUNK_TARGET = 1500;
const CHUNK_MAX = 2000;
const CHUNK_MIN = 800;
const OVERLAP_RATIO = 0.15;

function splitIntoChunks(text: string): ParsedChunk[] {
  const overlapSize = Math.floor(CHUNK_TARGET * OVERLAP_RATIO);
  const chunks: ParsedChunk[] = [];
  let cursor = 0;
  let orderIndex = 0;

  while (cursor < text.length) {
    let end = cursor + CHUNK_TARGET;

    if (end >= text.length) {
      // Last chunk — take the rest (may be short, merge with previous if tiny)
      const remainder = text.slice(cursor).trim();
      if (remainder.length < CHUNK_MIN && chunks.length > 0) {
        // Append to previous chunk instead of creating a sliver
        chunks[chunks.length - 1] = {
          ...chunks[chunks.length - 1],
          chunkText: chunks[chunks.length - 1].chunkText + " " + remainder,
        };
      } else if (remainder.length > 0) {
        chunks.push({ chunkText: remainder, orderIndex: orderIndex++ });
      }
      break;
    }

    // Prefer to break at sentence boundary near target
    let breakPoint = -1;
    for (let i = end; i > end - 200 && i > cursor; i--) {
      if (text[i] === "." || text[i] === "?" || text[i] === "!" || text[i] === "\n") {
        breakPoint = i + 1;
        break;
      }
    }

    if (breakPoint === -1 || breakPoint > cursor + CHUNK_MAX) {
      // No sentence boundary found — hard cut at CHUNK_TARGET
      breakPoint = Math.min(cursor + CHUNK_TARGET, text.length);
    }

    const chunk = text.slice(cursor, breakPoint).trim();
    if (chunk.length > 0) {
      chunks.push({ chunkText: chunk, orderIndex: orderIndex++ });
    }

    // Advance cursor with overlap
    cursor = breakPoint - overlapSize;
    if (cursor <= 0) cursor = breakPoint; // Safety guard against infinite loop
  }

  return chunks;
}

/**
 * Splits a Markdown-formatted material string into sections.
 * Headings (## or ###) become section titles; double-newline paragraphs
 * become unnamed sections when no headings are present.
 */
export function parseMaterialIntoSections(rawText: string): ParsedSection[] {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();

  // Try heading-based splitting first
  const headingPattern = /^(#{2,3})\s+(.+)$/m;
  const hasHeadings = headingPattern.test(normalized);

  if (hasHeadings) {
    const lines = normalized.split("\n");
    const sections: ParsedSection[] = [];
    let currentTitle: string | null = null;
    let currentLines: string[] = [];
    let sectionIndex = 0;

    for (const line of lines) {
      const match = line.match(/^#{2,3}\s+(.+)$/);
      if (match) {
        // Flush previous section
        if (currentLines.length > 0) {
          const text = currentLines.join("\n").trim();
          if (text.length > 0) {
            sections.push({
              title: currentTitle,
              orderIndex: sectionIndex++,
              chunks: splitIntoChunks(text),
            });
          }
        }
        currentTitle = match[1].trim();
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }

    // Flush last section
    if (currentLines.length > 0) {
      const text = currentLines.join("\n").trim();
      if (text.length > 0) {
        sections.push({
          title: currentTitle,
          orderIndex: sectionIndex++,
          chunks: splitIntoChunks(text),
        });
      }
    }

    return sections;
  }

  // No headings — treat entire text as a single unnamed section
  return [
    {
      title: null,
      orderIndex: 0,
      chunks: splitIntoChunks(normalized),
    },
  ];
}

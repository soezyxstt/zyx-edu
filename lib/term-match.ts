/**
 * EIF E3: pure, client-safe term matching helpers. No DB imports, so this module
 * is safe to import from client components (the material viewer). The DB-backed
 * builders live in lib/term-index.ts (server only).
 */

export interface TermIndexEntry {
  term: string; // normalized lowercase
  conceptId: string;
  conceptName: string; // canonical display (KO conceptName)
}

export function normalizeTerm(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Returns the concept whose term best matches the selected text (exact first,
 * then the longest term that appears as a substring), or null. The index must be
 * sorted longest-first.
 */
export function matchTerm(index: TermIndexEntry[], selectedText: string): TermIndexEntry | null {
  const norm = normalizeTerm(selectedText);
  if (norm.length < 2) return null;
  for (const entry of index) {
    if (norm === entry.term) return entry;
  }
  for (const entry of index) {
    if (entry.term.length >= 3 && norm.includes(entry.term)) return entry;
  }
  return null;
}

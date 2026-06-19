import { createHash } from "crypto";

/**
 * Conservatively normalizes question text to produce a consistent
 * canonical question hash, avoiding collision on similar but different problems.
 */
export function normalizeQuestion(markdown: string): string {
  let text = markdown.toLowerCase();

  // 1. Heading Normalization: Standardize headings to level 2 with lower casing
  text = text.replace(/^#+\s+/gm, "## ");

  // 2. Whitespace Collapsing: collapse newlines, tabs, and multiple spaces into a single space
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Generates a sha256 hash from normalized question markdown.
 */
export function generateCanonicalHash(markdown: string): string {
  const normalized = normalizeQuestion(markdown);
  return createHash("sha256").update(normalized).digest("hex");
}

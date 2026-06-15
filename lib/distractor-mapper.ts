/**
 * EIF E1: deterministic distractor -> misconception mapping.
 *
 * Pure functions, no AI. Runs at question generation time to tag each wrong
 * option with the misconception it embodies, so quiz remediation can name the
 * misconception without a per-attempt LLM call.
 */

export type DistractorKind =
  | "misconception"
  | "calc_error"
  | "unit_error"
  | "vocab_swap"
  | "none";

export interface DistractorEntry {
  optionIndex: number;
  kind: DistractorKind;
  misconceptionKoId: string | null;
  label: string;
}

export interface MisconceptionKO {
  id: string;
  title: string;
  content: string;
}

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "of", "to", "in", "on", "and", "or", "with",
  "for", "as", "by", "that", "this", "it", "be", "at", "from",
  "yang", "dan", "atau", "di", "ke", "dari", "untuk", "pada", "adalah", "ini",
  "itu", "dengan", "sebuah", "suatu",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/\$\$?[^$]*\$\$?/g, " ") // drop latex
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

const MATCH_THRESHOLD = 0.34;

function labelForStrategy(strategy: string | undefined): { kind: DistractorKind; label: string } {
  const s = (strategy ?? "").toLowerCase();
  if (/calc|algebra|fraction|arithmetic|multi-step|inverted/.test(s)) {
    return { kind: "calc_error", label: "Kesalahan perhitungan" };
  }
  if (/unit|scaling|dimension|si units/.test(s)) {
    return { kind: "unit_error", label: "Kesalahan satuan" };
  }
  if (/vocab|related concept|terminology|alternative/.test(s)) {
    return { kind: "vocab_swap", label: "Tertukar istilah" };
  }
  return { kind: "none", label: "Pilihan kurang tepat" };
}

/**
 * Builds the distractor map for one question. For each non-correct option, tries
 * to match its text to a misconception KO of the same concept by token overlap;
 * otherwise classifies by the blueprint distractor strategy.
 */
export function buildDistractorMap(input: {
  options: string[];
  correctIndices: number[];
  blueprint?: { distractorStrategy?: string };
  misconceptionKOs: MisconceptionKO[];
}): DistractorEntry[] {
  const { options, correctIndices, blueprint, misconceptionKOs } = input;
  const correct = new Set(correctIndices);
  const koTokens = misconceptionKOs.map((ko) => ({
    ko,
    tokens: tokenize(`${ko.title} ${ko.content}`),
  }));

  const entries: DistractorEntry[] = [];
  for (let i = 0; i < options.length; i++) {
    if (correct.has(i)) continue;
    const optTokens = tokenize(options[i]);

    let best: { ko: MisconceptionKO; score: number } | null = null;
    for (const cand of koTokens) {
      const score = jaccard(optTokens, cand.tokens);
      if (!best || score > best.score) best = { ko: cand.ko, score };
    }

    if (best && best.score >= MATCH_THRESHOLD) {
      entries.push({
        optionIndex: i,
        kind: "misconception",
        misconceptionKoId: best.ko.id,
        label: best.ko.title.slice(0, 120),
      });
    } else {
      const { kind, label } = labelForStrategy(blueprint?.distractorStrategy);
      entries.push({ optionIndex: i, kind, misconceptionKoId: null, label });
    }
  }
  return entries;
}

/**
 * Validates a distractor map against an option count and correct-index set.
 * Returns a list of error strings (empty = valid). Used by tests and the
 * question validator (E1.1).
 */
export function validateDistractorMap(
  map: unknown,
  optionCount: number,
  correctIndices: number[],
): string[] {
  const errors: string[] = [];
  if (!Array.isArray(map)) {
    errors.push("distractorMap must be an array");
    return errors;
  }
  const correct = new Set(correctIndices);
  const expectedCount = optionCount - correct.size;
  if (map.length !== expectedCount) {
    errors.push(`distractorMap length ${map.length} must equal wrong-option count ${expectedCount}`);
  }
  const seen = new Set<number>();
  const validKinds = new Set(["misconception", "calc_error", "unit_error", "vocab_swap", "none"]);
  for (const raw of map) {
    const e = raw as Partial<DistractorEntry>;
    if (typeof e.optionIndex !== "number" || e.optionIndex < 0 || e.optionIndex >= optionCount) {
      errors.push(`optionIndex ${String(e.optionIndex)} out of range`);
      continue;
    }
    if (correct.has(e.optionIndex)) {
      errors.push(`optionIndex ${e.optionIndex} is a correct option, must not be mapped`);
    }
    if (seen.has(e.optionIndex)) {
      errors.push(`duplicate optionIndex ${e.optionIndex}`);
    }
    seen.add(e.optionIndex);
    if (!e.kind || !validKinds.has(e.kind)) {
      errors.push(`invalid kind for option ${e.optionIndex}`);
    }
    if (e.kind === "misconception" && !e.misconceptionKoId) {
      errors.push(`misconception kind for option ${e.optionIndex} requires misconceptionKoId`);
    }
    if (typeof e.label !== "string" || e.label.length === 0) {
      errors.push(`label required for option ${e.optionIndex}`);
    }
  }
  return errors;
}

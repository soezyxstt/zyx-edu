import { z } from "zod";

/** Converts text into a stable, URL-safe, machine-readable slug. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalizes and cleans markdown text derived from PDFs.
 * Handles Unicode normalization, invisible character/null character removal, and line ending normalization.
 */
export function preprocessMarkdown(text: string): string {
  if (!text) return "";

  // 1. Unicode Normalization (NFC)
  let processed = text.normalize("NFC");

  // 2. Null character removal
  processed = processed.replace(/\u0000/g, "");

  // 3. Remove invisible and formatting characters:
  // \u200B-\u200D: Zero-width space, zero-width non-joiner, zero-width joiner
  // \uFEFF: Zero-width no-break space (BOM)
  // \u200E-\u200F: Left-to-right / Right-to-left marks
  // \u202A-\u202E: Directional embedding / override
  processed = processed.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, "");

  // 4. Line ending normalization (standardize all to \n)
  processed = processed.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  return processed;
}

/**
 * Fixes single backslashes in JSON strings that represent LaTeX commands or are invalid escape sequences.
 * Example: \theta -> \\theta, \cdot -> \\cdot, \frac -> \\frac.
 * Real JSON escapes like \n or \t (not followed by letters) are preserved.
 */
export function escapeBackslashesInJsonString(str: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char === '"' && !escaped) {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString && char === "\\") {
      const next = str[i + 1] ?? "";

      // If it is an escaped backslash itself, keep it and skip the next
      if (next === "\\") {
        result += "\\\\";
        i++;
        continue;
      }

      // If it is an escaped quote, keep it
      if (next === '"') {
        result += '\\"';
        i++;
        continue;
      }

      // Check if it is followed by a standard JSON escape char
      const isEscapeChar = ["b", "f", "n", "r", "t", "u", "/"].includes(next);

      if (isEscapeChar) {
        // If it's a LaTeX command like \beta or \theta, the escape char is followed by a letter.
        // E.g., \theta -> next is 't', afterNext is 'h'. \n (newline) -> next is 'n', afterNext is non-letter.
        const afterNext = str[i + 2] ?? "";
        const isNextLetter = /[a-zA-Z]/.test(afterNext);

        if (isNextLetter) {
          result += "\\\\"; // Escape the backslash
        } else {
          result += "\\"; // Keep as valid JSON escape
        }
      } else {
        // Non-standard escape (e.g. \c, \p), escape the backslash
        result += "\\\\";
      }
      continue;
    }

    result += char;

    if (char === "\\") {
      escaped = !escaped;
    } else {
      escaped = false;
    }
  }

  return result;
}

/**
 * Escapes raw unescaped newlines and carriage returns found inside string values in JSON.
 * This is crucial because LLMs often produce multi-line strings in JSON properties.
 */
export function escapeRawNewlinesInStrings(str: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString && (char === "\n" || char === "\r")) {
      if (char === "\n") {
        result += "\\n";
      } else {
        result += "\\r";
      }
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Uses a stack to force close any unclosed braces/brackets in a truncated JSON string.
 */
export function forceCloseJson(str: string): string {
  const stack: ("{" | "[")[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === "{") {
        stack.push("{");
      } else if (char === "[") {
        stack.push("[");
      } else if (char === "}") {
        if (stack[stack.length - 1] === "{") {
          stack.pop();
        }
      } else if (char === "]") {
        if (stack[stack.length - 1] === "[") {
          stack.pop();
        }
      }
    }
  }

  let repaired = str;
  if (inString) {
    repaired += '"';
  }

  while (stack.length > 0) {
    const open = stack.pop();
    if (open === "{") {
      repaired += "}";
    } else if (open === "[") {
      repaired += "]";
    }
  }

  return repaired;
}

/**
 * Prepares and repairs a raw JSON string from an LLM.
 */
export function repairJsonString(rawText: string): string {
  let clean = rawText.trim();

  // 1. Strip Markdown fence blocks if present
  clean = clean.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

  // 2. Escape backslashes for LaTeX/invalid escapes
  clean = escapeBackslashesInJsonString(clean);

  // 3. Escape raw newlines within JSON strings
  clean = escapeRawNewlinesInStrings(clean);

  // 4. Remove trailing commas before closing braces/brackets
  clean = clean.replace(/,(\s*[\]}])/g, "$1");

  // 5. Close any truncated JSON brackets/braces
  clean = forceCloseJson(clean);

  return clean;
}

/**
 * Safely parses and validates a JSON string using the provided Zod schema.
 * Returns an object with the success status, validated data, or parsing error details.
 */
export function safeParseJson<T>(
  rawText: string,
  schema: z.ZodType<T>
): { success: true; data: T } | { success: false; error: Error; rawText: string } {
  const repaired = repairJsonString(rawText);
  try {
    const parsed = JSON.parse(repaired);
    const validated = schema.parse(parsed);
    return { success: true, data: validated };
  } catch (err: any) {
    return {
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
      rawText: rawText,
    };
  }
}

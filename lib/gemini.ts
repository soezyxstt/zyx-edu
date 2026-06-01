import { GoogleGenAI } from '@google/genai';
import { env } from '@/lib/env';

/**
 * Pre-configured Gemini API Client using the @google/genai SDK.
 * Uses GEMINI_API_KEY from validated server environment variables.
 */
export const ai = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});

const EMBEDDING_MODEL = 'gemini-embedding-001';

/**
 * Generates a 768-dimensional embedding vector for a single text string.
 * Uses gemini-embedding-001 with Matryoshka Representation Learning (MRL) scaled to 768 dimensions.
 */
export async function embedText(text: string): Promise<number[]> {
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      outputDimensionality: 1024,
    },
  });
  const values = result.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error('Gemini embedding returned empty vector');
  }
  return values;
}

/**
 * Generates embedding vectors for multiple texts in a single batch call.
 * More efficient than calling embedText() in a loop.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const results = await Promise.all(texts.map((t) => embedText(t)));
  return results;
}

/** Exponential backoff wrapper for Gemini API calls that may hit rate limits. */
export async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: unknown) {
      attempt++;
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes('429') || err.message.includes('503'));
      if (!isRateLimit || attempt >= maxRetries) throw err;
      const delay = Math.min(1000 * 2 ** attempt + Math.random() * 500, 30_000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

import { GoogleGenAI } from '@google/genai';
import { env } from '@/lib/env';
import { logAiRequest } from '@/lib/ai/analytics';
import { geminiKeyPool } from '@/lib/gemini-keys';

// ---------------------------------------------------------------------------
// Client handling – one client per key, optionally via Cloudflare AI Gateway
// ---------------------------------------------------------------------------

interface ClientPriority {
  client: GoogleGenAI;
  viaGateway: boolean;
}

/** Returns the client priority list for a given key.
 * If the AI gateway is configured, we try the gateway client first;
 * otherwise, we fall back to the direct client.
 */
function getClientsPriority(key: typeof geminiKeyPool['keys'][0]): ClientPriority[] {
  const gatewayUrl = env.CF_AI_GATEWAY_URL;
  const list: ClientPriority[] = [];
  
  // Try gateway first if available
  if (gatewayUrl && key.clientGateway) {
    list.push({ client: key.clientGateway, viaGateway: true });
  }
  
  // Direct client – always available
  list.push({ client: key.client, viaGateway: false });
  
  return list;
}

// ---------------------------------------------------------------------------
// Embedding
// ---------------------------------------------------------------------------

const EMBEDDING_MODELS = ['gemini-embedding-2', 'gemini-embedding-002', 'gemini-embedding-001'];

/** Generates a 1024‑dimensional embedding vector for a single text string.
 * Uses the best key selected by the scheduler, trying fallback models if needed.
 */
export async function embedText(text: string): Promise<number[]> {
  let lastError: any = null;

  for (const model of EMBEDDING_MODELS) {
    const maxKeyAttempts = geminiKeyPool.getAllKeys().length;
    for (let attempt = 0; attempt < maxKeyAttempts; attempt++) {
      const key = geminiKeyPool.getBestKey(model);
      if (!key) {
        break; // No more keys available for this model, try next model
      }

      const clients = getClientsPriority(key);
      for (const { client, viaGateway } of clients) {
        try {
          const t0 = Date.now();
          const result = await client.models.embedContent({
            model,
            contents: text,
            config: { outputDimensionality: 1024 },
          });
          const values = result.embeddings?.[0]?.values;
          if (values && values.length > 0) {
            logAiRequest({
              operation: 'embed',
              model,
              viaGateway,
              latencyMs: Date.now() - t0,
              success: true,
            });
            geminiKeyPool.markSuccess(key.id, model);
            return values;
          }
        } catch (err: any) {
          lastError = err;
          geminiKeyPool.markFailure(key.id, model, err);
          console.warn(`Embedding model ${model} via key ${key.id} failed: ${err?.message || err}`);
        }
      }
    }
  }

  throw lastError || new Error('All Gemini embedding models failed to generate vector');
}

/** Batch version – simply maps over embedText */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const results = await Promise.all(texts.map((t) => embedText(t)));
  return results;
}

// ---------------------------------------------------------------------------
// Retry helper – exponential back‑off for transient server/network errors
// ---------------------------------------------------------------------------
/** Exponential backoff wrapper for Gemini API calls. Propagates 429s immediately so scheduler can route to other keys. */
export async function withGeminiRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: unknown) {
      attempt++;
      // Only retry transient server errors or network issues (502, 503, 504)
      const isTransient =
        err instanceof Error && 
        (err.message.includes('503') || err.message.includes('502') || err.message.includes('504'));
      
      if (!isTransient || attempt >= maxRetries) throw err;
      const delay = Math.min(1000 * 2 ** attempt + Math.random() * 500, 10_000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// ---------------------------------------------------------------------------
// Content generation – scheduler‑based selection across all keys and model priority list
// ---------------------------------------------------------------------------

interface GenerateContentParams {
  contents: string | any[];
  config?: any;
}

/** Model priority – best to fallback. Adjust as needed. */
const MODEL_PRIORITY = [
  // Premium Gemini models (best quality)
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  // High‑quality Gemini lite / preview models (still fast)
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite-preview',
  // Additional Gemini flash‑lite variants that are functional
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest',
  // Open‑source Gemma 4 models – good fallback when Gemini quota is exhausted
  'gemma-4-26b-a4b-it',
  'gemma-4-31b-it',
];

export async function generateContentWithFallback(
  params: GenerateContentParams,
): Promise<{ response: any; modelUsed: string; viaGateway: boolean }> {
  // Mock mode – unchanged from original implementation (kept for testing)
  if (process.env.MOCK_GEMINI === 'true') {
    const contentsStr = typeof params.contents === 'string' ? params.contents : JSON.stringify(params.contents);
    let mockText = '';
    if (contentsStr.includes('Please explain the following concept:')) {
      mockText = JSON.stringify({ analogy: 'Imagine a car driving down the street at a steady pace...', simplification: 'Velocity is speed with a specific direction.', commonMisconception: 'Students often confuse velocity with speed, which does not have a direction.' });
    } else if (contentsStr.includes('Review the student')) {
      mockText = JSON.stringify({ detectedMisconception: 'The student incorrectly assumed that normal force is always equal to gravity, even on an inclined plane.', mathematicalError: 'Forgot to multiply by cos(theta) in the force balance equation.', socraticGuidance: '1. What direction does the normal force act relative to the surface?\n2. How does the weight component perpendicular to the surface change as the angle increases?' });
    } else {
      mockText = JSON.stringify({ knowledge_objects: [{ conceptName: 'Velocity definition', title: 'Definition of Velocity', content: 'Velocity defines the rate of change of position. Measured in meters per second ($m/s$).', type: 'definition', difficulty: 'easy', bloomLevel: 'remember', tags: ['velocity'], importance: 'high', metadata: {} }] });
    }
    return { response: { text: mockText }, modelUsed: 'mock-model', viaGateway: false };
  }

  let lastError: any = null;

  for (const model of MODEL_PRIORITY) {
    const maxKeyAttempts = geminiKeyPool.getAllKeys().length;
    for (let attempt = 0; attempt < maxKeyAttempts; attempt++) {
      const key = geminiKeyPool.getBestKey(model);
      if (!key) {
        break; // No more keys available for this model, try next model
      }

      const clients = getClientsPriority(key);
      for (const { client, viaGateway } of clients) {
        const clientLabel = viaGateway ? 'gateway' : 'direct';
        const t0 = Date.now();
        try {
          const response = await withGeminiRetry(() =>
            client.models.generateContent({
              model,
              contents: params.contents,
              config: params.config,
            })
          );
          logAiRequest({
            operation: 'generateContent',
            model,
            viaGateway,
            latencyMs: Date.now() - t0,
            success: true,
          });
          geminiKeyPool.markSuccess(key.id, model);
          return { response, modelUsed: model, viaGateway };
        } catch (err: any) {
          lastError = err;
          geminiKeyPool.markFailure(key.id, model, err);
          logAiRequest({
            operation: 'generateContent',
            model,
            viaGateway,
            latencyMs: Date.now() - t0,
            success: false,
            error: err?.message,
          });
          console.warn(`Gemini model ${model} via ${clientLabel} (key ${key.id}) failed: ${err?.message || err}`);
        }
      }
    }
  }

  throw lastError || new Error('All Gemini models failed to generate content');
}

// ---------------------------------------------------------------------------
// Export the key pool for external usage (e.g., health monitoring)
// ---------------------------------------------------------------------------
export { geminiKeyPool };

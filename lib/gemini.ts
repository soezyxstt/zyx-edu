import { GoogleGenAI } from '@google/genai';
import { env } from '@/lib/env';
import { logAiRequest } from '@/lib/ai/analytics';

// ────────────────────────────────────────────────────────────────────────────
// Client factory
// ────────────────────────────────────────────────────────────────────────────

/**
 * Creates a GoogleGenAI client pointed at the given base URL.
 * When `baseUrl` is undefined the SDK uses the default Gemini API endpoint.
 */
function createGeminiClient(baseUrl?: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
    ...(baseUrl
      ? {
          httpOptions: {
            // Route every request through the Cloudflare AI Gateway
            baseUrl,
          },
        }
      : {}),
  });
}

/**
 * Primary client:
 *   - When CF_AI_GATEWAY_URL is set → Cloudflare AI Gateway (cached analytics, rate-limit pooling)
 *   - Otherwise → direct Gemini API
 *
 * Application code should import `ai` and call `ai.models.*` directly.
 * The abstraction layer in `generateContentWithFallback` / `embedText`
 * handles gateway → direct fallback automatically.
 */
export const ai = createGeminiClient(env.CF_AI_GATEWAY_URL);

/** Direct Gemini client — used as the fallback when the gateway fails. */
const aiDirect = env.CF_AI_GATEWAY_URL
  ? createGeminiClient() // only create if there IS a gateway (otherwise same as `ai`)
  : ai;

// ────────────────────────────────────────────────────────────────────────────
// Embedding
// ────────────────────────────────────────────────────────────────────────────

const EMBEDDING_MODELS = ['gemini-embedding-2', 'gemini-embedding-002', 'gemini-embedding-001'];

/**
 * Generates a 1024-dimensional embedding vector for a single text string.
 * Routes down available models: gemini-embedding-2 -> gemini-embedding-002 -> gemini-embedding-001
 * Scaled to 1024 dimensions.
 */
export async function embedText(text: string): Promise<number[]> {
  let lastError: any = null;

  for (const model of EMBEDDING_MODELS) {
    for (const client of getClients()) {
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
            viaGateway: client === ai && !!env.CF_AI_GATEWAY_URL,
            latencyMs: Date.now() - t0,
            success: true,
          });
          return values;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Embedding model ${model} failed: ${err?.message || err}`);
      }
    }
  }

  throw lastError || new Error('All Gemini embedding models failed to generate vector');
}

/**
 * Generates embedding vectors for multiple texts in a single batch call.
 * More efficient than calling embedText() in a loop.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const results = await Promise.all(texts.map((t) => embedText(t)));
  return results;
}

// ────────────────────────────────────────────────────────────────────────────
// Retry helper
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// Content generation with gateway → direct fallback
// ────────────────────────────────────────────────────────────────────────────

interface GenerateContentParams {
  contents: string | any[];
  config?: any;
}

/**
 * Returns [gatewayClient, directClient] when gateway is configured, or just
 * [directClient] to avoid double-trying the same endpoint.
 */
function getClients(): GoogleGenAI[] {
  return env.CF_AI_GATEWAY_URL ? [ai, aiDirect] : [ai];
}

/**
 * Generates content using priority-ordered model routing:
 * gemini-3.5-flash -> gemini-3-flash -> gemini-2.5-flash
 *
 * For each model the function tries:
 *   1. Cloudflare AI Gateway (if CF_AI_GATEWAY_URL is set)
 *   2. Direct Gemini API    (fallback — NEVER removed per safety rules)
 *
 * Application code must not depend on which path succeeded; it receives
 * `{ response, modelUsed, viaGateway }` and can inspect if needed.
 */
export async function generateContentWithFallback(
  params: GenerateContentParams
): Promise<{ response: any; modelUsed: string; viaGateway: boolean }> {
  if (process.env.MOCK_GEMINI === "true") {
    const contentsStr = typeof params.contents === "string" ? params.contents : JSON.stringify(params.contents);
    let mockText = "";

    if (contentsStr.includes("Please explain the following concept:")) {
      mockText = JSON.stringify({
        analogy: "Imagine a car driving down the street at a steady pace...",
        simplification: "Velocity is speed with a specific direction.",
        commonMisconception: "Students often confuse velocity with speed, which does not have a direction."
      });
    } else if (contentsStr.includes("Review the student's incorrect answer:")) {
      mockText = JSON.stringify({
        detectedMisconception: "The student incorrectly assumed that normal force is always equal to gravity, even on an inclined plane.",
        mathematicalError: "Forgot to multiply by cos(theta) in the force balance equation.",
        socraticGuidance: "1. What direction does the normal force act relative to the surface?\n2. How does the weight component perpendicular to the surface change as the angle increases?"
      });
    } else if (contentsStr.includes("Bad Spacing")) {
      // Test 2: Malformed Chapter
      if (contentsStr.includes("previous response was invalid")) {
        mockText = JSON.stringify({
          knowledge_objects: [{
            conceptName: "Velocity definition",
            title: "Definition of Velocity",
            content: "Velocity defines the rate of change of position.",
            type: "definition",
            difficulty: "easy",
            bloomLevel: "remember",
            tags: ["velocity"],
            importance: "high",
            metadata: {}
          }]
        });
      } else {
        mockText = `{ "knowledge_objects": [ { "title": "Velocity", `;
      }
    } else if (contentsStr.includes("Equations")) {
      // Test 3: Formula-Heavy
      mockText = JSON.stringify({
        knowledge_objects: [{
          conceptName: "Newtons second law",
          title: "Newton's Second Law",
          content: "Newton's Second Law defines relationship:\n\n$$F = m \\cdot a$$",
          type: "formula",
          difficulty: "easy",
          bloomLevel: "understand",
          tags: ["force", "newton"],
          importance: "high",
          metadata: {}
        }]
      });
    } else if (contentsStr.includes("Examples")) {
      // Test 4: Examples
      if (contentsStr.includes("previous response was invalid")) {
        mockText = JSON.stringify({
          knowledge_objects: [{
            conceptName: "Velocity calculation example",
            title: "Example: Calculating Velocity",
            content: "Example solution:\n\n$$v = \\frac{d}{t} = 20 \\text{ m/s}$$",
            type: "example",
            difficulty: "medium",
            bloomLevel: "apply",
            tags: ["velocity", "example"],
            importance: "medium",
            metadata: {}
          }]
        });
      } else {
        mockText = JSON.stringify({
          knowledge_objects: [{
            conceptName: "Velocity calculation example",
            title: "Example: Calculating Velocity",
            content: "Example solution:\n\n$$v = \\frac{d}{t} = 20 \\text{ m/s}$$",
            type: "invalid-type-to-fail-zod",
            difficulty: "medium",
            bloomLevel: "apply",
            tags: ["velocity", "example"],
            importance: "medium",
            metadata: {}
          }]
        });
      }
    } else if (contentsStr.includes("Misconceptions")) {
      // Test 5: Misconceptions
      mockText = JSON.stringify({
        knowledge_objects: [{
          conceptName: "Normal force weight misconception",
          title: "Misconception: Normal Force",
          content: "**Misconception:** Normal force equals weight.\n\n**Correction:** Normal force changes on an incline:\n\n$$N = m \\cdot g \\cdot \\cos(\\theta)$$",
          type: "misconception",
          difficulty: "medium",
          bloomLevel: "analyze",
          tags: ["force", "gravity"],
          importance: "medium",
          metadata: {}
        }]
      });
    } else {
      // Default: Test 1 (Clean Chapter)
      mockText = JSON.stringify({
        knowledge_objects: [{
          conceptName: "Velocity definition",
          title: "Definition of Velocity",
          content: "Velocity defines the rate of change of position. Measured in meters per second ($m/s$).",
          type: "definition",
          difficulty: "easy",
          bloomLevel: "remember",
          tags: ["velocity"],
          importance: "high",
          metadata: {}
        }]
      });
    }

    return {
      response: { text: mockText },
      modelUsed: "mock-model",
      viaGateway: false,
    };
  }

  // gemini-2.5-flash is the documented primary (AGENT_CONTEXT) and has the
  // working free-tier quota; gemini-3.5-flash stays as a fallback. The former
  // 'gemini-3-flash' entry was removed: it 404s (not served for generateContent).
  const models = ['gemini-2.5-flash', 'gemini-3.5-flash'];
  const clients = getClients();
  let lastError: any = null;

  for (const model of models) {
    for (const client of clients) {
      const viaGateway = client === ai && !!env.CF_AI_GATEWAY_URL;
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
        return { response, modelUsed: model, viaGateway };
      } catch (err: any) {
        lastError = err;
        logAiRequest({
          operation: 'generateContent',
          model,
          viaGateway,
          latencyMs: Date.now() - t0,
          success: false,
          error: err?.message,
        });
        console.warn(
          `Gemini model ${model} via ${clientLabel} failed: ${err?.message || err}`
        );
      }
    }
  }

  throw lastError || new Error('All Gemini models failed to generate content');
}

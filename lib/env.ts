import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';
import { resolveAuthBaseUrl } from '@/lib/auth-site-url';
import { publicAppUrlSchema } from '@/lib/public-app-url';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    /**
     * Public origin of this app (no trailing path). Used for OAuth callbacks.
     * Prefer `BETTER_AUTH_URL`; falls back to `NEXT_PUBLIC_APP_URL`, then localhost.
     */
    BETTER_AUTH_URL: z.preprocess(() => resolveAuthBaseUrl(), z.string().url()),
    /**
     * Better Auth recommends ≥32 high-entropy chars (`openssl rand -base64 32`).
     * Shorter values still run in dev but will log security warnings.
     */
    BETTER_AUTH_SECRET: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    TIGRIS_AWS_ACCESS_KEY_ID: z.string(),
    TIGRIS_AWS_SECRET_ACCESS_KEY: z.string(),
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string(),
  },
  client: {
    /** Absolute origin for better-auth client (e.g. https://app.example.com). Falls back for local dev. */
    NEXT_PUBLIC_APP_URL: publicAppUrlSchema,
  },
  runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    TIGRIS_AWS_ACCESS_KEY_ID: process.env.TIGRIS_AWS_ACCESS_KEY_ID,
    TIGRIS_AWS_SECRET_ACCESS_KEY: process.env.TIGRIS_AWS_SECRET_ACCESS_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  },
});

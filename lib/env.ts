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
    /** From https://uploadthing.com/dashboard — replaces direct S3/Tigris uploads. */
    UPLOADTHING_TOKEN: z.string().min(1),
    /** Nomor WhatsApp admin (digits; `+`/spaces allowed). Contoh: `6281234567890`. */
    WHATSAPP_ADMIN_NUMBER: z.string().optional(),
  },
  client: {
    /** Absolute origin for better-auth client (e.g. https://app.example.com). Falls back for local dev. */
    NEXT_PUBLIC_APP_URL: publicAppUrlSchema,
    /** Desmos API key from https://www.desmos.com/my-api — embeds the graphing calculator on the landing lab when set. */
    NEXT_PUBLIC_DESMOS_API_KEY: z.string().optional(),
    /**
     * Nomor WhatsApp publik (fallback jika `WHATSAPP_ADMIN_NUMBER` tidak diset di server).
     * Hanya angka; `+`/spasi diperbolehkan.
     */
    NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_DESMOS_API_KEY: process.env.NEXT_PUBLIC_DESMOS_API_KEY,
    NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
    WHATSAPP_ADMIN_NUMBER: process.env.WHATSAPP_ADMIN_NUMBER,
  },
});

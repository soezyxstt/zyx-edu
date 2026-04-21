/**
 * Public origin of this Next.js app (no path). Used for Better Auth `baseURL` / OAuth callbacks.
 * Prefer `BETTER_AUTH_URL`, then `NEXT_PUBLIC_APP_URL`, then local dev default.
 */
export function resolveAuthBaseUrl(): string {
  const explicit = process.env.BETTER_AUTH_URL?.trim();
  if (explicit) return explicit;
  const pub = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (pub) return pub;
  return "http://localhost:3000";
}

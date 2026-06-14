/**
 * Cloudflare Workers KV REST client (P3).
 *
 * Cache semantics only: any failure (missing config, network, timeout, non-2xx)
 * degrades to a silent miss so the caller always falls through to generation.
 *
 * Free-tier guard: KV allows ONLY 1,000 writes/day. A daily counter under
 * `meta:writes:{yyyy-mm-dd}` stops all writes once it reaches WRITE_DAILY_LIMIT.
 */

import { env } from '@/lib/env';

const TIMEOUT_MS = 1500;
const WRITE_DAILY_LIMIT = 900;

function kvBaseUrl(): string | null {
  if (!env.CF_ACCOUNT_ID || !env.CF_KV_NAMESPACE_ID || !env.CF_API_TOKEN) return null;
  return `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/storage/kv/namespaces/${env.CF_KV_NAMESPACE_ID}`;
}

async function kvFetch(path: string, init: RequestInit = {}): Promise<Response | null> {
  const base = kvBaseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res;
  } catch {
    return null;
  }
}

/** Reads a key. Returns the parsed JSON value, or null on miss/any failure. */
export async function kvGet<T = unknown>(key: string): Promise<T | null> {
  const res = await kvFetch(`/values/${encodeURIComponent(key)}`);
  if (!res || !res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function todayKey(): string {
  return `meta:writes:${new Date().toISOString().slice(0, 10)}`;
}

/**
 * Reads today's write counter. Counter reads are plain text integers,
 * not JSON, and a missing counter means zero writes so far.
 */
async function getWriteCount(): Promise<number> {
  const res = await kvFetch(`/values/${encodeURIComponent(todayKey())}`);
  if (!res || !res.ok) return 0;
  const text = await res.text().catch(() => '0');
  const n = parseInt(text, 10);
  return Number.isNaN(n) ? 0 : n;
}

async function bumpWriteCount(current: number): Promise<void> {
  // Counter key expires after 2 days; +2 accounts for the value write and this write.
  await kvFetch(`/values/${encodeURIComponent(todayKey())}?expiration_ttl=172800`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body: String(current + 2),
  });
}

/**
 * Writes a JSON value with a TTL. Silently does nothing when the daily
 * write counter is at or past the limit, or on any failure.
 */
export async function kvPut(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const count = await getWriteCount();
  if (count >= WRITE_DAILY_LIMIT) return;

  const res = await kvFetch(
    `/values/${encodeURIComponent(key)}?expiration_ttl=${Math.max(60, Math.floor(ttlSeconds))}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    },
  );
  if (res?.ok) {
    await bumpWriteCount(count);
  }
}

/** Deletes a key. Failures are ignored. */
export async function kvDelete(key: string): Promise<void> {
  await kvFetch(`/values/${encodeURIComponent(key)}`, { method: 'DELETE' });
}

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "@/db/schema";

const isProduction = process.env.NODE_ENV === "production";

let client;
if (isProduction) {
  const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_CONNECTION_URL || (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("postgres") ? process.env.DATABASE_URL : undefined);
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    throw new Error("Production TURSO_DATABASE_URL or TURSO_CONNECTION_URL is missing");
  }
  client = createClient({ url, authToken });
} else {
  // Local development SQLite
  // Detect if we are in a web/browser environment where the 'file:' protocol is unsupported.
  const isWeb = typeof window !== "undefined" || !globalThis.process || !globalThis.process.versions || !globalThis.process.versions.node;
  const url = isWeb
    ? "https://local-sqlite-placeholder.internal"
    : (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("postgres")
        ? process.env.DATABASE_URL
        : "file:dev.db");
  client = createClient({ url });
}

export const db = drizzle(client, { schema });

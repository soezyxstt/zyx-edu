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
  const url = process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("postgres")
    ? process.env.DATABASE_URL
    : "file:dev.db";
  client = createClient({ url });
}

export const db = drizzle(client, { schema });

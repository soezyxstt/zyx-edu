import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../db/schema";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    console.error("TURSO_DATABASE_URL is missing");
    process.exit(1);
  }
  console.log(`Connecting to Turso: ${url}...`);
  const client = createClient({ url, authToken });
  const db = drizzle(client, { schema });

  try {
    const allCourses = await db.select().from(schema.courses);
    console.log("Courses found on Turso:", JSON.stringify(allCourses, null, 2));
    process.exit(0);
  } catch (error) {
    console.error("Error fetching courses from Turso:", error);
    process.exit(1);
  }
}

main();

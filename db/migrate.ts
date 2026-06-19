import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Running local migrations...");
  try {
    await db.run(sql`PRAGMA foreign_keys = OFF;`);
    await migrate(db, { migrationsFolder: "./drizzle" });
    await db.run(sql`PRAGMA foreign_keys = ON;`);
    console.log("Local migrations applied successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Failed to run local migrations:", error);
    process.exit(1);
  }
}

main();

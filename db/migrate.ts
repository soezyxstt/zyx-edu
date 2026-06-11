import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./index";

async function main() {
  console.log("Running local migrations...");
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Local migrations applied successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Failed to run local migrations:", error);
    process.exit(1);
  }
}

main();

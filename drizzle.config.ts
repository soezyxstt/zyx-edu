import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables for the Drizzle CLI
dotenv.config({ path: ".env" }); 

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
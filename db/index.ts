import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Ensure the DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in environment variables");
}

// Create a connection pool using the pg driver
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize and export the db instance with your schema
export const db = drizzle(pool, { schema });
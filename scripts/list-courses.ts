import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { db } from "../db";
import { courses } from "../db/schema";

async function main() {
  console.log("Listing all courses...");
  try {
    const allCourses = await db.select().from(courses);
    console.log("Courses found:", JSON.stringify(allCourses, null, 2));
    process.exit(0);
  } catch (error) {
    console.error("Error fetching courses:", error);
    process.exit(1);
  }
}

main();

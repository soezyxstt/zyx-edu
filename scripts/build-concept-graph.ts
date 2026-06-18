/**
 * E5: rebuild the concept-graph rollup for one course or all courses.
 * Run: bunx tsx scripts/build-concept-graph.ts [courseId]
 */
import "dotenv/config";
import { db } from "../lib/db/index";
import { courses } from "../db/schema";
import { buildConceptGraph } from "../lib/graph-trace";

async function main() {
  const courseId = process.argv[2];
  const targets = courseId
    ? [{ id: courseId }]
    : await db.select({ id: courses.id }).from(courses);

  let total = 0;
  for (const c of targets) {
    const n = await buildConceptGraph(c.id);
    total += n;
    if (n > 0) console.log(`  ${c.id}: ${n} edges`);
  }
  console.log(`Done. ${total} concept edges across ${targets.length} course(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("build-concept-graph failed:", err);
  process.exit(1);
});

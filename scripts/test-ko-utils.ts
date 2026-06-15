import { preprocessMarkdown, repairJsonString, safeParseJson } from "../lib/ko-utils";
import { z } from "zod";

function testPreprocessing() {
  console.log("--- Testing Preprocessing ---");
  const rawMarkdown = "Hello\u0000World!\u200B This is a pdf\r\nwith line endings and normal text.";
  const cleaned = preprocessMarkdown(rawMarkdown);
  console.log("Raw length:", rawMarkdown.length);
  console.log("Cleaned length:", cleaned.length);
  console.log("Contains null:", cleaned.includes("\u0000"));
  console.log("Contains zero-width space:", cleaned.includes("\u200B"));
  console.log("Contains CR:", cleaned.includes("\r"));
  console.log("Result content:\n", JSON.stringify(cleaned));
}

function testJsonRepair() {
  console.log("\n--- Testing JSON Repair ---");
  const badJson = `\`\`\`json
  {
    "conceptName": "Termodinamika",
    "content": "Ini adalah formula:
    $$F = m \\cdot a$$
    Dan baris baru lainnya.",
    "tags": ["term", "fisika",],
    "conceptTests": {
      "taughtIndependently": true,
      "chapterHeading": false
  \`\`\``;

  const repaired = repairJsonString(badJson);
  console.log("Repaired JSON:\n", repaired);

  const TestSchema = z.object({
    conceptName: z.string(),
    content: z.string(),
    tags: z.array(z.string()),
    conceptTests: z.object({
      taughtIndependently: z.boolean(),
      chapterHeading: z.boolean(),
    }),
  });

  const parsedResult = safeParseJson(badJson, TestSchema);
  if (parsedResult.success) {
    console.log("✓ Safely parsed and validated!");
    console.log("Data:", parsedResult.data);
  } else {
    console.log("❌ Failed to parse/validate:", parsedResult.error.message);
  }
}

testPreprocessing();
testJsonRepair();

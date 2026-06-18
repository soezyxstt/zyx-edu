/**
 * E4: verify the difficulty-blended SM-2 scheduler and difficulty prior.
 * Pure math, no DB. Run: bunx tsx scripts/seed-fc-difficulty.ts
 */
import "dotenv/config";
import { calculateNextReview, difficultyFirstInterval } from "../lib/flashcard-scheduler";
import { difficultyPriorFromKO } from "../lib/flashcard-generator";

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean) {
  if (cond) { pass += 1; console.log(`  PASS ${label}`); }
  else { fail += 1; console.log(`  FAIL ${label}`); }
}

function main() {
  console.log("E4 flashcard difficulty checks...\n");

  // E4.1 prior from KO difficulty
  console.log("E4.1 difficulty prior from KO");
  check("easy -> 2", difficultyPriorFromKO("easy") === 2);
  check("medium -> 3", difficultyPriorFromKO("medium") === 3);
  check("hard -> 4", difficultyPriorFromKO("hard") === 4);
  check("undefined -> 3", difficultyPriorFromKO(undefined) === 3);

  // E4.2 first interval = clamp(4 - difficulty, 1, 3)
  console.log("\nE4.2 first interval seed");
  check("difficulty 1 -> 3 days", difficultyFirstInterval(1) === 3);
  check("difficulty 3 -> 1 day", difficultyFirstInterval(3) === 1);
  check("difficulty 5 -> 1 day", difficultyFirstInterval(5) === 1);
  // Correct review from box 0 -> box 1 uses the seed.
  const r1 = calculateNextReview(3, 0, 2.5, 1, null, false, 1);
  const r5 = calculateNextReview(3, 0, 2.5, 1, null, false, 5);
  check("box1 interval seeded by difficulty 1 = 3", r1.nextIntervalDays === 3);
  check("box1 interval seeded by difficulty 5 = 1", r5.nextIntervalDays === 1);

  // E4.3 box>=3 growth scaled by difficulty factor (easy faster, hard slower)
  console.log("\nE4.3 box>=3 growth scaling");
  // currentBox 3 -> nextBox 4, grade 3 (Good): multiplier = EF * diffFactor.
  const easy = calculateNextReview(3, 3, 2.5, 10, null, false, 1); // factor 1.2
  const hard = calculateNextReview(3, 3, 2.5, 10, null, false, 5); // factor 0.8
  const neutral = calculateNextReview(3, 3, 2.5, 10, null, false, 3); // factor 1.0
  check("easy grows faster than neutral", easy.nextIntervalDays > neutral.nextIntervalDays);
  check("hard grows slower than neutral", hard.nextIntervalDays < neutral.nextIntervalDays);
  check("neutral (difficulty 3) factor 1.0 == base EF growth", Math.abs(neutral.nextIntervalDays - 10 * 2.5) < 0.01);

  // E4.4 wrong review reschedules from the difficulty seed, not flat 1
  console.log("\nE4.4 wrong review uses difficulty seed");
  const wrong1 = calculateNextReview(1, 4, 2.5, 30, null, false, 1);
  const wrong5 = calculateNextReview(1, 4, 2.5, 30, null, false, 5);
  check("difficulty 1 wrong -> 3 days (not flat 1)", wrong1.nextIntervalDays === 3);
  check("difficulty 5 wrong -> 1 day", wrong5.nextIntervalDays === 1);

  // E4.6 legacy parity: no difficulty -> pure SM-2
  console.log("\nE4.6 legacy parity (no difficulty)");
  const legacyBox1 = calculateNextReview(3, 0, 2.5, 1, null, false);
  check("box1 Good without difficulty = 1 (unchanged)", legacyBox1.nextIntervalDays === 1);
  const legacyAgain = calculateNextReview(1, 4, 2.5, 30, null, false);
  check("wrong without difficulty = 0.007 (10-min relearn unchanged)", legacyAgain.nextIntervalDays === 0.007);
  const legacyBox3 = calculateNextReview(3, 3, 2.5, 10, null, false);
  check("box>=3 without difficulty = base EF growth (25)", Math.abs(legacyBox3.nextIntervalDays - 25) < 0.01);

  console.log(`\nE4 result: ${pass} pass, ${fail} fail.`);
  process.exit(fail > 0 ? 1 : 0);
}

main();

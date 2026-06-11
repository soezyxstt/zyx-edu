export interface SM2Result {
  nextBox: number; // maps to n (consecutive correct count)
  nextEF: number;
  nextIntervalDays: number;
  nextReviewDue: Date;
  safetyFloorActive: boolean;
}

/**
 * Calculates next spacing interval, Ease Factor, and due dates using pure SM-2.
 */
export function calculateNextReview(
  grade: number, // 1: Again, 2: Hard, 3: Good, 4: Easy
  currentBox: number, // current n
  currentEF: number,
  currentIntervalDays: number,
  lastReviewedAt: Date | null,
  safetyFloorActive: boolean = false
): SM2Result {
  const now = new Date();

  // 1. Calculate elapsed days since last review
  let elapsedDays = currentIntervalDays;
  if (lastReviewedAt) {
    const msDiff = now.getTime() - lastReviewedAt.getTime();
    elapsedDays = Math.max(0, msDiff / (1000 * 60 * 60 * 24));
  }

  let nextBox = currentBox;
  let nextEF = currentEF;
  let nextIntervalDays = currentIntervalDays;
  let nextSafetyFloorActive = safetyFloorActive;

  // 2. Adjust Ease Factor and Spacing Repetitions based on quality grade
  if (grade === 1) {
    // Grade: Again (failed)
    nextBox = 0;
    nextEF = Math.max(1.3, currentEF - 0.2);
    nextIntervalDays = 0.007; // 10 minutes interval

    // Activate safety floor reset if the failed card was highly stable (interval >= 60 days)
    if (currentIntervalDays >= 60) {
      nextSafetyFloorActive = true;
    }
  } else {
    // Grade: Correct recall (Hard, Good, Easy)
    nextBox = currentBox + 1;

    // Adjust EF
    if (grade === 2) {
      // Hard
      nextEF = Math.max(1.3, currentEF - 0.15);
    } else if (grade === 4) {
      // Easy
      nextEF = Math.min(2.8, currentEF + 0.15);
    }

    // Determine target interval
    if (nextBox === 1) {
      nextIntervalDays = grade === 4 ? 2 : 1;
    } else if (nextBox === 2) {
      nextIntervalDays = grade === 4 ? 8 : grade === 3 ? 6 : 3;
    } else {
      // Box >= 3: multiply previous interval
      let multiplier = nextEF;
      if (grade === 2) {
        multiplier = 1.2;
      } else if (grade === 4) {
        multiplier = nextEF * 1.3;
      }

      // Overdue handling: scale based on actual elapsed days if student was late
      const baseDays = elapsedDays > currentIntervalDays && grade > 2 ? elapsedDays : currentIntervalDays;
      nextIntervalDays = baseDays * multiplier;
    }

    // Apply safety floor recovery cap: if card is recovered, limit its first interval to 14 days
    if (nextSafetyFloorActive) {
      nextIntervalDays = Math.min(14, nextIntervalDays);
      nextSafetyFloorActive = false; // Reset safety floor flag
    }
  }

  // 3. Compute next due date
  const nextReviewDue = new Date(now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000);

  return {
    nextBox,
    nextEF: parseFloat(nextEF.toFixed(2)),
    nextIntervalDays: parseFloat(nextIntervalDays.toFixed(3)),
    nextReviewDue,
    safetyFloorActive: nextSafetyFloorActive,
  };
}

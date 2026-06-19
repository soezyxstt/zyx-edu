import { ConsistencyMetrics } from "@/types/learning-analytics";

/**
 * Calculates consistency metrics based on daily study activity and current streak.
 * 
 * Formulas:
 * 
 * 1. Study Regularity:
 *    Measures the consistency of study duration on active days.
 *    Regularity = 100 * (Number of active days with >= 10 mins (600s) of study) / max(1, Total active days)
 *    This evaluates whether the student is engaging in meaningful study sessions rather than quick visits.
 * 
 * 2. Active Day Distribution:
 *    Measures how study days are distributed over the last 30 days and across the 4 weeks.
 *    Distribution = 0.6 * (Active Days in 30 / 30 * 100) + 0.4 * (Weeks with >= 1 active day / 4 * 100)
 *    This ensures that steady daily habits are rewarded higher than cramming.
 * 
 * 3. Streak Quality:
 *    Evaluates the current streak. A streak maintained with substantial study time (>15 mins daily average)
 *    is higher quality than one maintained with negligible study times.
 *    Streak Quality = 100 * min(1, Average daily study time during current streak / 900s)
 *    If current streak is 0, Streak Quality is 0.
 * 
 * 4. Overall Consistency Score:
 *    Weighted average of the above three components.
 *    Overall = 0.4 * Regularity + 0.3 * Distribution + 0.3 * Streak Quality
 */
export function calculateConsistencyScore(
  dailyStudyTime: { date: string; timeSpentSeconds: number }[],
  currentStreak: number
): ConsistencyMetrics {
  // 1. Regularity
  const activeDays = dailyStudyTime.filter(d => d.timeSpentSeconds > 0);
  const meaningfulDays = activeDays.filter(d => d.timeSpentSeconds >= 600);
  const regularityScore = activeDays.length > 0
    ? Math.min(100, Math.round((meaningfulDays.length / activeDays.length) * 100))
    : 0;

  // 2. Active Day Distribution
  const activeDaysCount = activeDays.length;
  const activeDaysIn30Score = (Math.min(activeDaysCount, 30) / 30) * 100;

  // Group active days into 4 weeks of the last 30 days (7-day buckets)
  const weeklyActive = [false, false, false, false];
  const now = new Date();
  activeDays.forEach(d => {
    const dDate = new Date(d.date);
    const diffMs = now.getTime() - dDate.getTime();
    const diffDays = Math.floor(diffMs / (24 * 3600 * 1000));
    if (diffDays >= 0 && diffDays < 28) {
      const weekIndex = Math.floor(diffDays / 7);
      weeklyActive[weekIndex] = true;
    }
  });
  const activeWeeksCount = weeklyActive.filter(Boolean).length;
  const weeklyDistributionScore = (activeWeeksCount / 4) * 100;

  const activeDayDistribution = Math.round(
    0.6 * activeDaysIn30Score + 0.4 * weeklyDistributionScore
  );

  // 3. Streak Quality
  let streakQuality = 0;
  if (currentStreak > 0 && activeDaysCount > 0) {
    // Sort daily study time by date descending to get the streak days
    const sortedDays = [...activeDays].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const streakDays = sortedDays.slice(0, currentStreak);
    const avgStreakTime = streakDays.reduce((acc, curr) => acc + curr.timeSpentSeconds, 0) / currentStreak;
    // Target is 15 minutes (900 seconds) for max streak quality
    streakQuality = Math.min(100, Math.round((avgStreakTime / 900) * 100));
  }

  // 4. Overall Score
  const overallConsistencyScore = Math.min(
    100,
    Math.round(
      0.4 * regularityScore +
      0.3 * activeDayDistribution +
      0.3 * streakQuality
    )
  );

  return {
    regularityScore,
    activeDayDistribution,
    streakQuality,
    overallConsistencyScore,
  };
}

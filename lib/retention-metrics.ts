import { RetentionMetrics } from "@/types/learning-analytics";

/**
 * Calculates retention metrics based on student flashcard activities.
 * Designed to cleanly separate the domain logic for future mastery engine integration.
 * 
 * Formulas:
 * 
 * 1. Review Frequency Score:
 *    Measures the volume of card reviews completed in the last 30 days.
 *    Target is at least 120 reviews for full frequency credit.
 *    Frequency = 100 * min(1, Total Reviews in 30 Days / 120)
 * 
 * 2. Flashcard Engagement Score:
 *    Evaluates active engagement using a mix of unique card coverage and performance (average grades).
 *    Coverage Portion = (Unique Cards Reviewed / Total Cards in Course Sets) * 100
 *    Performance Portion = ((Average Grade - 1) / 3) * 100   [Maps grade 1-4 to 0-100]
 *    Engagement = 0.5 * Coverage Portion + 0.5 * Performance Portion
 * 
 * 3. Review Consistency Score:
 *    Evaluates how effectively the student retains materials (minimizing lapses/mistakes).
 *    Lapses represent cards reset due to failed recall.
 *    Consistency = 100 * (1 - Lapses / max(1, Total Reviews))
 * 
 * 4. Overall Retention Score:
 *    Consolidated retention health score.
 *    Overall = 0.4 * Frequency + 0.3 * Engagement + 0.3 * Consistency
 */
export function calculateRetentionScore(
  totalReviews30Days: number,
  uniqueCardsReviewed: number,
  totalCardsInCourseSets: number,
  averageGrade: number, // Range 1 to 4
  lapsesCount: number
): RetentionMetrics {
  // 1. Review Frequency
  const reviewFrequencyScore = Math.min(100, Math.round((totalReviews30Days / 120) * 100));

  // 2. Flashcard Engagement
  const coverageRatio = totalCardsInCourseSets > 0 ? uniqueCardsReviewed / totalCardsInCourseSets : 0;
  const coveragePortion = coverageRatio * 100;

  // Grade is 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
  // Normalize average grade between 1 and 4 into a 0-100 range
  const gradePortion = Math.max(0, Math.min(100, ((averageGrade - 1) / 3) * 100));

  const flashcardEngagementScore = Math.min(
    100,
    Math.round(0.5 * coveragePortion + 0.5 * gradePortion)
  );

  // 3. Review Consistency
  // A high count of lapses relative to total reviews degrades the retention consistency score
  const consistencyRatio = Math.max(0, 1 - lapsesCount / Math.max(1, totalReviews30Days));
  const reviewConsistencyScore = Math.round(consistencyRatio * 100);

  // 4. Overall Retention Score
  const overallRetentionScore = Math.min(
    100,
    Math.round(
      0.4 * reviewFrequencyScore +
      0.3 * flashcardEngagementScore +
      0.3 * reviewConsistencyScore
    )
  );

  return {
    reviewFrequencyScore,
    flashcardEngagementScore,
    reviewConsistencyScore,
    overallRetentionScore,
  };
}

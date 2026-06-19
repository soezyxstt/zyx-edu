export interface StudentAnalytics {
  studyTimeToday: number; // in seconds
  studyTimeThisWeek: number; // in seconds
  studyTimeThisMonth: number; // in seconds
  completedMaterials: number;
  materialsInProgress: number;
  flashcardsReviewedToday: number;
  flashcardsReviewedThisWeek: number;
  quizzesCompleted: number;
  activeDaysLast30: number;
  currentStreak: number;
  longestStreak: number;
}

export interface CourseAnalytics {
  enrolledStudents: number;
  activeStudents: number; // Active in last 30 days
  completionRate: number; // 0-100
  averageStudyTime: number; // average time spent in seconds per student
  averageMaterialCompletion: number; // 0-100 average material completion percentage
  flashcardActivity: {
    reviewedCount: number;
    activeUsers: number;
  };
  quizParticipation: {
    attemptsCount: number;
    uniqueParticipants: number;
    averageScore: number; // 0-100
  };
}

export interface ConsistencyMetrics {
  regularityScore: number; // 0-100
  activeDayDistribution: number; // 0-100
  streakQuality: number; // 0-100
  overallConsistencyScore: number; // 0-100
}

export interface RetentionMetrics {
  reviewFrequencyScore: number; // 0-100
  flashcardEngagementScore: number; // 0-100
  reviewConsistencyScore: number; // 0-100
  overallRetentionScore: number; // 0-100
}

export interface DashboardMetrics {
  studentId: string;
  courseId?: string;
  student: StudentAnalytics | null;
  course: CourseAnalytics | null;
  consistency: ConsistencyMetrics | null;
  retention: RetentionMetrics | null;
}

// Zyra Insight Preparation (Interfaces only)
export interface LearningInsight {
  id: string;
  type: "strength" | "weakness" | "pattern" | "milestone";
  title: string;
  description: string;
  metricValue?: number;
  createdAt: string;
}

export interface StudyHabitSummary {
  favoriteStudyTimeOfDay: "morning" | "afternoon" | "evening" | "night";
  averageSessionDurationMinutes: number;
  focusRetentionRate: number; // 0-100
  primaryLearningMode: "reading" | "reviewing" | "quizzing" | "mixed";
}

export interface ActivityPattern {
  dayOfWeek: number; // 0-6 (Sunday is 0)
  timeSpentSeconds: number;
  cardsReviewed: number;
  quizzesAttempted: number;
}

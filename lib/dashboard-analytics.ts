import { DashboardMetrics } from "@/types/learning-analytics";
import { LearningAnalyticsService } from "./learning-analytics.service";

const analyticsService = new LearningAnalyticsService();

/**
 * Adapter providing a stable interface for the frontend to query learning analytics.
 * The UI consumes this adapter, preventing components from querying raw analytics services directly.
 */
export async function getDashboardMetrics(
  studentId: string,
  courseId?: string
): Promise<DashboardMetrics> {
  try {
    // 1. Fetch Student Analytics
    const student = await analyticsService.getStudentAnalytics(studentId, courseId);

    // 2. Fetch Course Analytics (if courseId is provided)
    const course = courseId 
      ? await analyticsService.getCourseAnalytics(courseId)
      : null;

    // 3. Fetch Consistency score & metrics
    const consistency = await analyticsService.getStudentConsistency(studentId, courseId);

    // 4. Fetch Retention score & metrics
    const retention = await analyticsService.getStudentRetention(studentId, courseId);

    return {
      studentId,
      courseId,
      student,
      course,
      consistency,
      retention,
    };
  } catch (error) {
    console.error("Failed to load dashboard metrics:", error);
    
    // Graceful fallback for UI stability
    return {
      studentId,
      courseId,
      student: null,
      course: null,
      consistency: null,
      retention: null,
    };
  }
}

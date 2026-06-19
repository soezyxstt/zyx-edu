import { CourseLearningSummary } from "@/types/course-learning";

/**
 * Adapter to get the learning summary for a course page.
 * Currently returns mock data for the frontend experience.
 * Can be easily integrated with a repository in the future by changing the implementation.
 */
export async function getCourseLearningSummary(
  courseId: string,
  studentId?: string
): Promise<CourseLearningSummary> {
  // Simulate async behavior
  return new Promise((resolve) => {
    // If no student is authenticated, return empty or default data
    if (!studentId) {
      resolve({
        continueReading: null,
        dueFlashcards: {
          dueCount: 0,
          nextReviewRecommendation: "Daftar kelas terlebih dahulu untuk mulai belajar.",
        },
        recentActivities: [],
        studyStatistics: {
          studyTimeMin: 0,
          completedMaterialsCount: 0,
          cardsReviewedCount: 0,
          currentStreakDays: 0,
        },
      });
      return;
    }

    // Default populated mock data
    resolve({
      continueReading: {
        materialId: "m-induksi-matematika",
        materialTitle: "Induksi Matematika dan Teorema Binomial",
        chapterTitle: "Pembuktian dengan Induksi Kuat",
        completionPercent: 65,
        lastSectionId: "sec-induksi-kuat-01",
      },
      dueFlashcards: {
        dueCount: 14,
        nextReviewRecommendation: "Fokus pada Induksi Matematika dan Deret Aritmatika hari ini.",
      },
      recentActivities: [
        {
          id: "act-1",
          type: "flashcard_review",
          title: "Mengulas 15 flashcards",
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
          description: "Materi: Deret Aritmatika",
        },
        {
          id: "act-2",
          type: "material_completion",
          title: "Menyelesaikan dokumen 'Pembuktian Langsung'",
          timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours ago
          description: "Mendapatkan pemahaman 100%",
        },
        {
          id: "act-3",
          type: "quiz_completion",
          title: "Menyelesaikan Kuis: Aljabar Dasar",
          timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // 1 day ago
          description: "Skor: 90/100 (Sangat Baik)",
        },
        {
          id: "act-4",
          type: "tryout_completion",
          title: "Menyelesaikan Tryout Penalaran Matematika",
          timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), // 3 days ago
          description: "Skor: 720/1000",
        },
      ],
      studyStatistics: {
        studyTimeMin: 185,
        completedMaterialsCount: 8,
        cardsReviewedCount: 120,
        currentStreakDays: 5,
      },
    });
  });
}

import { db } from "@/db";
import { courses, enrollments, studentChapterProgress, chapters, websiteMaterials } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import type { CourseMemory } from "./memory-layers";

export interface CourseMemoryInput {
  studentId: string;
  courseId: string;
}

export async function getCourseMemory(input: CourseMemoryInput): Promise<CourseMemory> {
  const { studentId, courseId } = input;

  const [courseRow, enrollmentRow, progressRow, materialRow] = await Promise.all([
    db.select({ id: courses.id, title: courses.title }).from(courses).where(eq(courses.id, courseId)).limit(1),
    db.select({ enrolledAt: enrollments.enrolledAt }).from(enrollments).where(and(eq(enrollments.userId, studentId), eq(enrollments.courseId, courseId))).limit(1),
    db.select({ chapterId: studentChapterProgress.chapterId, completed: studentChapterProgress.completed, updatedAt: studentChapterProgress.updatedAt })
      .from(studentChapterProgress)
      .where(and(eq(studentChapterProgress.studentId, studentId)))
      .orderBy(desc(studentChapterProgress.updatedAt))
      .limit(1),
    db.select({ id: websiteMaterials.id, chapterId: websiteMaterials.chapterId, title: websiteMaterials.title })
      .from(websiteMaterials)
      .where(eq(websiteMaterials.courseId, courseId))
      .orderBy(desc(websiteMaterials.updatedAt))
      .limit(1),
  ]);

  let activeChapterId: string | null = null;
  let activeChapterTitle: string | null = null;

  if (progressRow.length > 0 && !progressRow[0].completed) {
    activeChapterId = progressRow[0].chapterId;
    const [chapter] = await db.select({ title: chapters.title }).from(chapters).where(eq(chapters.id, activeChapterId)).limit(1);
    activeChapterTitle = chapter?.title ?? null;
  } else if (materialRow.length > 0) {
    activeChapterId = materialRow[0].chapterId;
    activeChapterTitle = materialRow[0].title;
  }

  return {
    courseId,
    courseTitle: courseRow[0]?.title ?? "Unknown Course",
    activeChapterId,
    activeChapterTitle,
    activeMaterialId: materialRow[0]?.id ?? null,
    enrolledAt: enrollmentRow[0]?.enrolledAt ?? null,
  };
}
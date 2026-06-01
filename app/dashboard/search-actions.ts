"use server";

import { headers } from "next/headers";
import { db } from "@/db";
import { enrollments } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, gt } from "drizzle-orm";
import { getSiteSearchDocuments } from "@/lib/site-search-index";
import type { SiteSearchDocument } from "@/lib/site-search-index";

export async function getStudentSearchDocuments(): Promise<SiteSearchDocument[]> {
  // Get all documents
  const allDocs = getSiteSearchDocuments();
  
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    const user = session?.user;

    if (!user?.id) {
      // If not logged in, return all documents (fallback)
      return allDocs;
    }

    // Get user's active enrollments from database
    const now = new Date();
    const activeEnrollments = await db
      .select({
        courseId: enrollments.courseId,
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, user.id),
          gt(enrollments.expiresAt, now)
        )
      );

    const enrolledCourseIds = new Set(activeEnrollments.map((ae) => ae.courseId));

    // Filter documents:
    // - Group "Halaman" is always included.
    // - Group "Topik & landing" is always included.
    // - Group "Course", "Materi", "Evaluasi" are only included if their courseId is in enrolledCourseIds!
    const filteredDocs = allDocs.filter((doc) => {
      if (doc.group === "Halaman" || doc.group === "Topik & landing") {
        return true;
      }

      // Extract courseId from doc.id (format: "course:courseId", "material:courseId:materialId", "exam:courseId:examId")
      const parts = doc.id.split(":");
      const docCourseId = parts[1];
      
      if (docCourseId) {
        return enrolledCourseIds.has(docCourseId);
      }

      return false;
    });

    return filteredDocs;
  } catch (error) {
    console.error("Error fetching student search documents, falling back to static:", error);
    return allDocs;
  }
}

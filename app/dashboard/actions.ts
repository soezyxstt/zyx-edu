"use server";

import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { enrollments, enrollmentTokens, progress, courses, submissions, groups, groupMembers, enrollmentTokenCourses, websiteMaterials } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, gt, lt } from "drizzle-orm";
import { recordLearningEvent } from "@/lib/learning-events";
import { inngest } from "@/lib/inngest";
import { getSemesterEndDate } from "@/lib/utils";

async function requireUser() {
  const h = await headers();
  const session = await auth.api.getSession({
    headers: h,
  });
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

/**
 * Get active enrollments for the logged in student
 */
export async function getStudentEnrollments() {
  const user = await requireUser();
  const now = new Date();

  return db
    .select({
      id: courses.id,
      title: courses.title,
      category: courses.category,
      description: courses.description,
      enrolledAt: enrollments.enrolledAt,
      expiresAt: enrollments.expiresAt,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(
      and(
        eq(enrollments.userId, user.id),
        gt(enrollments.expiresAt, now)
      )
    );
}

/**
 * Enroll in a course using a token
 */
export async function enrollWithToken(tokenStr: string) {
  const user = await requireUser();
  const cleanToken = tokenStr.trim();
  const now = new Date();

  if (!cleanToken) {
    return { success: false, error: "Token tidak boleh kosong" };
  }

  // 1. Find token in DB
  const tokenRecord = await db.query.enrollmentTokens.findFirst({
    where: eq(enrollmentTokens.token, cleanToken),
    with: {
      tokenCourses: true,
      group: {
        with: {
          members: true,
        },
      },
    },
  });

  if (!tokenRecord) {
    return { success: false, error: "Token tidak valid" };
  }

  // 2. Check if user is already a member of the group
  const isAlreadyMember = tokenRecord.group?.members.some(
    (m) => m.userId === user.id
  );
  if (isAlreadyMember) {
    return { success: false, error: "Anda sudah terdaftar menggunakan token ini" };
  }

  // 3. Check if group capacity is reached
  const currentMemberCount = tokenRecord.group?.members.length || 0;
  if (currentMemberCount >= tokenRecord.capacity) {
    return { success: false, error: "Token ini sudah mencapai batas kuota kelompok" };
  }

  // 4. Check if token itself is expired
  if (tokenRecord.expiresAt < now) {
    return { success: false, error: "Token sudah kedaluwarsa untuk semester ini" };
  }

  // 5. Get course IDs associated with this token
  const courseIds = tokenRecord.tokenCourses.map((tc) => tc.courseId);
  if (courseIds.length === 0) {
    return { success: false, error: "Token tidak memiliki course yang terasosiasi" };
  }

  // 6. Check if student is already enrolled in any of these courses active
  const activeEnrollments = await db.query.enrollments.findMany({
    where: and(
      eq(enrollments.userId, user.id),
      gt(enrollments.expiresAt, now)
    ),
  });

  const enrolledCourseIds = new Set(activeEnrollments.map((e) => e.courseId));
  const coursesToEnroll = courseIds.filter((cid) => !enrolledCourseIds.has(cid));

  if (coursesToEnroll.length === 0) {
    return { success: false, error: "Anda sudah terdaftar di semua course yang diaktifkan oleh token ini" };
  }

  // 7. Calculate enrollment semester closing date
  const expiresAt = getSemesterEndDate(now);

  try {
    await db.transaction(async (tx) => {
      // Add user to the group members
      await tx.insert(groupMembers).values({
        id: randomUUID(),
        groupId: tokenRecord.groupId,
        userId: user.id,
        joinedAt: now,
      });

      // Enroll in each course the user is not yet enrolled in
      for (const courseId of coursesToEnroll) {
        await tx.insert(enrollments).values({
          id: randomUUID(),
          userId: user.id,
          courseId,
          enrolledAt: now,
          expiresAt: expiresAt,
        });
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error("Failed to enroll via transaction:", err);
    return { success: false, error: "Terjadi kesalahan internal. Silakan coba lagi." };
  }
}

/**
 * Get progress records for a student
 */
export async function getMaterialsProgress() {
  const user = await requireUser();
  return db
    .select()
    .from(progress)
    .where(eq(progress.userId, user.id));
}

/**
 * Set progress status for a specific material
 */
export async function updateMaterialProgress(materialId: string, status: "in_progress" | "completed") {
  const user = await requireUser();
  const now = new Date();

  // Find if progress record already exists
  const existing = await db.query.progress.findFirst({
    where: and(
      eq(progress.userId, user.id),
      eq(progress.materialId, materialId)
    ),
  });

  if (existing) {
    // If it is already completed, do not revert to in_progress
    if (existing.status === "completed" && status === "in_progress") {
      return { success: true };
    }

    await db
      .update(progress)
      .set({
        status,
        completedAt: status === "completed" ? now : existing.completedAt,
      })
      .where(eq(progress.id, existing.id));
  } else {
    await db.insert(progress).values({
      id: randomUUID(),
      userId: user.id,
      materialId,
      status,
      completedAt: status === "completed" ? now : null,
    });
  }

  // Fire learning event on completion
  if (status === "completed") {
    const [mat] = await db
      .select({ courseId: websiteMaterials.courseId })
      .from(websiteMaterials)
      .where(eq(websiteMaterials.id, materialId))
      .limit(1);

    if (mat) {
      await Promise.all([
        recordLearningEvent({
          studentId: user.id,
          courseId: mat.courseId,
          eventType: "material_completed",
        }),
        inngest.send({
          name: "mastery/recompute.requested",
          data: { studentId: user.id, courseId: mat.courseId },
        }),
      ]);
    }
  }

  // Update user last activity
  const h = await headers();
  await auth.api.updateUser({
    headers: h,
    body: {
      lastActivityAt: now,
    }
  });

  return { success: true };
}

/**
 * Get exam submissions for a student
 */
export async function getStudentSubmissions() {
  const user = await requireUser();
  return db
    .select()
    .from(submissions)
    .where(eq(submissions.userId, user.id));
}

/**
 * Check if the student is actively enrolled in a specific course
 */
export async function checkEnrollment(courseId: string): Promise<boolean> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return false;
  }
  const now = new Date();
  const activeEnrollment = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.userId, user.id),
      eq(enrollments.courseId, courseId),
      gt(enrollments.expiresAt, now)
    ),
  });
  return !!activeEnrollment;
}

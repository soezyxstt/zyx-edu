"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { enrollmentTokens, courses, user } from "@/db/schema";
import { assertAdmin } from "@/lib/uploadthing-admin";
import { eq, desc } from "drizzle-orm";
import { getSemesterEndDate } from "@/lib/utils";

/**
 * Get all enrollment tokens for the admin panel
 */
export async function getEnrollmentTokens() {
  await assertAdmin();

  return db
    .select({
      id: enrollmentTokens.id,
      token: enrollmentTokens.token,
      courseId: enrollmentTokens.courseId,
      courseTitle: courses.title,
      createdAt: enrollmentTokens.createdAt,
      usedAt: enrollmentTokens.usedAt,
      usedByUserId: enrollmentTokens.usedByUserId,
      usedByUserName: user.name,
      usedByUserEmail: user.email,
      expiresAt: enrollmentTokens.expiresAt,
    })
    .from(enrollmentTokens)
    .innerJoin(courses, eq(enrollmentTokens.courseId, courses.id))
    .leftJoin(user, eq(enrollmentTokens.usedByUserId, user.id))
    .orderBy(desc(enrollmentTokens.createdAt));
}

/**
 * Generate a new one-time enrollment token for a course
 */
export async function generateEnrollmentToken(courseId: string) {
  await assertAdmin();

  // Verify course exists
  const courseRecord = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
  });

  if (!courseRecord) {
    return { success: false, error: "Course tidak ditemukan" };
  }

  // Calculate semester end date
  const expiresAt = getSemesterEndDate(new Date());

  // Generate a friendly token string: ZYX-[COURSE]-[8_CHARS_UUID]
  const coursePrefix = courseId.replace("-", "").toUpperCase().slice(0, 4);
  const randomSuffix = randomUUID().split("-")[0].toUpperCase();
  const token = `ZYX-${coursePrefix}-${randomSuffix}`;

  try {
    await db.insert(enrollmentTokens).values({
      id: randomUUID(),
      token,
      courseId,
      expiresAt,
    });

    revalidatePath("/admin/tokens");
    return { success: true, token };
  } catch (err: any) {
    console.error("Failed to generate enrollment token:", err);
    return { success: false, error: "Gagal membuat token" };
  }
}

/**
 * Delete / revoke a token
 */
export async function deleteEnrollmentToken(tokenId: string) {
  await assertAdmin();

  try {
    await db.delete(enrollmentTokens).where(eq(enrollmentTokens.id, tokenId));
    revalidatePath("/admin/tokens");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to delete token:", err);
    return { success: false, error: "Gagal menghapus token" };
  }
}

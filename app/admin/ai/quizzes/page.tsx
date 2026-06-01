import type { Metadata } from "next";
import { pageTitle } from "@/lib/site";
import { Reveal } from "@/components/ui/reveal";
import { db } from "@/db";
import { quizTemplates, courses } from "@/db/schema";
import { desc } from "drizzle-orm";
import { assertTutorOrAdmin } from "@/lib/uploadthing-admin";
import { QuizzesCurationClient } from "./quizzes-client";

export const metadata: Metadata = {
  title: pageTitle("Kelola Template Kuis"),
};

export default async function AIQuizzesPage() {
  await assertTutorOrAdmin();

  const [templates, allCourses] = await Promise.all([
    db
      .select()
      .from(quizTemplates)
      .orderBy(desc(quizTemplates.createdAt)),
    db.select({ id: courses.id, title: courses.title }).from(courses),
  ]);

  const courseMap = Object.fromEntries(allCourses.map((c) => [c.id, c.title]));

  return (
    <Reveal className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <QuizzesCurationClient
        initialTemplates={templates}
        courses={allCourses}
        courseMap={courseMap}
      />
    </Reveal>
  );
}

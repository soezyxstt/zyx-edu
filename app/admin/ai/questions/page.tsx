import type { Metadata } from "next";
import { pageTitle } from "@/lib/site";
import { Reveal } from "@/components/ui/reveal";
import { db } from "@/db";
import { aiQuestionBank, courses } from "@/db/schema";
import { desc } from "drizzle-orm";
import { assertTutorOrAdmin } from "@/lib/uploadthing-admin";
import { QuestionBankClient } from "./questions-client";

export const metadata: Metadata = {
  title: pageTitle("Bank Soal"),
};

export default async function AIQuestionsPage() {
  await assertTutorOrAdmin();

  const [questions, allCourses] = await Promise.all([
    db
      .select()
      .from(aiQuestionBank)
      .orderBy(desc(aiQuestionBank.createdAt))
      .limit(200),
    db.select({ id: courses.id, title: courses.title }).from(courses),
  ]);

  const courseMap = Object.fromEntries(allCourses.map((c) => [c.id, c.title]));

  return (
    <Reveal className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="font-heading text-h4 font-semibold text-foreground">Bank Soal</h1>
        <p className="mt-2 text-body-sm text-muted-foreground">
          Tinjau, edit, dan publikasikan soal yang dihasilkan sistem. Soal harus berstatus{" "}
          <strong>published</strong> sebelum dapat digunakan dalam kuis.
        </p>
      </div>
      <QuestionBankClient questions={questions} courses={allCourses} courseMap={courseMap} />
    </Reveal>
  );
}

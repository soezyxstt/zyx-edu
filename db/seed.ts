import { db } from "./index";
import { courses } from "./schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Seeding courses...");

  const defaultCourses = [
    {
      id: "calc-1",
      title: "Kalkulus 1",
      category: "TPB",
      description: "Limit, turunan, dan integral dasar dengan latihan terstruktur — materi, kuis cepat, dan tryout ujian.",
    },
    {
      id: "physics-1",
      title: "Fisika Dasar",
      category: "TPB",
      description: "Mekanika dan termodinamika pengantar untuk tahun pertama ITB.",
    },
    {
      id: "chem-1",
      title: "Kimia Dasar",
      category: "TPB",
      description: "Stoikiometri, ikatan, dan dasar termokimia.",
    },
  ];

  for (const c of defaultCourses) {
    const existing = await db.query.courses.findFirst({
      where: eq(courses.id, c.id),
    });

    if (!existing) {
      await db.insert(courses).values(c);
      console.log(`Course ${c.id} seeded.`);
    } else {
      console.log(`Course ${c.id} already exists.`);
    }
  }

  console.log("Seeding complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});

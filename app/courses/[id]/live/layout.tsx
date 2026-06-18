import type { Metadata } from "next";
import { getCourse } from "@/lib/course-utils";
import { pageTitle } from "@/lib/site";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const course = await getCourse(id);
  return {
    title: pageTitle(course ? `Kuis Langsung: ${course.title}` : "Kuis Langsung"),
    description: course
      ? `Ikuti kuis langsung ${course.title} bersama teman sekelas secara real-time.`
      : "Ikuti kuis langsung bersama teman sekelas secara real-time.",
  };
}

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import { MetadataRoute } from "next";
import { listCourses } from "@/lib/student-course-fixtures";

export default function sitemap(): MetadataRoute.Sitemap {
  // Check the environment variable for domain, with fallback
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "https://www.zyxacademy.com");

  // Core static/marketing paths
  const staticPaths = ["", "/about", "/plans", "/testimonial", "/courses"];

  const staticEntries = staticPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "" ? 1.0 : 0.8,
  }));

  // Dynamic courses catalog entries
  const courses = listCourses();
  const courseEntries = courses.map((course) => ({
    url: `${baseUrl}/courses/${course.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...courseEntries];
}

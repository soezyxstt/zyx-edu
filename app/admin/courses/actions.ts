"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { assertAdmin } from "@/lib/uploadthing-admin";
import { eq } from "drizzle-orm";

export async function getCourses() {
  await assertAdmin();
  return db.select().from(courses);
}

const allowedCategories = [
  "Matematika",
  "Fisika",
  "Astronomi",
  "Kimia",
  "Aktuaria",
  "Mikrobiologi",
  "Biologi",
  "Rekayasa Hayati",
  "Rekayasa Pertanian",
  "Rekayasa Kehutanan",
  "Teknologi Pasca Panen",
  "Sains dan Teknologi Farmasi",
  "Farmasi Klinik dan Komunitas",
  "Teknik Pertambangan",
  "Teknik Perminyakan",
  "Teknik Geofisika",
  "Teknik Metalurgi",
  "Teknik Geologi",
  "Meteorologi",
  "Oseanografi",
  "Teknik Geodesi dan Geomatika",
  "Teknik Kimia",
  "Teknik Fisika",
  "Teknik Industri",
  "Teknik Pangan",
  "Manajemen Rekayasa",
  "Teknik Bioenergi dan Kemurgi",
  "Teknik Industri (Kampus Cirebon)",
  "Teknik Elektro",
  "Teknik Informatika",
  "Teknik Tenaga Listrik",
  "Teknik Telekomunikasi",
  "Sistem dan Teknologi Informasi",
  "Teknik Biomedis",
  "Teknik Mesin",
  "Teknik Dirgantara",
  "Teknik Material",
  "Teknik Sipil",
  "Teknik Lingkungan",
  "Teknik Kelautan",
  "Rekayasa Infrastruktur Lingkungan",
  "Teknik dan Pengelolaan Sumber Daya Air",
  "Arsitektur",
  "Perencanaan Wilayah dan Kota",
  "Perencanaan Wilayah dan Kota (Kampus Cirebon)",
  "Seni Rupa",
  "Kriya (Kampus Cirebon)",
  "Kriya",
  "Desain Interior",
  "Desain Komunikasi Visual",
  "Desain Produk",
  "Manajemen",
  "Kewirausahaan",
  "TPB",
  "Rekayasa Umum",
] as const;

type Category = typeof allowedCategories[number];

export async function saveCourse(
  id: string,
  title: string,
  category: string,
  description: string | null,
  isNew: boolean
) {
  await assertAdmin();

  const cleanId = id.trim().toLowerCase();
  const cleanTitle = title.trim();
  const cleanCategory = category.trim();
  const cleanDesc = description?.trim() || null;

  if (!cleanId || !/^[a-z0-9-]+$/.test(cleanId)) {
    return { success: false, error: "ID Mata Kuliah harus alfanumerik huruf kecil dan strip (slug)" };
  }
  if (!cleanTitle) {
    return { success: false, error: "Nama mata kuliah tidak boleh kosong" };
  }
  if (!cleanCategory) {
    return { success: false, error: "Kategori tidak boleh kosong" };
  }
  if (!(allowedCategories as readonly string[]).includes(cleanCategory)) {
    return { success: false, error: "Kategori tidak valid. Pilih dari daftar yang tersedia." };
  }

  try {
    if (isNew) {
      const existing = await db.query.courses.findFirst({
        where: eq(courses.id, cleanId),
      });
      if (existing) {
        return { success: false, error: "ID Mata Kuliah sudah terdaftar" };
      }
      await db.insert(courses).values({
        id: cleanId,
        title: cleanTitle,
        category: cleanCategory as Category,
        description: cleanDesc,
      });
    } else {
      await db
        .update(courses)
        .set({
          title: cleanTitle,
          category: cleanCategory as Category,
          description: cleanDesc,
        })
        .where(eq(courses.id, cleanId));
    }

    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    revalidatePath(`/courses/${cleanId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to save course:", err);
    return { success: false, error: "Terjadi kesalahan saat menyimpan mata kuliah" };
  }
}

export async function deleteCourse(id: string) {
  await assertAdmin();

  try {
    await db.delete(courses).where(eq(courses.id, id));

    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    revalidatePath(`/courses/${id}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to delete course:", err);
    return { success: false, error: "Gagal menghapus mata kuliah. Pastikan tidak ada data terkait." };
  }
}

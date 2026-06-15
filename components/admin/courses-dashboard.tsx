"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveCourse, deleteCourse } from "@/app/admin/courses/actions";
import { Edit, Trash2, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

const CATEGORY_OPTIONS = [
  "TPB",
  "Rekayasa Umum",
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
] as const;

type Course = {
  id: string;
  title: string;
  category: string;
  description?: string | null;
};

type Props = {
  initialCourses: Course[];
};

export function CoursesDashboard({ initialCourses }: Props) {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [newCourse, setNewCourse] = useState<Partial<Course>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [editVals, setEditVals] = useState<Partial<Course>>({});
  const [loading, setLoading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.id || !newCourse.title || !newCourse.category) {
      toast.error("Semua field wajib diisi");
      return;
    }
    setLoading(true);
    const res = await saveCourse(
      newCourse.id,
      newCourse.title,
      newCourse.category,
      newCourse.description ?? null,
      true
    );
    setLoading(false);
    if (res.success) {
      toast.success("Mata kuliah berhasil ditambahkan");
      setNewCourse({});
      router.refresh();
    } else {
      toast.error(res.error ?? "Gagal menambahkan");
    }
  };

  const startEdit = (c: Course) => {
    setEditId(c.id);
    setEditVals({ title: c.title, category: c.category, description: c.description ?? "" });
  };

  const handleEditSave = async (id: string) => {
    if (!editVals.title || !editVals.category) {
      toast.error("Judul dan kategori wajib");
      return;
    }
    setLoading(true);
    const res = await saveCourse(
      id,
      editVals.title,
      editVals.category,
      editVals.description ?? null,
      false
    );
    setLoading(false);
    if (res.success) {
      toast.success("Mata kuliah diperbarui");
      setEditId(null);
      router.refresh();
    } else {
      toast.error(res.error ?? "Gagal memperbarui");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteId) return;
    setLoading(true);
    const res = await deleteCourse(pendingDeleteId);
    setLoading(false);
    setPendingDeleteId(null);
    if (res.success) {
      toast.success("Mata kuliah dihapus");
      router.refresh();
    } else {
      toast.error(res.error ?? "Gagal menghapus");
    }
  };

  return (
    <div className="space-y-8">
      {/* Add New Course Form */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-heading text-h5 font-semibold text-foreground mb-4">
          Tambah Mata Kuliah Baru
        </h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="ID (slug)"
            value={newCourse.id ?? ""}
            onChange={(e) => setNewCourse((prev) => ({ ...prev, id: e.target.value }))}
            disabled={loading}
          />
          <Input
            placeholder="Judul"
            value={newCourse.title ?? ""}
            onChange={(e) => setNewCourse((prev) => ({ ...prev, title: e.target.value }))}
            disabled={loading}
          />
          <Select
            value={newCourse.category ?? ""}
            onValueChange={(v) => setNewCourse((prev) => ({ ...prev, category: v }))}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Program Studi" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Deskripsi (opsional)"
            value={newCourse.description ?? ""}
            onChange={(e) => setNewCourse((prev) => ({ ...prev, description: e.target.value }))}
            disabled={loading}
          />
          <Button type="submit" disabled={loading} className="col-span-full md:col-span-1 self-end">
            {loading ? "Menyimpan…" : "Tambah"}
          </Button>
        </form>
      </div>

      {/* Existing Courses List */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm overflow-x-auto">
        <table className="w-full table-auto">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left text-body-sm font-medium">ID</th>
              <th className="px-4 py-2 text-left text-body-sm font-medium">Judul</th>
              <th className="px-4 py-2 text-left text-body-sm font-medium">Program Studi</th>
              <th className="px-4 py-2 text-left text-body-sm font-medium">Deskripsi</th>
              <th className="px-4 py-2 text-center text-body-sm font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id} className="border-b border-border/30">
                <td className="px-4 py-2 text-body-sm text-foreground">{c.id}</td>
                <td className="px-4 py-2">
                  {editId === c.id ? (
                    <Input
                      value={editVals.title ?? ""}
                      onChange={(e) => setEditVals((p) => ({ ...p, title: e.target.value }))}
                      disabled={loading}
                    />
                  ) : (
                    <span className="text-body-sm text-foreground">{c.title}</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {editId === c.id ? (
                    <Select
                      value={editVals.category ?? ""}
                      onValueChange={(v) => setEditVals((p) => ({ ...p, category: v }))}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Program Studi" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-body-sm text-foreground">{c.category}</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {editId === c.id ? (
                    <Input
                      value={editVals.description ?? ""}
                      onChange={(e) => setEditVals((p) => ({ ...p, description: e.target.value }))}
                      disabled={loading}
                    />
                  ) : (
                    <span className="text-body-sm text-muted-foreground">{c.description}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-center">
                  {editId === c.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEditSave(c.id)} disabled={loading}>
                        <Check className="size-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)} disabled={loading}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(c)} disabled={loading}>
                        <Edit className="size-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPendingDeleteId(c.id)} disabled={loading}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!pendingDeleteId} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Mata Kuliah</DialogTitle>
            <DialogDescription>
              Anda yakin ingin menghapus mata kuliah ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={loading}>
                Batal
              </Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={loading}>
              {loading ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Paket paket ditampilkan di /plans dan pratinjau landing. */

export type PlanTier = {
  name: string;
  price: string;
  note: string;
  features: readonly string[];
  highlighted?: boolean;
};

export const planTiers: readonly PlanTier[] = [
  {
    name: "Dasar",
    price: "Mulai dari IDR —",
    note: "Contoh ilustratif; harga final di konfirmasi admin.",
    features: [
      "Akses materi terpilih per semester",
      "Kuis & tryout dengan penilaian instan (objektif)",
      "Forum diskusi per course",
    ],
  },
  {
    name: "Plus",
    price: "Paket populer",
    note: "Untuk kamu yang ingin ritme mingguan tetap terjaga.",
    features: [
      "Lebih banyak course dalam satu paket",
      "Sesi konsultasi terjadwal (frekuensi menyesuaikan paket)",
      "Tracking progres dan ringkasan performa",
    ],
    highlighted: true,
  },
  {
    name: "Intensif",
    price: "Fokus ujian",
    note: "Persiapan ujian tengah/lengkap dengan latihan bertingkat.",
    features: [
      "Prioritas jadwal tryout",
      "Umpan balik esai oleh pengajar",
      "Rekomendasi perbaikan berbasis hasil latihan",
    ],
  },
];

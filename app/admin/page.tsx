import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import {
  courses,
  driveItem,
  enrollmentTokens,
  groupMembers,
  aiMaterialInstances,
  aiMaterialInstanceChunks,
  diktats,
  aiGenerationJobs,
  aiQuestionBank,
  quizTemplates,
  notifications,
  userPushTokens,
  aiUsageEvents,
  vectorSyncQueue,
} from "@/db/schema";
import { sql, eq, gte, ne } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { pageTitle } from "@/lib/site";
import {
  FolderOpen,
  KeyRound,
  BookText,
  Zap,
  ListChecks,
  ClipboardList,
  Archive,
  Bell,
  Activity,
  GraduationCap,
} from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: pageTitle("Admin"),
  description: "Panel admin Zyx Academy.",
};

export default async function AdminHomePage() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  const [
    courseCountRes,
    fileStatsRes,
    tokenStatsRes,
    materialStatsRes,
    diktatCountRes,
    jobStatsRes,
    questionStatsRes,
    quizCountRes,
    notificationStatsRes,
    opsStatsRes,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(courses),

    db
      .select({
        count: sql<number>`count(*)`,
        totalSize: sql<number>`coalesce(sum(${driveItem.sizeBytes}), 0)`,
      })
      .from(driveItem)
      .where(eq(driveItem.kind, "file")),

    Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(enrollmentTokens),
      db.select({ groupId: enrollmentTokens.groupId }).from(enrollmentTokens),
      db
        .select({
          groupId: groupMembers.groupId,
          joinedAt: groupMembers.joinedAt,
        })
        .from(groupMembers),
    ]),

    Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(aiMaterialInstances),
      db.select({ count: sql<number>`count(*)` }).from(aiMaterialInstanceChunks),
    ]),

    db.select({ count: sql<number>`count(*)` }).from(diktats),

    db.select({ status: aiGenerationJobs.status }).from(aiGenerationJobs),

    db.select({ reviewStatus: aiQuestionBank.reviewStatus }).from(aiQuestionBank),

    db.select({ count: sql<number>`count(*)` }).from(quizTemplates),

    Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(eq(notifications.type, "admin_broadcast")),
      db.select({ count: sql<number>`count(*)` }).from(userPushTokens),
    ]),

    Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(vectorSyncQueue)
        .where(ne(vectorSyncQueue.status, "completed")),
      db
        .select({ count: sql<number>`count(*)` })
        .from(aiUsageEvents)
        .where(gte(aiUsageEvents.createdAt, todayStart)),
    ]),
  ]);

  const totalCourses = courseCountRes[0]?.count ?? 0;
  const courseStat = `${totalCourses} mata kuliah aktif`;

  const totalFiles = fileStatsRes[0]?.count ?? 0;
  const totalFileSizeMB = ((fileStatsRes[0]?.totalSize ?? 0) / (1024 * 1024)).toFixed(1);
  const fileStat = `${totalFiles} file (${totalFileSizeMB} MB)`;

  const [tokensCountRes, tokensList, membersList] = tokenStatsRes;
  const totalTokens = tokensCountRes[0]?.count ?? 0;
  const tokenGroupIds = new Set(tokensList.map((t) => t.groupId));
  const tokenMembers = membersList.filter((m) => tokenGroupIds.has(m.groupId));
  const redeemedTodayCount = tokenMembers.filter(
    (m) => new Date(m.joinedAt).getTime() >= todayStartMs
  ).length;
  const tokenStat = `${totalTokens} issued, ${redeemedTodayCount} diklaim hari ini`;

  const totalMaterials = materialStatsRes[0][0]?.count ?? 0;
  const totalChunks = materialStatsRes[1][0]?.count ?? 0;
  const materialStat = `${totalMaterials} dokumen (${totalChunks} segmen)`;

  const totalDiktats = diktatCountRes[0]?.count ?? 0;
  const diktatStat = `${totalDiktats} diktat terbit`;

  const runningJobs = jobStatsRes.filter(
    (j) => j.status === "pending" || j.status === "processing"
  ).length;
  const failedJobs = jobStatsRes.filter((j) => j.status === "failed").length;
  const jobStat = `${runningJobs} running, ${failedJobs} failed`;

  const pendingQuestions = questionStatsRes.filter(
    (q) => q.reviewStatus === "generated"
  ).length;
  const questionStat = `${pendingQuestions} pending review`;

  const totalQuizzes = quizCountRes[0]?.count ?? 0;
  const quizStat = `${totalQuizzes} template aktif`;

  const totalBroadcasts = notificationStatsRes[0][0]?.count ?? 0;
  const totalDevices = notificationStatsRes[1][0]?.count ?? 0;
  const notifStat = `${totalBroadcasts} siaran, ${totalDevices} device`;

  const syncQueueDepth = opsStatsRes[0][0]?.count ?? 0;
  const aiRequestsToday = opsStatsRes[1][0]?.count ?? 0;
  const opsStat = `${syncQueueDepth} sync job, ${aiRequestsToday} req AI`;

  const categories = [
    {
      name: "Konten Kurikulum",
      items: [
        {
          title: "Mata Kuliah",
          description:
            "Kelola kurikulum, tambah kelas baru, dan edit info mata kuliah Zyx Academy.",
          icon: GraduationCap,
          iconColor: "text-brand-secondary",
          href: "/admin/courses",
          label: "Kelola mata kuliah",
          stat: courseStat,
        },
        {
          title: "File Storage",
          description:
            "Kelola file dan folder media pembelajaran dengan struktur bergaya Google Drive.",
          icon: FolderOpen,
          iconColor: "text-brand-primary",
          href: "/admin/files",
          label: "Buka pengelola file",
          stat: fileStat,
        },
        {
          title: "Materi AI",
          description:
            "Proses dan segmentasikan dokumen materi kuliah ke dalam basis pengetahuan AI.",
          icon: BookText,
          iconColor: "text-tertiary-1",
          href: "/admin/ai/materials",
          label: "Kelola materi AI",
          stat: materialStat,
        },
        {
          title: "Kompilasi Diktat",
          description:
            "Gabungkan materi bab dan objek pengetahuan menjadi buku ajar PDF siap unduh.",
          icon: Archive,
          iconColor: "text-brand-primary",
          href: "/admin/ai/diktats",
          label: "Buka kompilator diktat",
          stat: diktatStat,
        },
      ],
    },
    {
      name: "Evaluasi & Asesmen",
      items: [
        {
          title: "Generasi Soal",
          description:
            "Jalankan pipeline generasi soal otomatis berbasis LLM dan pantau status job.",
          icon: Zap,
          iconColor: "text-status-warning",
          href: "/admin/ai/jobs",
          label: "Lihat job generasi",
          stat: jobStat,
        },
        {
          title: "Bank Soal",
          description:
            "Tinjau, edit, setujui, dan publikasikan soal latihan hasil generasi AI.",
          icon: ListChecks,
          iconColor: "text-status-success",
          href: "/admin/ai/questions",
          label: "Buka bank soal",
          stat: questionStat,
        },
        {
          title: "Template Kuis",
          description:
            "Buat template kuis baru dengan aturan seleksi materi dan tingkat kesulitan.",
          icon: ClipboardList,
          iconColor: "text-brand-primary",
          href: "/admin/ai/quizzes",
          label: "Kelola kuis",
          stat: quizStat,
        },
      ],
    },
    {
      name: "Akses & Keanggotaan",
      items: [
        {
          title: "Token Aktivasi Kelas",
          description:
            "Buat dan distribusikan token pendaftaran semester sekali pakai untuk mahasiswa.",
          icon: KeyRound,
          iconColor: "text-brand-secondary",
          href: "/admin/tokens",
          label: "Kelola token",
          stat: tokenStat,
        },
      ],
    },
    {
      name: "Sistem & Operasional",
      items: [
        {
          title: "Push Notification",
          description:
            "Kirim pesan siaran notifikasi push ke seluruh siswa atau kelas tertentu.",
          icon: Bell,
          iconColor: "text-tertiary-3",
          href: "/admin/notifications",
          label: "Kelola notifikasi",
          stat: notifStat,
        },
        {
          title: "Key Diagnostics",
          description:
            "Lihat status, kuota RPD, dan kesehatan tiap API key AI secara real-time.",
          icon: KeyRound,
          iconColor: "text-tertiary-1",
          href: "/admin/ai/keys",
          label: "Lihat key diagnostics",
          stat: null,
        },
        {
          title: "Ops",
          description:
            "Pantau penggunaan API harian, kuota KV write, serta performa sistem AI.",
          icon: Activity,
          iconColor: "text-status-success",
          href: "/admin/ops",
          label: "Buka monitor ops",
          stat: opsStat,
        },
      ],
    },
  ];

  return (
    <Reveal className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-heading text-h4 font-bold text-foreground">
        Admin Panel
      </h1>
      <p className="mt-2 text-body-md text-muted-foreground">
        Statistik operasional langsung dan pengaturan situs Zyx Academy.
      </p>

      {failedJobs > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-status-error/20 bg-status-error/5 p-4 text-body-sm text-status-error">
          <Zap className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Perhatian: Generasi Soal Gagal</p>
            <p className="text-muted-foreground mt-0.5">
              Terdapat {failedJobs} pipeline generasi soal yang gagal. Silakan
              tinjau status di menu Generasi Soal.
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 space-y-12">
        {categories.map((category) => (
          <div key={category.name} className="space-y-4">
            <h2 className="font-heading text-h5 font-bold text-foreground border-b border-border/60 pb-2">
              {category.name}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {category.items.map((item) => (
                <div
                  key={item.href}
                  className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow duration-200"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-heading text-h6 font-semibold text-foreground flex items-center gap-2">
                        <item.icon
                          className={`size-5 ${item.iconColor}`}
                          aria-hidden
                        />
                        {item.title}
                      </h3>
                      <span className="text-body-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                        {item.stat}
                      </span>
                    </div>
                    <p className="text-body-sm text-muted-foreground mt-3 leading-relaxed line-clamp-2 min-h-[2.5rem]">
                      {item.description}
                    </p>
                  </div>
                  <Button
                    className="mt-6 gap-2 w-fit rounded-lg"
                    variant="outline"
                    asChild
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

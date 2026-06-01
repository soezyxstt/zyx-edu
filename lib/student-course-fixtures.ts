/**
 * Mock course domain for student UI until APIs + Drizzle back these routes.
 * Replace with TanStack Query + fetch when ready.
 */

export type MaterialKind = "article" | "pdf" | "image" | "video" | "link";
export type DocCategory = "materi" | "soal" | "solusi" | "diktat";

export type CourseMaterial = {
  id: string;
  courseId: string;
  title: string;
  kind: MaterialKind;
  docCategory?: DocCategory;
  fileSize?: string;
  /** Article: plain text / markdown-ish paragraphs separated by \n\n */
  body?: string;
  /** pdf | image | video | link */
  url?: string;
  /** Mock: completed by demo student */
  completed: boolean;
  isPastYear?: boolean;
  isPreview?: boolean;
};

export type ExamType = "quiz" | "tryout";
export type ExamStatus = "draft" | "published" | "ended";


export type QuestionType =
  | "short_answer"
  | "multiple_choice"
  | "multiple_choices"
  | "essay";

export type QuestionSpec =
  | {
      id: string;
      order: number;
      type: "short_answer";
      prompt: string;
      acceptsImage?: boolean;
      /** For auto-grade mock */
      acceptableAnswers?: string[];
    }
  | {
      id: string;
      order: number;
      type: "multiple_choice";
      prompt: string;
      options: string[];
      correctIndex: number;
    }
  | {
      id: string;
      order: number;
      type: "multiple_choices";
      prompt: string;
      options: string[];
      correctIndices: number[];
    }
  | {
      id: string;
      order: number;
      type: "essay";
      prompt: string;
      acceptsFile?: boolean;
    };

export type ExamFixture = {
  id: string;
  courseId: string;
  title: string;
  type: ExamType;
  status: ExamStatus;
  isFree?: boolean;
  /** Mirrors jsonb settings on exams */
  settings?: {
    maxAttempts?: number;
    timeLimitMinutes?: number;
    oneTimeOnly?: boolean;
  };
  questions: QuestionSpec[];
  isPastYear?: boolean;
  isPreview?: boolean;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  quizAvgPercent: number;
  tryoutAvgPercent: number;
};

export type SubmissionListItem = {
  id: string;
  courseId: string;
  examId: string;
  examTitle: string;
  examType: ExamType;
  status: "completed" | "pending_review" | "graded" | "late";
  score: number | null;
  submittedAt: string;
};

export type ReviewItem = {
  questionId: string;
  prompt: string;
  questionType: QuestionType;
  userAnswer: string;
  correct: boolean | null;
  correctAnswerLabel?: string;
  teacherNote?: string | null;
  explanationText?: string;
  explanationImage?: string;
  explanationVideoUrl?: string;
  explanationVideoKind?: "youtube" | "r2";
};

export type SubmissionReviewFixture = {
  id: string;
  courseId: string;
  examId: string;
  examTitle: string;
  examType: ExamType;
  items: ReviewItem[];
};

export type StudentCourse = {
  id: string;
  title: string;
  category: string;
  description: string;
};

export const LEADERBOARD_SCORE_HINT =
  "Skor papan peringkat = rata-rata % semua kuis + (rata-rata % tryout × 2).";

const courses: StudentCourse[] = [
  {
    id: "calc-1",
    title: "Kalkulus 1",
    category: "TPB",
    description:
      "Limit, turunan, dan integral dasar dengan latihan terstruktur - materi, kuis cepat, dan tryout ujian.",
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

const materials: CourseMaterial[] = [
  {
    id: "m-calc-limit-slide",
    courseId: "calc-1",
    title: "Materi Slide: Limit & Kekontinuan Fungsi",
    kind: "pdf",
    docCategory: "materi",
    fileSize: "2.8 MB",
    completed: true,
    isPastYear: false,
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    id: "m-calc-uts-2024",
    courseId: "calc-1",
    title: "Soal Ujian: UTS Kalkulus I ITB 2024",
    kind: "pdf",
    docCategory: "soal",
    fileSize: "1.2 MB",
    completed: false,
    isPastYear: true,
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    id: "m-calc-sol-2024",
    courseId: "calc-1",
    title: "Solusi Soal: Solusi UTS Kalkulus I ITB 2024",
    kind: "pdf",
    docCategory: "solusi",
    fileSize: "3.5 MB",
    completed: false,
    isPastYear: true,
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    id: "m-calc-diktat",
    courseId: "calc-1",
    title: "Diktat: Diktat Kalkulus I ITB Lengkap",
    kind: "pdf",
    docCategory: "diktat",
    fileSize: "12.4 MB",
    completed: false,
    isPastYear: false,
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    id: "m-calc-intro",
    courseId: "calc-1",
    title: "Pengantar limit (Artikel)",
    kind: "article",
    docCategory: "materi",
    fileSize: "12 KB",
    completed: true,
    isPastYear: true,
    body:
      "Limit menggambarkan perilaku fungsi saat input mendekati suatu nilai.\n\n" +
      "Intuisi: bayangkan mendekati titik di grafik tanpa harus menyentuhnya.\n\n" +
      "Di pertemuan berikutnya kita akan membahas limit sepihak dan kontinuitas.",
  },
  {
    id: "m-calc-pdf",
    courseId: "calc-1",
    title: "Ringkasan rumus turunan",
    kind: "pdf",
    docCategory: "materi",
    fileSize: "1.1 MB",
    completed: false,
    isPastYear: true,
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    id: "m-calc-img",
    courseId: "calc-1",
    title: "Grafik fungsi rasional (contoh)",
    kind: "image",
    docCategory: "materi",
    fileSize: "680 KB",
    completed: false,
    url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&q=80",
  },
  {
    id: "m-calc-vid",
    courseId: "calc-1",
    title: "Video: limit intuitif",
    kind: "video",
    docCategory: "materi",
    fileSize: "45 MB",
    completed: false,
    url: "https://www.youtube.com/watch?v=riXcqc2dfmU",
  },
  {
    id: "m-calc-link",
    courseId: "calc-1",
    title: "Latihan tambahan (GeoGebra)",
    kind: "link",
    docCategory: "materi",
    fileSize: "Online",
    completed: false,
    url: "https://www.geogebra.org/classic",
  },
  {
    id: "m-phy-intro",
    courseId: "physics-1",
    title: "Besaran dan satuan",
    kind: "article",
    docCategory: "materi",
    fileSize: "8 KB",
    completed: false,
    isPastYear: true,
    body: "Besaran fisis dinyatakan dengan angka dan satuan. Sistem SI menjadi acuan utama di kuliah ini.",
  },
];

const exams: ExamFixture[] = [
  {
    id: "quiz-calc-w1",
    courseId: "calc-1",
    title: "Kuis Mingguan 1 - Limit & Fungsi",
    type: "quiz",
    status: "published",
    isFree: true,
    isPreview: true,
    settings: { maxAttempts: 3, timeLimitMinutes: 15 },
    questions: [
      {
        id: "q1",
        order: 1,
        type: "multiple_choice",
        prompt: "Limit konstanta $k$ saat $x$ mendekati $a$ sama dengan...",
        options: ["$0$", "$k$", "$a$", "tidak terdefinisi"],
        correctIndex: 1,
      },
      {
        id: "q2",
        order: 2,
        type: "multiple_choice",
        prompt: "Berapa nilai $\\lim_{x \\to 3} \\frac{x^2 - 9}{x - 3}$?",
        options: ["$0$", "$3$", "$6$", "$9$"],
        correctIndex: 2,
      },
      {
        id: "q3",
        order: 3,
        type: "multiple_choice",
        prompt: "Limit $\\frac{\\sin x}{x}$ saat $x$ mendekati $0$ bernilai...",
        options: ["$0$", "$1$", "tak hingga", "tidak ada"],
        correctIndex: 1,
      },
      {
        id: "q4",
        order: 4,
        type: "multiple_choice",
        prompt: "Fungsi $f(x)$ dikatakan kontinu di $c$ jika...",
        options: [
          "$f(c)$ ada dan $\\lim_{x \\to c} f(x)$ ada",
          "$\\lim_{x \\to c} f(x) = f(c)$",
          "$f(c)$ ada, $\\lim_{x \\to c} f(x)$ ada, dan $\\lim_{x \\to c} f(x) = f(c)$",
          "Turunannya ada",
        ],
        correctIndex: 2,
      },
      {
        id: "q5",
        order: 5,
        type: "multiple_choice",
        prompt: "Limit $x$ ke tak hingga dari $\\frac{1}{x}$ adalah...",
        options: ["$0$", "$1$", "tak hingga", "minus tak hingga"],
        correctIndex: 0,
      },
      {
        id: "q6",
        order: 6,
        type: "multiple_choice",
        prompt: "Turunan pertama $f(x) = \\cos x$ adalah...",
        options: ["$\\sin x$", "$-\\sin x$", "$-\\cos x$", "$\\tan x$"],
        correctIndex: 1,
      },
      {
        id: "q7",
        order: 7,
        type: "multiple_choice",
        prompt: "Jika limit kiri berbeda dengan limit kanan pada suatu titik, maka...",
        options: [
          "Limit pada titik tersebut tidak ada",
          "Limit pada titik tersebut adalah rata-ratanya",
          "Fungsi tetap kontinu",
          "Nilai fungsi adalah nol",
        ],
        correctIndex: 0,
      },
      {
        id: "q8",
        order: 8,
        type: "multiple_choice",
        prompt: "Nilai $\\lim_{x \\to 0} \\frac{1 - \\cos x}{x}$ adalah...",
        options: ["$0$", "$1$", "$\\frac{1}{2}$", "tidak ada"],
        correctIndex: 0,
      },
      {
        id: "q9",
        order: 9,
        type: "multiple_choice",
        prompt: "Fungsi $f(x) = |x|$ tidak memiliki turunan di...",
        options: ["$x = 1$", "$x = -1$", "$x = 0$", "semua titik"],
        correctIndex: 2,
      },
      {
        id: "q10",
        order: 10,
        type: "multiple_choice",
        prompt: "Limit $x$ ke $2$ dari $x^3 - 4x$ adalah...",
        options: ["$0$", "$2$", "$4$", "$8$"],
        correctIndex: 0,
      },
    ],
  },
  {
    id: "tryout-calc-mid",
    courseId: "calc-1",
    title: "Tryout UTS - Kalkulus 1",
    type: "tryout",
    status: "published",
    isFree: false,
    settings: { maxAttempts: 2, timeLimitMinutes: 90 },
    questions: [
      {
        id: "t1",
        order: 1,
        type: "multiple_choice",
        prompt: "Turunan pertama $x^2$ di $x = 3$ adalah...",
        options: ["$3$", "$6$", "$9$", "$2x$"],
        correctIndex: 1,
      },
      {
        id: "t2",
        order: 2,
        type: "short_answer",
        prompt: "Berapakah nilai $$\\lim_{x \\to \\infty} \\frac{2x^2 + 5x}{x^2 - x}$$?",
        acceptsImage: false,
        acceptableAnswers: ["2"],
      },
      {
        id: "t3",
        order: 3,
        type: "multiple_choices",
        prompt: "Manakah dari pernyataan berikut yang BENAR mengenai turunan? (Pilih lebih dari satu jika ada)",
        options: [
          "Jika fungsi $f$ diferensial di $c$, maka $f$ kontinu di $c$.",
          "Jika fungsi $f$ kontinu di $c$, maka $f$ diferensial di $c$.",
          "Turunan dari fungsi konstan adalah nol.",
          "Turunan dari $e^{2x}$ adalah $e^{2x}$.",
        ],
        correctIndices: [0, 2],
      },
      {
        id: "t4",
        order: 4,
        type: "essay",
        prompt: "Jelaskan hubungan antara turunan dan kemiringan garis singgung (minimal 3 kalimat). Anda diperbolehkan mengunggah file pendukung pengerjaan coret-coretan.",
        acceptsFile: true,
      },
    ],
  },
  {
    id: "quiz-phy-w1",
    courseId: "physics-1",
    title: "Kuis Vektor",
    type: "quiz",
    status: "published",
    isFree: false,
    settings: { timeLimitMinutes: 10, maxAttempts: 1 },
    questions: [
      {
        id: "p1",
        order: 1,
        type: "multiple_choice",
        prompt: "Besaran vektor memiliki …",
        options: ["hanya besar", "besar dan arah", "hanya arah", "satuan saja"],
        correctIndex: 1,
      },
    ],
  },
];

const leaderboardByCourse: Record<string, LeaderboardEntry[]> = {
  "calc-1": [
    {
      rank: 1,
      userId: "u-demo",
      displayName: "Kamu (demo)",
      score: 94,
      quizAvgPercent: 88,
      tryoutAvgPercent: 92,
    },
    {
      rank: 2,
      userId: "u2",
      displayName: "Raka P.",
      score: 91,
      quizAvgPercent: 90,
      tryoutAvgPercent: 88,
    },
    {
      rank: 3,
      userId: "u3",
      displayName: "Mira S.",
      score: 87,
      quizAvgPercent: 85,
      tryoutAvgPercent: 84,
    },
  ],
  "physics-1": [
    {
      rank: 1,
      userId: "u-demo",
      displayName: "Kamu (demo)",
      score: 82,
      quizAvgPercent: 82,
      tryoutAvgPercent: 0,
    },
  ],
  "chem-1": [],
};

const submissionList: SubmissionListItem[] = [
  {
    id: "sub-calc-quiz-1",
    courseId: "calc-1",
    examId: "quiz-calc-w1",
    examTitle: "Kuis Mingguan 1 - Limit & Fungsi",
    examType: "quiz",
    status: "graded",
    score: 85,
    submittedAt: "2026-04-18T10:30:00.000Z",
  },
  {
    id: "sub-calc-tryout-1",
    courseId: "calc-1",
    examId: "tryout-calc-mid",
    examTitle: "Tryout UTS - Kalkulus 1",
    examType: "tryout",
    status: "pending_review",
    score: null,
    submittedAt: "2026-04-19T14:00:00.000Z",
  },
  {
    id: "sub-phy-1",
    courseId: "physics-1",
    examId: "quiz-phy-w1",
    examTitle: "Kuis Vektor",
    examType: "quiz",
    status: "graded",
    score: 100,
    submittedAt: "2026-04-17T09:00:00.000Z",
  },
];

const submissionReviews: SubmissionReviewFixture[] = [
  {
    id: "sub-calc-quiz-1",
    courseId: "calc-1",
    examId: "quiz-calc-w1",
    examTitle: "Kuis Mingguan 1 - Limit & Fungsi",
    examType: "quiz",
    items: [
      {
        questionId: "q1",
        prompt: "Limit konstanta $k$ saat $x$ mendekati $a$ sama dengan...",
        questionType: "multiple_choice",
        userAnswer: "$k$",
        correct: true,
        correctAnswerLabel: "$k$",
        explanationText: "Berdasarkan teorema limit utama, $$\\lim_{x \\to a} k = k$$ untuk konstanta $k$.",
      },
    ],
  },
  {
    id: "sub-calc-tryout-1",
    courseId: "calc-1",
    examId: "tryout-calc-mid",
    examTitle: "Tryout UTS - Kalkulus 1",
    examType: "tryout",
    items: [
      {
        questionId: "t1",
        prompt: "Turunan pertama $x^2$ di $x = 3$ adalah...",
        questionType: "multiple_choice",
        userAnswer: "$6$",
        correct: true,
        correctAnswerLabel: "$6$",
        explanationText: "Menggunakan rumus turunan fungsi pangkat: jika $f(x)=x^n$, maka $f'(x)=nx^{n-1}$. Turunan dari $x^2$ adalah $2x$, sehingga $f'(3)=2\\cdot3=6$.",
        explanationImage: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&q=80",
        explanationVideoUrl: "https://www.youtube.com/watch?v=riXcqc2dfmU",
        explanationVideoKind: "youtube",
      },
      {
        questionId: "t2",
        prompt: "Berapakah nilai $$\\lim_{x \\to \\infty} \\frac{2x^2 + 5x}{x^2 - x}$$?",
        questionType: "short_answer",
        userAnswer: "2",
        correct: true,
        correctAnswerLabel: "2",
        explanationText: "Untuk menentukan limit $x \\to \\infty$ dari fungsi rasional, bagi pembilang dan penyebut dengan $x^2$: $$\\frac{2x^2+5x}{x^2-x}=\\frac{2+\\frac{5}{x}}{1-\\frac{1}{x}} \\to \\frac{2+0}{1-0}=2.$$",
        explanationVideoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        explanationVideoKind: "r2",
      },
      {
        questionId: "t3",
        prompt: "Manakah dari pernyataan berikut yang BENAR mengenai turunan? (Pilih lebih dari satu jika ada)",
        questionType: "multiple_choices",
        userAnswer: "Jika fungsi $f$ diferensial di $c$, maka $f$ kontinu di $c$.; Turunan dari fungsi konstan adalah nol.",
        correct: true,
        correctAnswerLabel: "Pernyataan 1 & Pernyataan 3",
        explanationText: "1. Hubungan diferensial-kontinu: jika fungsi mempunyai turunan di titik $c$, maka ia kontinu di $c$; kebalikannya belum tentu benar, misal $f(x)=|x|$ kontinu di $0$ tapi tidak punya turunan di $0$. 3. Turunan konstanta: jika $f(x)=C$, maka $f'(x)=0$. 4. Turunan $e^{2x}$ seharusnya $2e^{2x}$, bukan $e^{2x}$.",
      },
      {
        questionId: "t4",
        prompt: "Jelaskan hubungan antara turunan dan kemiringan garis singgung (minimal 3 kalimat). Anda diperbolehkan mengunggah file pendukung pengerjaan coret-coretan.",
        questionType: "essay",
        userAnswer: "Turunan di suatu titik memberikan kemiringan garis singgung kurva di titik tersebut. Kemiringan garis singgung diperoleh dari limit kemiringan garis potong secan ketika jarak kedua titik mendekati nol. Jadi turunan pertama secara geometris merepresentasikan gradien garis singgung kurva $f(x)$ di titik $(c, f(c))$.",
        correct: null,
        teacherNote: "Penjelasan secara geometris sudah tepat dan mencakup limit garis secan. Bagus!",
        explanationText: "Secara geometris, turunan pertama dari fungsi $f$ di titik $c$ menyatakan gradien garis singgung kurva. Hubungan ini dirumuskan sebagai $$m=f'(c)=\\lim_{h \\to 0}\\frac{f(c+h)-f(c)}{h},$$ yaitu limit kemiringan garis secan.",
        explanationImage: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&q=80",
      },
    ],
  },
  {
    id: "sub-phy-1",
    courseId: "physics-1",
    examId: "quiz-phy-w1",
    examTitle: "Kuis Vektor",
    examType: "quiz",
    items: [
      {
        questionId: "p1",
        prompt: "Besaran vektor memiliki …",
        questionType: "multiple_choice",
        userAnswer: "besar dan arah",
        correct: true,
        correctAnswerLabel: "besar dan arah",
        explanationText: "Besaran fisika dikelompokkan menjadi skalar (hanya memiliki nilai/besar saja, misal massa, waktu) dan vektor (memiliki besar dan arah, misal gaya, kecepatan, perpindahan).",
      },
    ],
  },
];

export function listCourses(): StudentCourse[] {
  return courses;
}

export function getCourseById(id: string): StudentCourse | undefined {
  return courses.find((c) => c.id === id);
}

export function getMaterialsForCourse(courseId: string): CourseMaterial[] {
  return materials.filter((m) => m.courseId === courseId);
}

export function getMaterial(courseId: string, materialId: string): CourseMaterial | undefined {
  return materials.find((m) => m.courseId === courseId && m.id === materialId);
}

export function getExamsForCourse(courseId: string, type: ExamType): ExamFixture[] {
  return exams.filter((e) => e.courseId === courseId && e.type === type);
}

export function getExamById(
  courseId: string,
  examId: string,
): ExamFixture | undefined {
  return exams.find((e) => e.courseId === courseId && e.id === examId);
}

export function getLeaderboard(courseId: string): LeaderboardEntry[] {
  return leaderboardByCourse[courseId] ?? [];
}

export function getSubmissionsForCourse(courseId: string): SubmissionListItem[] {
  return submissionList.filter((s) => s.courseId === courseId);
}

export function getSubmissionListItem(
  courseId: string,
  submissionId: string,
): SubmissionListItem | undefined {
  return submissionList.find((s) => s.courseId === courseId && s.id === submissionId);
}

export function getSubmissionReview(
  courseId: string,
  submissionId: string,
): SubmissionReviewFixture | undefined {
  return submissionReviews.find((r) => r.courseId === courseId && r.id === submissionId);
}

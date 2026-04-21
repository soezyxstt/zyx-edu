/**
 * Mock course domain for student UI until APIs + Drizzle back these routes.
 * Replace with TanStack Query + fetch when ready.
 */

export type MaterialKind = "article" | "pdf" | "image" | "video" | "link";

export type CourseMaterial = {
  id: string;
  courseId: string;
  title: string;
  kind: MaterialKind;
  /** Article: plain text / markdown-ish paragraphs separated by \n\n */
  body?: string;
  /** pdf | image | video | link */
  url?: string;
  /** Mock: completed by demo student */
  completed: boolean;
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
  /** Mirrors jsonb settings on exams */
  settings?: {
    maxAttempts?: number;
    timeLimitMinutes?: number;
    oneTimeOnly?: boolean;
  };
  questions: QuestionSpec[];
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
      "Limit, turunan, dan integral dasar dengan latihan terstruktur — materi, kuis cepat, dan tryout ujian.",
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
    id: "m-calc-intro",
    courseId: "calc-1",
    title: "Pengantar limit",
    kind: "article",
    completed: true,
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
    completed: false,
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    id: "m-calc-img",
    courseId: "calc-1",
    title: "Grafik fungsi rasional (contoh)",
    kind: "image",
    completed: false,
    url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&q=80",
  },
  {
    id: "m-calc-vid",
    courseId: "calc-1",
    title: "Video: limit intuitif",
    kind: "video",
    completed: false,
    url: "https://www.youtube.com/watch?v=riXcqc2dfmU",
  },
  {
    id: "m-calc-link",
    courseId: "calc-1",
    title: "Latihan tambahan (GeoGebra)",
    kind: "link",
    completed: false,
    url: "https://www.geogebra.org/classic",
  },
  {
    id: "m-phy-intro",
    courseId: "physics-1",
    title: "Besaran dan satuan",
    kind: "article",
    completed: false,
    body: "Besaran fisis dinyatakan dengan angka dan satuan. Sistem SI menjadi acuan utama di kuliah ini.",
  },
];

const exams: ExamFixture[] = [
  {
    id: "quiz-calc-w1",
    courseId: "calc-1",
    title: "Kuis Minggu 1 — Limit",
    type: "quiz",
    status: "published",
    settings: { maxAttempts: 3, timeLimitMinutes: 15 },
    questions: [
      {
        id: "q1",
        order: 1,
        type: "short_answer",
        prompt: "Apa definisi informal limit f(x) saat x mendekati c?",
        acceptableAnswers: ["pendekatan nilai", "nilai yang didekati", "l nilai"],
      },
      {
        id: "q2",
        order: 2,
        type: "multiple_choice",
        prompt: "Limit konstanta k saat x → a sama dengan …",
        options: ["0", "k", "a", "tidak terdefinisi"],
        correctIndex: 1,
      },
      {
        id: "q3",
        order: 3,
        type: "multiple_choices",
        prompt: "Mana yang benar tentang limit? (pilih semua yang benar)",
        options: [
          "Limit bisa tidak ada meski f(a) terdefinisi",
          "Jika limit ada, f(a) harus sama dengan limit",
          "Limit sepihak bisa berbeda",
        ],
        correctIndices: [0, 2],
      },
      {
        id: "q4",
        order: 4,
        type: "short_answer",
        prompt: "Unggah screenshot langkah (opsional)",
        acceptsImage: true,
        acceptableAnswers: [],
      },
    ],
  },
  {
    id: "tryout-calc-mid",
    courseId: "calc-1",
    title: "Tryout UTS — Kalkulus 1",
    type: "tryout",
    status: "published",
    settings: { maxAttempts: 1, timeLimitMinutes: 90 },
    questions: [
      {
        id: "t1",
        order: 1,
        type: "multiple_choice",
        prompt: "Turunan pertama x² di x = 3 adalah …",
        options: ["3", "6", "9", "2x"],
        correctIndex: 1,
      },
      {
        id: "t2",
        order: 2,
        type: "essay",
        prompt: "Jelaskan hubungan antara turunan dan kemiringan garis singgung (minimal 3 kalimat).",
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
    settings: { timeLimitMinutes: 10 },
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
    examTitle: "Kuis Minggu 1 — Limit",
    examType: "quiz",
    status: "graded",
    score: 85,
    submittedAt: "2026-04-18T10:30:00.000Z",
  },
  {
    id: "sub-calc-tryout-1",
    courseId: "calc-1",
    examId: "tryout-calc-mid",
    examTitle: "Tryout UTS — Kalkulus 1",
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
    examTitle: "Kuis Minggu 1 — Limit",
    examType: "quiz",
    items: [
      {
        questionId: "q1",
        prompt: "Apa definisi informal limit f(x) saat x mendekati c?",
        questionType: "short_answer",
        userAnswer: "Nilai yang didekati fungsi saat x mendekati c.",
        correct: true,
        correctAnswerLabel: "Pendekatan nilai fungsi saat x → c",
      },
      {
        questionId: "q2",
        prompt: "Limit konstanta k saat x → a sama dengan …",
        questionType: "multiple_choice",
        userAnswer: "k",
        correct: true,
        correctAnswerLabel: "k",
      },
      {
        questionId: "q3",
        prompt: "Mana yang benar tentang limit? (pilih semua yang benar)",
        questionType: "multiple_choices",
        userAnswer: "Limit bisa tidak ada meski f(a) terdefinisi; Limit sepihak bisa berbeda",
        correct: true,
        correctAnswerLabel: "Pilihan 1 dan 3",
      },
      {
        questionId: "q4",
        prompt: "Unggah screenshot langkah (opsional)",
        questionType: "short_answer",
        userAnswer: "(tidak diunggah)",
        correct: true,
        correctAnswerLabel: "Opsional",
      },
    ],
  },
  {
    id: "sub-calc-tryout-1",
    courseId: "calc-1",
    examId: "tryout-calc-mid",
    examTitle: "Tryout UTS — Kalkulus 1",
    examType: "tryout",
    items: [
      {
        questionId: "t1",
        prompt: "Turunan pertama x² di x = 3 adalah …",
        questionType: "multiple_choice",
        userAnswer: "6",
        correct: true,
        correctAnswerLabel: "6",
      },
      {
        questionId: "t2",
        prompt:
          "Jelaskan hubungan antara turunan dan kemiringan garis singgung (minimal 3 kalimat).",
        questionType: "essay",
        userAnswer:
          "Turunan di suatu titik memberikan kemiringan garis singgung kurva di titik tersebut...",
        correct: null,
        teacherNote: null,
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

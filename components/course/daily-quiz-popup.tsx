"use client";

import { useEffect, useState } from "react";
import { Sparkles, CheckCircle2, XCircle, Award, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TriviaQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

const TRIVIA_DATA: Record<string, TriviaQuestion> = {
  "calc-1": {
    question: "Siapakah ilmuwan Jerman yang dianggap sebagai penemu kalkulus modern bersama dengan Isaac Newton?",
    options: ["Albert Einstein", "Gottfried Wilhelm Leibniz", "René Descartes", "Galileo Galilei"],
    correctIndex: 1,
    explanation: "Kalkulus dikembangkan secara independen pada pertengahan abad ke-17 oleh Sir Isaac Newton di Inggris dan Gottfried Wilhelm Leibniz di Jerman. Leibniz lah yang memperkenalkan notasi dx dan lambang integral (∫) yang kita gunakan sekarang.",
  },
  "physics-1": {
    question: "Manakah dari berikut ini yang merupakan satu-satunya besaran vektor di bawah ini?",
    options: ["Kelajuan", "Massa", "Suhu", "Perpindahan"],
    correctIndex: 3,
    explanation: "Perpindahan adalah besaran vektor karena memiliki besar dan arah. Sementara kelajuan, massa, dan suhu hanya memiliki besar saja sehingga termasuk besaran skalar.",
  },
  "chem-1": {
    question: "Unsur kimia apakah yang memiliki nomor atom 1 dan merupakan unsur paling melimpah di alam semesta?",
    options: ["Helium", "Hidrogen", "Oksigen", "Nitrogen"],
    correctIndex: 1,
    explanation: "Hidrogen (H) adalah unsur kimia dengan nomor atom 1. Sekitar 75% massa elemental alam semesta terdiri dari hidrogen, menjadikannya unsur paling melimpah.",
  },
};

type DailyQuizPopupProps = {
  courseId: string;
  courseTitle: string;
  triggerManual?: boolean;
  onCloseManual?: () => void;
};

export function DailyQuizPopup({
  courseId,
  courseTitle,
  triggerManual = false,
  onCloseManual,
}: DailyQuizPopupProps) {
  const [show, setShow] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const trivia = TRIVIA_DATA[courseId] || TRIVIA_DATA["calc-1"];

  // Helper to get today's date string
  const getTodayString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  };

  useEffect(() => {
    const todayStr = getTodayString();
    const storageKey = `zyx-daily-quiz-${courseId}-${todayStr}`;
    const quizCompleted = localStorage.getItem(storageKey);

    if (triggerManual) {
      setShow(true);
      setSubmitted(false);
      setSelectedIdx(null);
    } else if (!quizCompleted) {
      // Auto show with a slight delay
      const timer = setTimeout(() => {
        setShow(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [courseId, triggerManual]);

  // Listen to simulator reset events
  useEffect(() => {
    const handleReset = () => {
      if (!triggerManual) {
        setShow(false);
        setSubmitted(false);
        setSelectedIdx(null);
      }
    };
    window.addEventListener("zyx-daily-quiz-reset", handleReset);
    return () => window.removeEventListener("zyx-daily-quiz-reset", handleReset);
  }, [triggerManual]);

  function handleSubmit() {
    if (selectedIdx === null) return;

    const correct = selectedIdx === trivia.correctIndex;
    setIsCorrect(correct);
    setSubmitted(true);

    // Save to local storage
    const todayStr = getTodayString();
    localStorage.setItem(`zyx-daily-quiz-${courseId}-${todayStr}`, "completed");
  }

  function handleClose() {
    setShow(false);
    if (onCloseManual) {
      onCloseManual();
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-sans backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-brand-primary/30 bg-card/95 p-6 shadow-2xl backdrop-blur-md md:p-8 animate-in zoom-in-95 duration-200">
        <span className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-border cursor-pointer transition-colors" onClick={handleClose}>
          ✕
        </span>

        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <BrainCircuit className="size-5" />
          </span>
          <div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-brand-primary">Kuis Harian Pop-Up</span>
            <h3 className="font-heading text-body-md font-bold text-foreground leading-tight">{courseTitle} Trivia</h3>
          </div>
        </div>

        {!submitted ? (
          <div className="mt-6">
            <p className="text-body-base font-semibold text-foreground leading-relaxed">
              {trivia.question}
            </p>

            <ul className="mt-5 space-y-2.5">
              {trivia.options.map((opt, idx) => {
                const selected = selectedIdx === idx;
                return (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => setSelectedIdx(idx)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-body-sm font-medium transition-all",
                        selected
                          ? "border-brand-primary bg-brand-primary/10 ring-1 ring-brand-primary"
                          : "border-border bg-muted/20 hover:border-brand-primary/30 hover:bg-muted/40"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-lg text-body-xs font-bold transition-colors",
                          selected ? "bg-brand-primary text-white" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-foreground">{opt}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={handleClose} className="rounded-full">
                Nanti saja
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={selectedIdx === null}
                className="rounded-full bg-brand-primary px-6"
              >
                Kirim Jawaban
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4 animate-in fade-in duration-300">
            <div
              className={cn(
                "rounded-2xl border p-4 flex items-start gap-3",
                isCorrect
                  ? "bg-status-success/10 border-status-success/20 text-status-success"
                  : "bg-status-error/10 border-status-error/20 text-status-error"
              )}
            >
              {isCorrect ? (
                <CheckCircle2 className="size-6 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="size-6 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold text-body-base leading-none">
                  {isCorrect ? "Jawaban Benar!" : "Jawaban Kurang Tepat"}
                </p>
                <p className="text-body-xs mt-1 text-foreground/80">
                  {isCorrect
                    ? "Hebat! Kamu berhasil menjawab trivia hari ini dengan benar."
                    : `Jawaban yang benar adalah: ${trivia.options[trivia.correctIndex]}`}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-4">
              <h4 className="font-heading text-body-xs font-bold text-brand-primary flex items-center gap-1.5">
                <Sparkles className="size-3.5" />
                Pembahasan AI:
              </h4>
              <p className="mt-2 text-body-xs text-muted-foreground leading-relaxed">
                {trivia.explanation}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={handleClose} className="rounded-full bg-foreground text-background hover:bg-foreground/90 px-6">
                Selesai & Tutup
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

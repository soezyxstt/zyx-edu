"use client";

import { BarChart3, Clock, BookOpen, CheckCircle2, Flame } from "lucide-react";
import { StudyStatisticsData } from "@/types/course-learning";
import { studentCardClass } from "@/components/course/course-surfaces";
import { cn } from "@/lib/utils";

export function StudyStatisticsSkeleton() {
  return (
    <div className={cn(studentCardClass(), "w-full")}>
      <div className="flex items-center gap-2 mb-6">
        <div className="size-5 bg-muted rounded-md animate-pulse" />
        <div className="h-5 w-44 bg-muted rounded-md animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:divide-x sm:divide-border/40">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center p-3 text-center space-y-2">
            <div className="size-8 bg-muted rounded-md animate-pulse" />
            <div className="h-4 w-16 bg-muted rounded-md animate-pulse" />
            <div className="h-6 w-12 bg-muted rounded-md animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface StudyStatisticsCardProps {
  data: StudyStatisticsData | null;
  isLoading?: boolean;
}

export function StudyStatisticsCard({
  data,
  isLoading = false,
}: StudyStatisticsCardProps) {
  if (isLoading) {
    return <StudyStatisticsSkeleton />;
  }

  const stats = data || {
    studyTimeMin: 0,
    completedMaterialsCount: 0,
    cardsReviewedCount: 0,
    currentStreakDays: 0,
  };

  return (
    <div className={cn(studentCardClass(), "w-full transition-all duration-300 hover:border-brand-primary/15")}>
      <h3 className="font-heading text-body-base font-bold text-foreground flex items-center gap-2 mb-6">
        <BarChart3 className="size-4.5 text-brand-primary" aria-hidden="true" />
        Statistik Belajar
      </h3>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:divide-x sm:divide-border/60 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Study Time */}
        <div className="flex flex-col items-center p-3 text-center">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary mb-2">
            <Clock className="size-5" aria-hidden="true" />
          </div>
          <span className="text-body-xs text-muted-foreground font-medium">Waktu Belajar</span>
          <span className="mt-1 font-heading text-h5 font-bold text-foreground">
            {stats.studyTimeMin}
            <span className="text-body-xs font-normal text-muted-foreground ml-0.5">menit</span>
          </span>
        </div>

        {/* Completed Materials */}
        <div className="flex flex-col items-center p-3 text-center sm:pl-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-tertiary-1/10 text-tertiary-1 mb-2">
            <BookOpen className="size-5" aria-hidden="true" />
          </div>
          <span className="text-body-xs text-muted-foreground font-medium">Dokumen Selesai</span>
          <span className="mt-1 font-heading text-h5 font-bold text-foreground">
            {stats.completedMaterialsCount}
            <span className="text-body-xs font-normal text-muted-foreground ml-0.5">materi</span>
          </span>
        </div>

        {/* Reviewed Cards */}
        <div className="flex flex-col items-center p-3 text-center sm:pl-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-tertiary-3/10 text-tertiary-3 mb-2">
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </div>
          <span className="text-body-xs text-muted-foreground font-medium">Kartu Diulas</span>
          <span className="mt-1 font-heading text-h5 font-bold text-foreground">
            {stats.cardsReviewedCount}
            <span className="text-body-xs font-normal text-muted-foreground ml-0.5">ulasan</span>
          </span>
        </div>

        {/* Current Streak */}
        <div className="flex flex-col items-center p-3 text-center sm:pl-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-secondary/10 text-brand-secondary mb-2">
            <Flame className="size-5" aria-hidden="true" />
          </div>
          <span className="text-body-xs text-muted-foreground font-medium">Streak Belajar</span>
          <span className="mt-1 font-heading text-h5 font-bold text-foreground">
            {stats.currentStreakDays}
            <span className="text-body-xs font-normal text-muted-foreground ml-0.5">hari</span>
          </span>
        </div>
      </div>
    </div>
  );
}

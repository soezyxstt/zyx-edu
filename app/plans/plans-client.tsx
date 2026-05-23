"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Plus, Minus, Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionContainer } from "@/components/layout/section-container";
import { MarketingPageHero } from "@/components/marketing-page-hero";
import { Reveal } from "@/components/ui/reveal";
import {
  DEFAULT_PERSONS,
  MIN_PERSONS,
  MAX_PERSONS,
  DEFAULT_COURSES,
  MIN_COURSES,
  MAX_COURSES,
  CORE_SUBJECTS,
  calculatePlanPrice,
  getWhatsAppPlanUrl,
} from "@/lib/pricing-constants";
import { planTiers, type PlanKey } from "@/lib/plan-tiers";

export default function PlansClient() {
  const [persons, setPersons] = useState<number>(DEFAULT_PERSONS);
  const [courses, setCourses] = useState<number>(DEFAULT_COURSES);

  const formatPrice = (amount: number): string => {
    return "Rp " + amount.toLocaleString("id-ID");
  };

  const handleIncrementPersons = () => {
    setPersons((prev) => Math.min(prev + 1, MAX_PERSONS));
  };

  const handleDecrementPersons = () => {
    setPersons((prev) => Math.max(prev - 1, MIN_PERSONS));
  };

  const handleIncrementCourses = () => {
    setCourses((prev) => Math.min(prev + 1, MAX_COURSES));
  };

  const handleDecrementCourses = () => {
    setCourses((prev) => Math.max(prev - 1, MIN_COURSES));
  };

  return (
    <div className="flex flex-col">
      <Reveal>
        <MarketingPageHero
          sectionId="plans"
          eyebrow="Zyx Edu"
          title="Paket & layanan"
          description="Pilih kombinasi course dan intensitas pendampingan. Pembayaran dilakukan di luar website; admin akan mengaktifkan akses sesuai paket."
        />
      </Reveal>

      {/* Global Configuration Section */}
      <Reveal>
      <SectionContainer className="border-b border-border bg-linear-to-b from-background via-muted/30 to-background" density="compact">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-md md:p-8">
            <div className="text-center mb-8">
              <h2 className="font-heading text-h5 text-foreground">
                Sesuaikan Rencana Belajar Anda
              </h2>
              <p className="mt-2 text-body-sm text-muted-foreground">
                Sesuaikan jumlah anggota kelompok belajar dan jumlah mata kuliah untuk melihat estimasi biaya real-time.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Group Size Config Card */}
              <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-background p-5 shadow-xs transition-all hover:border-primary/20">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Users className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-heading text-body-base font-semibold text-foreground">
                        Jumlah Anggota Kelompok
                      </h3>
                      <p className="text-xs text-muted-foreground">Maksimal 5 orang per kelompok</p>
                    </div>
                  </div>

                  {/* Visual Avatar Feedback */}
                  <div className="mt-6 flex justify-center gap-2">
                    {Array.from({ length: MAX_PERSONS }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex size-9 items-center justify-center rounded-full border transition-all duration-300 ${
                          i < persons
                            ? "border-primary bg-primary/10 text-primary scale-110 shadow-xs"
                            : "border-border bg-muted/20 text-muted-foreground/40"
                        }`}
                      >
                        <Users className="size-4" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <span className="font-heading text-body-md font-bold text-foreground">
                    {persons} {persons === 1 ? "Orang (Privat)" : "Orang"}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={handleDecrementPersons}
                      disabled={persons <= MIN_PERSONS}
                      aria-label="Kurangi jumlah orang"
                      className="rounded-full"
                    >
                      <Minus className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={handleIncrementPersons}
                      disabled={persons >= MAX_PERSONS}
                      aria-label="Tambah jumlah orang"
                      className="rounded-full"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Course Count Config Card */}
              <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-background p-5 shadow-xs transition-all hover:border-primary/20">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BookOpen className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-heading text-body-base font-semibold text-foreground">
                        Jumlah Mata Kuliah
                      </h3>
                      <p className="text-xs text-muted-foreground">Range: 1 hingga 10 subjek</p>
                    </div>
                  </div>

                  {/* Course Dropdown/Select for Alternative Input */}
                  <div className="mt-6">
                    <label htmlFor="course-select" className="sr-only">Pilih Jumlah Mata Kuliah</label>
                    <select
                      id="course-select"
                      value={courses}
                      onChange={(e) => setCourses(Number(e.target.value))}
                      className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-[var(--zx-accent)] focus:outline-offset-2"
                    >
                      {Array.from({ length: MAX_COURSES }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} Mata Kuliah
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <span className="font-heading text-body-md font-bold text-foreground">
                    {courses} Mata Kuliah
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={handleDecrementCourses}
                      disabled={courses <= MIN_COURSES}
                      aria-label="Kurangi mata kuliah"
                      className="rounded-full"
                    >
                      <Minus className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={handleIncrementCourses}
                      disabled={courses >= MAX_COURSES}
                      aria-label="Tambah mata kuliah"
                      className="rounded-full"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Covered Courses Highlights */}
            <div className="mt-6 pt-6 border-t border-border/60">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Simulasi mata kuliah yang dicover:
              </p>
              <div className="flex flex-wrap gap-2">
                {CORE_SUBJECTS.map((subject, idx) => {
                  const isActive = idx < courses;
                  return (
                    <span
                      key={subject}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                        isActive
                          ? "bg-[var(--zx-accent)]/10 text-[var(--zx-accent)] border border-[var(--zx-accent)]/20 shadow-xs"
                          : "bg-muted/30 text-muted-foreground/40 border border-transparent"
                      }`}
                    >
                      {isActive && <Check className="size-3" />}
                      {subject}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </SectionContainer>
      </Reveal>

      {/* Pricing Cards Grid */}
      <Reveal>
      <SectionContainer className="border-b border-border bg-muted">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-stretch">
          {planTiers.map((tier) => {
            const calculatedPrice = calculatePlanPrice(tier.key, persons, courses);
            const isCustom = tier.key === "custom";
            const isFree = tier.key === "free";
            
            // Format total price display
            const priceDisplay = isFree 
              ? "Gratis" 
              : isCustom 
                ? "Hubungi Kami" 
                : formatPrice(calculatedPrice);
            
            // Calculate price per person
            const pricePerPerson = (!isFree && !isCustom) 
              ? formatPrice(Math.round(calculatedPrice / persons)) 
              : null;

            // Generate WhatsApp link dynamically
            const whatsAppUrl = getWhatsAppPlanUrl(tier.key, tier.name, persons, courses);

            return (
              <article
                key={tier.key}
                className={
                  tier.highlighted
                    ? "relative flex flex-col rounded-3xl border-2 border-[var(--zx-accent)] bg-card p-6 shadow-md ring-4 ring-[var(--zx-accent)]/10 md:p-7 transition-all duration-300 hover:scale-[1.02]"
                    : "flex flex-col rounded-3xl border border-border bg-card p-6 shadow-sm md:p-7 transition-all duration-300 hover:scale-[1.01] hover:border-border-strong hover:shadow-md"
                }
              >
                {tier.highlighted ? (
                  <Badge className="absolute -top-3 left-6 bg-[var(--zx-accent)] text-white hover:bg-[var(--zx-accent)] font-semibold shadow-xs">
                    Rekomendasi
                  </Badge>
                ) : null}

                <div className="flex-1">
                  <SectionHeading as="h3" tier="secondary" className="text-card-foreground text-xl font-bold font-heading">
                    {tier.name}
                  </SectionHeading>
                  
                  <p className="mt-2 text-xs text-muted-foreground min-h-[32px]">
                    {tier.note}
                  </p>

                  <div className="mt-4 pt-4 border-t border-border/60">
                    <p className="font-heading text-h5 font-extrabold text-foreground tracking-tight transition-all duration-300">
                      {priceDisplay}
                    </p>
                    
                    {pricePerPerson && (
                      <p className="mt-1 text-xs text-[var(--zx-accent)] font-semibold">
                        ({pricePerPerson} / orang)
                      </p>
                    )}

                    {!isFree && !isCustom && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Total per semester
                      </p>
                    )}
                  </div>

                  <ul className="mt-6 flex flex-col gap-3">
                    {tier.features.map((f) => (
                      <li key={f} className="flex gap-2 text-body-sm text-muted-foreground items-start">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Check className="size-3" strokeWidth={2.5} aria-hidden />
                        </span>
                        <span className="leading-tight">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <Button
                    asChild
                    variant={tier.highlighted ? "default" : "outline"}
                    size="marketing"
                    className={`w-full group/btn transition-all duration-300 ${
                      tier.highlighted 
                        ? "bg-[var(--zx-accent)] text-white hover:bg-[var(--zx-accent)]/90 hover:shadow-lg hover:shadow-[var(--zx-accent)]/20" 
                        : ""
                    }`}
                  >
                    <Link href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
                      {isFree ? "Daftar Sekarang" : isCustom ? "Hubungi Admin" : "Pilih Paket"}
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </SectionContainer>
      </Reveal>
    </div>
  );
}

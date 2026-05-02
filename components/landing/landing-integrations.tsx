import Link from "next/link";
import { ArrowRight, BookOpen, Layers, LogIn, MessageCircle } from "lucide-react";
import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { getWhatsAppAdminChatHref } from "@/lib/whatsapp-admin";
import { cn } from "@/lib/utils";

function WhatsAppContactCard({ href }: { href: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-lg ring-1 ring-black/5 md:p-5">
      <p className="font-heading text-h6 font-semibold text-card-foreground">Tanya admin</p>
      <p className="mt-2 text-body-sm leading-relaxed text-muted-foreground">
        Ada pertanyaan tentang kelas, jadwal, atau cara mulai belajar? Chat admin lewat WhatsApp — kami
        bantu arahkan ke paket yang pas.
      </p>
      <Button asChild variant="marketingPrimary" size="marketing" className="mt-4 w-full">
        <a href={href} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="size-4" data-icon="inline-start" aria-hidden />
          WhatsApp admin
        </a>
      </Button>
    </div>
  );
}

function SingleFlowIllustration() {
  const step =
    "flex min-w-[5.25rem] flex-col items-center gap-2 rounded-xl bg-background/85 px-3 py-3 text-center shadow-sm ring-1 ring-border backdrop-blur-sm";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border bg-linear-to-br from-card via-background to-muted/40 p-5 shadow-sm ring-1 ring-black/5 md:p-6"
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--color-primary) 22%, transparent) 1px, transparent 0)`,
          backgroundSize: "20px 20px",
        }}
      />
      <p className="absolute right-3 top-2 font-heading text-4xl font-black text-primary/6">∑</p>
      <p className="absolute bottom-2 left-3 font-heading text-3xl font-black text-[var(--zx-accent)]/10">π</p>

      <div className="relative flex flex-col gap-3">
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-[var(--zx-accent)]">
          Alur belajar
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <div className={step}>
            <LogIn className="size-7 text-primary" strokeWidth={1.75} />
            <span className="text-xs font-medium text-foreground">Masuk</span>
          </div>
          <ArrowRight className="size-5 shrink-0 max-sm:rotate-90 text-[var(--zx-accent)]" strokeWidth={2} />
          <div className={step}>
            <Layers className="size-7 text-primary" strokeWidth={1.75} />
            <span className="text-xs font-medium text-foreground">Kelas</span>
          </div>
          <ArrowRight className="size-5 shrink-0 max-sm:rotate-90 text-[var(--zx-accent)]" strokeWidth={2} />
          <div className={step}>
            <BookOpen className="size-7 text-primary" strokeWidth={1.75} />
            <span className="text-xs font-medium text-foreground">Materi</span>
          </div>
        </div>
        <p className="text-center text-body-sm text-muted-foreground">
          Satu pintu navigasi — fokus belajar, kurangi tab bertumpuk.{" "}
          <Link href="/sign-in" className="font-medium underline decoration-[var(--zx-accent)] underline-offset-4">
            Masuk dengan Google
          </Link>
        </p>
      </div>
    </div>
  );
}

export function LandingIntegrations() {
  const whatsappHref = getWhatsAppAdminChatHref();

  return (
    <SectionContainer className="border-b border-border bg-[var(--color-surface)]" aria-labelledby="integrations-heading">
      <div
        className={cn(
          "mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 lg:gap-x-12 lg:gap-y-10",
          whatsappHref ? "lg:grid-cols-2" : "",
        )}
      >
        <div className="relative flex flex-col gap-5 lg:pt-1">
          <div className="absolute -left-10 top-0 hidden size-72 rounded-[3rem] bg-linear-to-br from-brand-primary/[0.07] via-transparent to-[var(--zx-accent)]/8 blur-3xl lg:block" />
          <header className="relative max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--zx-accent)]">Setelah masuk</p>
            <SectionHeading id="integrations-heading" tier="primary" className="mt-2 text-foreground">
              Satu alur masuk, langsung ke materi
            </SectionHeading>
            <p className="mt-2 text-body-md text-muted-foreground">
              Tanpa tab berjubel — setelah login, langsung kerja di kelasmu dari dashboard yang sama rapi untuk TPB dan
              awal jurusan.
            </p>
          </header>
          <SingleFlowIllustration />
          <div
            className="pointer-events-none absolute -right-6 bottom-[10%] hidden size-28 rounded-full bg-brand-secondary/14 blur-3xl md:block"
            aria-hidden
          />
        </div>

        {whatsappHref ? (
          <div className="relative flex flex-col gap-4 lg:pt-12">
            <div
              className="pointer-events-none absolute -right-6 top-[8%] hidden size-32 rounded-full bg-brand-primary/10 blur-3xl md:block"
              aria-hidden
            />
            <WhatsAppContactCard href={whatsappHref} />
          </div>
        ) : null}
      </div>
    </SectionContainer>
  );
}

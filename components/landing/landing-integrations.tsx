import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function MockSignInCard() {
  return (
    <Card className="bg-card border border-border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Masuk ke Zyx</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="nama" className="mb-1.5 block text-sm font-medium text-foreground">
            Nama
          </label>
          <Input id="nama" placeholder="Masukkan nama" />
          <p className="text-xs text-destructive">&nbsp;</p>
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
            Email
          </label>
          <Input id="email" type="email" placeholder="nama@kampus.ac.id" />
          <p className="text-xs text-destructive">&nbsp;</p>
        </div>
        <div>
          <label htmlFor="kelas" className="mb-1.5 block text-sm font-medium text-foreground">
            Pilih kelas
          </label>
          <Select defaultValue="kalkulus-a">
            <SelectTrigger id="kelas">
              <SelectValue placeholder="Pilih kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kalkulus-a">Kalkulus · Grup A (24)</SelectItem>
              <SelectItem value="fisika-b">Fisika Dasar · Grup B (28)</SelectItem>
              <SelectItem value="kimia-lab">Kimia Dasar · Lab (20)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-destructive">&nbsp;</p>
        </div>
        <Button className="w-full interactive hover:scale-[1.02] active:scale-[0.98]">Lanjutkan dengan Google</Button>
      </CardContent>
    </Card>
  );
}

function MockClassListCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-lg ring-1 ring-black/5 md:p-5">
      <p className="font-heading text-h6 font-semibold text-card-foreground">Pilih kelas</p>
      <ul className="mt-3 flex flex-col gap-2">
        {[
          "Kalkulus · Grup A (24)",
          "Fisika Dasar · Grup B (28)",
          "Kimia Dasar · Lab (20)",
        ].map((line) => (
          <li
            key={line}
            className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-body-sm text-foreground"
          >
            <span className="size-2 shrink-0 rounded-full bg-brand-primary" aria-hidden />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LandingIntegrations() {
  return (
    <SectionContainer className="border-b border-border bg-background" aria-labelledby="integrations-heading">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          <div className="relative lg:-mt-4">
            <div className="relative z-10 flex flex-col gap-4 md:max-w-md">
              <div className="motion-safe:translate-x-1 motion-safe:md:translate-x-2">
                <MockSignInCard />
              </div>
              <div className="motion-safe:-translate-x-1 motion-safe:md:-translate-x-3">
                <MockClassListCard />
              </div>
            </div>
            <div
              className="pointer-events-none absolute -left-6 top-1/4 hidden size-40 rounded-full bg-brand-primary/10 blur-3xl md:block"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-4 bottom-0 hidden size-36 rounded-full bg-brand-secondary/15 blur-3xl md:block"
              aria-hidden
            />
          </div>

          <div className="lg:max-w-[480px]">
            <Badge variant="secondary" className="border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium tracking-widest uppercase text-primary">
              Interactive Platform
            </Badge>
            <SectionHeading id="integrations-heading" tier="primary" className="mt-3 text-foreground">
              Satu alur masuk, fokus ke materi
            </SectionHeading>
            <p className="mt-4 max-w-prose text-body-md text-muted-foreground md:text-body-lg">
              Tanpa tab berjubel: setelah masuk, kamu langsung melihat kelas dan progres. Kami merapikan
              langkah awal supaya energi tersisa untuk belajar, bukan mengurus akun.
            </p>
            <p className="mt-4 max-w-prose text-body-base text-muted-foreground">
              Desain ini meminjam ritme produk yang menghubungkan ekosistem sekolah — disesuaikan untuk
              alur Zyx dan mahasiswa ITB.
            </p>
          </div>
      </div>
    </SectionContainer>
  );
}

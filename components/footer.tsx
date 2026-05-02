import Link from "next/link";
import { FaXTwitter, FaInstagram, FaLinkedin } from "react-icons/fa6";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const socialClass = cn(
  "interactive inline-flex size-10 items-center justify-center rounded-full border border-border",
  "text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/60 hover:text-foreground",
);

export function Footer() {
  return (
    <footer role="contentinfo" className="border-t border-border bg-background">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 py-10 md:grid-cols-12 md:gap-8 md:py-12 lg:gap-14">
          <div className="md:col-span-5 lg:col-span-6">
            <Link href="/" aria-label="Beranda ZYX Edu" className="inline-flex">
              <Logo className="max-h-7 max-w-[72px] md:max-h-8 md:max-w-[80px]" />
            </Link>
            <p className="mt-4 max-w-md text-body-sm leading-relaxed text-muted-foreground">
              Zyx Edu membantu mahasiswa S1 ITB tahun pertama dan kedua (TPB dan awal jurusan) menguasai materi dengan modul selaras kampus,
              latihan terarah, dan bimbingan tutor ITB.
            </p>
          </div>

          <nav className="md:col-span-3" aria-label="Tautan perusahaan">
            <h3 className="font-heading text-body-sm font-semibold tracking-tight text-foreground">Perusahaan</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/about" className="interactive text-body-sm text-muted-foreground transition-colors hover:text-foreground">
                  Tentang kami
                </Link>
              </li>
              <li>
                <Link href="/plans" className="interactive text-body-sm text-muted-foreground transition-colors hover:text-foreground">
                  Paket layanan
                </Link>
              </li>
              <li>
                <Link href="/testimonial" className="interactive text-body-sm text-muted-foreground transition-colors hover:text-foreground">
                  Testimoni
                </Link>
              </li>
            </ul>
          </nav>

          <nav className="md:col-span-4 lg:col-span-3" aria-label="Legal">
            <h3 className="font-heading text-body-sm font-semibold tracking-tight text-foreground">Legal</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="#" className="interactive text-body-sm text-muted-foreground transition-colors hover:text-foreground">
                  Kebijakan privasi
                </Link>
              </li>
              <li>
                <Link href="#" className="interactive text-body-sm text-muted-foreground transition-colors hover:text-foreground">
                  Syarat layanan
                </Link>
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Link
                href="https://instagram.com/zyxofficial"
                className={socialClass}
                aria-label="ZYX Edu di Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaInstagram className="size-4.5" aria-hidden />
              </Link>
              <Link href="#" className={socialClass} aria-label="ZYX Edu di X">
                <FaXTwitter className="size-4.5" aria-hidden />
              </Link>
              <Link href="#" className={socialClass} aria-label="ZYX Edu di LinkedIn">
                <FaLinkedin className="size-4.5" aria-hidden />
              </Link>
            </div>
          </nav>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-border py-6 sm:flex-row sm:py-5">
          <p className="text-center text-body-sm text-muted-foreground sm:text-left">
            © {new Date().getFullYear()} ZYX Edu. Hak cipta dilindungi undang-undang.
          </p>
        </div>
      </div>
    </footer>
  );
}

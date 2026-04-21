import Link from "next/link";
import Image from "next/image";
import { FaXTwitter, FaInstagram, FaLinkedin } from "react-icons/fa6";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer role="contentinfo" className="bg-background border-t border-border">
      <div className="container mx-auto grid grid-cols-1 gap-8 px-4 py-12 md:grid-cols-3 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Link href="/" aria-label="ZYX home page" className="inline-flex">
            <Image src="/logo-light.png" alt="ZYX" width={64} height={26} />
          </Link>
          <p className="mt-2 max-w-sm text-sm text-foreground/75">
            Zyx Edu helps ITB bachelor students conquer their first and second-year subjects with gold-standard learning materials, quizzes, and expert tutoring.
          </p>
        </div>
        <nav aria-label="Company links">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Company</h3>
          <ul className="space-y-2">
            <li><Link href="/about" className="interactive text-sm text-foreground/75 hover:text-foreground">About Us</Link></li>
            <li><Link href="/plans" className="interactive text-sm text-foreground/75 hover:text-foreground">Plans</Link></li>
            <li><Link href="/testimonial" className="interactive text-sm text-foreground/75 hover:text-foreground">Testimonials</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal links">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Legal</h3>
          <ul className="space-y-2">
            <li><Link href="#" className="interactive text-sm text-foreground/75 hover:text-foreground">Privacy Policy</Link></li>
            <li><Link href="#" className="interactive text-sm text-foreground/75 hover:text-foreground">Terms of Service</Link></li>
          </ul>
          <div className="mt-4 flex items-center gap-4 text-foreground/60">
            <Link href="https://instagram.com/zyxofficial" className="interactive hover:text-foreground" target="_blank" rel="noopener noreferrer"><FaInstagram className="h-5 w-5" /></Link>
            <Link href="#" className="interactive hover:text-foreground"><FaXTwitter className="h-5 w-5" /></Link>
            <Link href="#" className="interactive hover:text-foreground"><FaLinkedin className="h-5 w-5" /></Link>
          </div>
        </nav>
      </div>
      <div className="container mx-auto px-4">
        <Separator className="my-8" />
        <div className="flex flex-col items-center justify-between gap-4 pb-8 text-xs text-foreground/60 sm:flex-row">
          <p>© 2025 ZYX Edu. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
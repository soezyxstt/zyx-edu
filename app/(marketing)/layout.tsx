import type { ReactNode } from "react";
import { Navbar } from "@/components/navbar";
import { SiteMain } from "@/components/site-main";
import { Footer } from "@/components/footer";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <SiteMain>{children}</SiteMain>
      <Footer />
    </>
  );
}

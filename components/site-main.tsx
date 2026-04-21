"use client";

import { useNavScroll } from "@/components/nav-scroll-provider";

type SiteMainProps = {
  children: React.ReactNode;
};

/**
 * Top padding tracks the nav morph: shorter under the flush dark bar, taller when the floating pill + header inset is full.
 */
export function SiteMain({ children }: SiteMainProps) {
  const { floatBlend } = useNavScroll();
  const padRem = 3.5 + floatBlend * 1.5;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-1 outline-none"
      style={{ paddingTop: `${padRem}rem` }}
    >
      {children}
    </main>
  );
}

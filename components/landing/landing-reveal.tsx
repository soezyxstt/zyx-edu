"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type LandingRevealProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Scroll-triggered fade/slide-in (Brilliant-style section entrance).
 */
export function LandingReveal({ children, className }: LandingRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const onMq = () => {
      if (mq.matches) setVisible(true);
    };
    onMq();
    mq.addEventListener("change", onMq);

    const el = ref.current;
    if (!el) return () => mq.removeEventListener("change", onMq);

    const ob = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setVisible(true);
      },
      { rootMargin: "0px 0px 12% 0px", threshold: 0.06 }
    );
    ob.observe(el);

    return () => {
      mq.removeEventListener("change", onMq);
      ob.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
        /* Visible immediately when "reduce motion" is on (avoids hidden content before JS runs). */
        "motion-reduce:translate-y-0 motion-reduce:opacity-100",
        className
      )}
    >
      {children}
    </div>
  );
}

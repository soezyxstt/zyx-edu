"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** Smoothstep: ease 0→1 over the first full viewport of scroll. */
function smoothstep(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

type NavScrollContextValue = {
  /** Raw ratio scrollY / innerHeight, clamped 0–1. */
  rawProgress: number;
  /** Eased progress used for nav + main padding. */
  floatBlend: number;
};

const NavScrollContext = createContext<NavScrollContextValue>({
  rawProgress: 0,
  floatBlend: 0,
});

export function NavScrollProvider({ children }: { children: ReactNode }) {
  const [rawProgress, setRawProgress] = useState(0);

  useEffect(() => {
    let raf = 0;

    const tick = () => {
      const vh = window.innerHeight || 1;
      const y = window.scrollY;
      setRawProgress(Math.min(1, Math.max(0, y / vh)));
    };

    const onScrollOrResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };

    tick();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  const floatBlend = useMemo(() => smoothstep(rawProgress), [rawProgress]);

  return (
    <NavScrollContext.Provider value={{ rawProgress, floatBlend }}>{children}</NavScrollContext.Provider>
  );
}

export function useNavScroll() {
  return useContext(NavScrollContext);
}

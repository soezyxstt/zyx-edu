"use client";

import { useState, useEffect, RefObject, useCallback } from "react";

export function useScrollProgress(ref: RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0);

  const handleScroll = useCallback(() => {
    const element = ref.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const limit = scrollHeight - clientHeight;
    if (limit <= 0) {
      setProgress(0);
    } else {
      const percent = Math.round((scrollTop / limit) * 100);
      setProgress(Math.min(100, Math.max(0, percent)));
    }
  }, [ref]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let timeoutId: NodeJS.Timeout | null = null;

    const debouncedScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleScroll();
      }, 100);
    };

    element.addEventListener("scroll", debouncedScroll, { passive: true });
    
    // Initial calculation
    handleScroll();

    // Set up a ResizeObserver to re-calculate progress if the content sizes change
    let resizeObserver: ResizeObserver | null = null;
    if (typeof window !== "undefined" && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(() => {
        handleScroll();
      });
      resizeObserver.observe(element);
    }

    return () => {
      element.removeEventListener("scroll", debouncedScroll);
      if (timeoutId) clearTimeout(timeoutId);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [ref, handleScroll]);

  return progress;
}

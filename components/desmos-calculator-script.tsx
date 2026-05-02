"use client";

import Script from "next/script";
import { env } from "@/lib/env";
import { DESMOS_CALCULATOR_READY_EVENT } from "@/lib/desmos-script";

const SCRIPT_VERSION = "v1.12";

/**
 * Loads Desmos calculator.js via `next/script` once per page load when an API key is configured.
 * The embed calls {@link waitForDesmosCalculator} to await `window.Desmos`.
 */
export function DesmosCalculatorScript() {
  const key = env.NEXT_PUBLIC_DESMOS_API_KEY?.trim();
  if (!key) return null;

  const src = `https://www.desmos.com/api/${SCRIPT_VERSION}/calculator.js?apiKey=${encodeURIComponent(key)}`;

  return (
    <Script
      id="desmos-calculator-api"
      src={src}
      strategy="afterInteractive"
      onLoad={() => {
        window.dispatchEvent(new Event(DESMOS_CALCULATOR_READY_EVENT));
      }}
    />
  );
}

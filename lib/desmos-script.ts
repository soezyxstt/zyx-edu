const SCRIPT_VERSION = "v1.12";

/** Dispatched from {@link DesmosCalculatorScript} when `next/script` finishes loading calculator.js. */
export const DESMOS_CALCULATOR_READY_EVENT = "desmos-calculator-api-ready";

function scriptTagSelector() {
  return `script[src^="https://www.desmos.com/api/${SCRIPT_VERSION}/calculator.js"]`;
}

let readyPromise: Promise<void> | null = null;

/**
 * Resolves when `window.Desmos.GraphingCalculator` is available (via `next/script` or an existing tag).
 * Does not inject scripts — include `<DesmosCalculatorScript />` in the root layout.
 */
export function waitForDesmosCalculator(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Desmos?.GraphingCalculator) return Promise.resolve();

  readyPromise ??= new Promise<void>((resolve, reject) => {
    let settled = false;

    const settleOk = () => {
      if (settled) return true;
      if (!window.Desmos?.GraphingCalculator) return false;
      settled = true;
      window.removeEventListener(DESMOS_CALCULATOR_READY_EVENT, onReadyEvent);
      clearInterval(poll);
      clearTimeout(timeoutId);
      resolve();
      return true;
    };

    if (settleOk()) return;

    const onReadyEvent = () => settleOk();
    window.addEventListener(DESMOS_CALCULATOR_READY_EVENT, onReadyEvent);

    const existing = document.querySelector<HTMLScriptElement>(scriptTagSelector());
    if (existing) {
      existing.addEventListener("load", () => settleOk(), { once: true });
      existing.addEventListener(
        "error",
        () => {
          if (settled) return;
          settled = true;
          window.removeEventListener(DESMOS_CALCULATOR_READY_EVENT, onReadyEvent);
          clearInterval(poll);
          clearTimeout(timeoutId);
          readyPromise = null;
          reject(new Error("Desmos script failed to load"));
        },
        { once: true }
      );
    }

    const poll = window.setInterval(() => settleOk(), 50);

    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      window.removeEventListener(DESMOS_CALCULATOR_READY_EVENT, onReadyEvent);
      clearInterval(poll);
      readyPromise = null;
      reject(new Error("Desmos API unavailable (timeout)"));
    }, 45_000);
  });

  return readyPromise;
}

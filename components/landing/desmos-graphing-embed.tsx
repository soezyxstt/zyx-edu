"use client";

import { useEffect, useRef, useState } from "react";
import { env } from "@/lib/env";
import { waitForDesmosCalculator } from "@/lib/desmos-script";
import { DesmosStyleGraph, GRAPH_BLUE } from "@/components/landing/desmos-style-graph";

type Mode = "quadratic" | "sine";

type Props = {
  mode: Mode;
  a: number;
  b: number;
  c: number;
};

function latexNumber(n: number) {
  const r = Math.round(n * 10000) / 10000;
  return String(r);
}

export function expressionToDesmosLatex(mode: Mode, a: number, b: number, c: number): string {
  if (mode === "quadratic") {
    return `y=${latexNumber(a)}x^{2}+${latexNumber(b)}x+${latexNumber(c)}`;
  }
  return `y=${latexNumber(a)}\\sin\\left(${latexNumber(b)}x\\right)+${latexNumber(c)}`;
}

function DesmosLiveGraph({ mode, a, b, c }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<Desmos.GraphingCalculator | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const paramsRef = useRef({ mode, a, b, c });
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    paramsRef.current = { mode, a, b, c };
  }, [mode, a, b, c]);

  useEffect(() => {
    if (!hostRef.current) return undefined;

    let cancelled = false;

    void waitForDesmosCalculator()
      .then(() => {
        if (cancelled || !hostRef.current) return;
        if (!window.Desmos?.GraphingCalculator) {
          if (!cancelled) setLoadError(true);
          return;
        }

        const calculator = window.Desmos.GraphingCalculator(hostRef.current, {
          expressions: false,
          keypad: false,
          settingsMenu: false,
          zoomButtons: true,
          expressionsTopbar: false,
        });

        calculator.setMathBounds({ left: -10, right: 10, bottom: -8, top: 8 });
        const latest = paramsRef.current;
        calculator.setExpression({
          id: "lab-demo",
          latex: expressionToDesmosLatex(latest.mode, latest.a, latest.b, latest.c),
          color: GRAPH_BLUE,
        });

        calculatorRef.current = calculator;

        const ro = new ResizeObserver(() => calculator.resize());
        ro.observe(hostRef.current);
        roRef.current = ro;
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
      roRef.current?.disconnect();
      roRef.current = null;
      calculatorRef.current?.destroy();
      calculatorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const calc = calculatorRef.current;
    if (!calc || loadError) return;
    calc.setExpression({
      id: "lab-demo",
      latex: expressionToDesmosLatex(mode, a, b, c),
      color: GRAPH_BLUE,
    });
  }, [mode, a, b, c, loadError]);

  if (loadError) {
    return <DesmosStyleGraph mode={mode} a={a} b={b} c={c} />;
  }

  return (
    <div className="flex flex-col">
      <div
        ref={hostRef}
        className="h-[240px] min-h-[240px] w-full md:h-[278px] md:min-h-[278px]"
        aria-label="Desmos graphing calculator"
      />
      <p className="border-t border-border bg-muted/40 px-3 py-2 text-center text-[11px] text-muted-foreground">
        Graphing powered by{" "}
        <a
          href="https://www.desmos.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Desmos
        </a>
      </p>
    </div>
  );
}

/**
 * Embeds Desmos Graphing Calculator when `NEXT_PUBLIC_DESMOS_API_KEY` is set; otherwise falls back to local SVG graph.
 */
export function DesmosGraphingEmbed(props: Props) {
  const apiKey = env.NEXT_PUBLIC_DESMOS_API_KEY?.trim();
  if (!apiKey) {
    return <DesmosStyleGraph mode={props.mode} a={props.a} b={props.b} c={props.c} />;
  }

  return <DesmosLiveGraph {...props} />;
}

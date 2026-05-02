/** Minimal typings for https://www.desmos.com/api/v1.12/docs — extend as needed. */

declare namespace Desmos {
  type GraphingCalculatorOptions = {
    expressions?: boolean;
    keypad?: boolean;
    settingsMenu?: boolean;
    zoomButtons?: boolean;
    expressionsTopbar?: boolean;
    autosize?: boolean;
    lockViewport?: boolean;
    invertedColors?: boolean;
    projectorMode?: boolean;
    capExpressionSize?: boolean;
    authorFeatures?: boolean;
  };

  type GraphingCalculator = {
    destroy(): void;
    resize(): void;
    setExpression(state: { id: string; latex: string; color?: string }): void;
    setMathBounds(bounds: { left: number; right: number; bottom: number; top: number }): void;
  };
}

interface Window {
  Desmos?: {
    GraphingCalculator: (
      element: HTMLElement,
      options?: Desmos.GraphingCalculatorOptions
    ) => Desmos.GraphingCalculator;
  };
}

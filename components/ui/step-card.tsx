import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const stepCardVariants = cva(
  "interactive rounded-xl border px-4 py-3 text-left transition-all duration-200 ease-in-out",
  {
    variants: {
      state: {
        default: "border-border bg-background/80",
        active: "border-primary bg-background ring-2 ring-primary scale-[1.02]",
      },
    },
    defaultVariants: {
      state: "default",
    },
  }
);

export type StepCardVariants = VariantProps<typeof stepCardVariants>;

export function StepCard({
  className,
  state,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & StepCardVariants) {
  return <div className={cn(stepCardVariants({ state }), className)} {...props} />;
}

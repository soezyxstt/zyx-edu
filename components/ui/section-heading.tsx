import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const sectionHeadingVariants = cva("font-heading", {
  variants: {
    tier: {
      hero: "text-5xl md:text-6xl font-bold tracking-tight leading-tight",
      primary: "text-3xl md:text-4xl font-semibold tracking-tight leading-snug",
      secondary: "text-2xl md:text-3xl font-semibold leading-snug",
    },
  },
  defaultVariants: {
    tier: "primary",
  },
});

export type SectionHeadingVariants = VariantProps<typeof sectionHeadingVariants>;

type SectionHeadingProps = React.HTMLAttributes<HTMLHeadingElement> &
  SectionHeadingVariants & {
    as?: "h1" | "h2" | "h3";
  };

export function SectionHeading({
  as,
  tier = "primary",
  className,
  ...props
}: SectionHeadingProps) {
  const Comp = as ?? (tier === "hero" ? "h1" : "h2");
  return <Comp className={cn(sectionHeadingVariants({ tier }), className)} {...props} />;
}

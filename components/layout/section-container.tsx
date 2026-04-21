import * as React from "react";
import { cn } from "@/lib/utils";

type SectionContainerProps<T extends React.ElementType = "section"> = {
  as?: T;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  tight?: boolean;
  stepLabel?: string;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function SectionContainer<T extends React.ElementType = "section">({
  as,
  children,
  className,
  contentClassName,
  tight = false,
  stepLabel,
  ...props
}: SectionContainerProps<T>) {
  const Comp = as ?? "section";

  return (
    <Comp className={cn("relative", tight ? "py-12 md:py-16" : "py-20 md:py-28", className)} {...props}>
      {stepLabel ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-4 -left-2 select-none text-[120px] leading-none font-black opacity-[0.04]"
        >
          {stepLabel}
        </span>
      ) : null}
      <div className={cn("container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", contentClassName)}>
        {children}
      </div>
    </Comp>
  );
}

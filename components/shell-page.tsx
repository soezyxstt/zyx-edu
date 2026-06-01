import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";

type ShellPageProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function ShellPage({ title, description, children, className }: ShellPageProps) {
  return (
    <div className={cn("relative pb-8", className)}>
      <div className="marketing-container pt-6 md:pt-8">
        <Reveal>
          <header className="max-w-4xl landing-stagger [&>*:nth-child(1)]:[animation-delay:0ms] [&>*:nth-child(2)]:[animation-delay:60ms]">
            <SectionHeading as="h1" tier="primary" className="text-foreground text-h3 md:text-h2">
              {title}
            </SectionHeading>
            {description ? (
              <div className="mt-2 max-w-3xl text-body-sm text-muted-foreground md:text-body-base">
                {description}
              </div>
            ) : null}
          </header>
        </Reveal>
        <Reveal className="mt-5 md:mt-6">
          <div>{children}</div>
        </Reveal>
      </div>
    </div>
  );
}

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
    <div className={cn("bg-background", className)}>
      <div className="marketing-container py-10 md:py-14">
        <Reveal>
          <header className="max-w-3xl">
            <SectionHeading as="h1" tier="primary" className="text-foreground">
              {title}
            </SectionHeading>
            {description ? (
              <p className="mt-3 text-body-md text-muted-foreground">{description}</p>
            ) : null}
          </header>
        </Reveal>
        <Reveal className="mt-8">
          <div>{children}</div>
        </Reveal>
      </div>
    </div>
  );
}

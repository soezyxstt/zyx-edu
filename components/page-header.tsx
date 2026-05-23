import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  className?: string;
};

export function PageHeader({ title, description, eyebrow, className }: PageHeaderProps) {
  return (
    <header className={cn("marketing-container py-10 md:py-14", className)}>
      <div className="max-w-3xl space-y-3">
        {eyebrow ? (
          <span className="inline-flex rounded-full border border-[var(--zx-accent)]/20 bg-[var(--zx-accent)]/5 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--zx-accent)]">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="text-h3 md:text-h2 font-heading font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="text-body-lg text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </header>
  );
}

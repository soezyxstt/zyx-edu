import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  className?: string;
};

export function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <header className={cn("marketing-container py-10 md:py-14", className)}>
      <div className="max-w-3xl">
        <h1 className="text-h3 md:text-h2 font-heading font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 text-body-lg text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </header>
  );
}

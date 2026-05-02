import { cn } from "@/lib/utils";

/** List row / interactive link card */
export function courseListRowClass(className?: string) {
  return cn(
    "group flex items-start gap-4 rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm backdrop-blur-sm",
    "transition-[border-color,box-shadow,background-color] duration-200",
    "hover:border-primary/25 hover:bg-card hover:shadow-md",
    className,
  );
}

/** Static card (quiz grid, overview tiles inner) */
export function courseCardClass(className?: string) {
  return cn(
    "rounded-2xl border border-border/80 bg-card/85 p-6 shadow-sm backdrop-blur-sm",
    className,
  );
}

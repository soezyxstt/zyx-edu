import { cn } from "@/lib/utils";

/** List row / interactive link card */
export function courseListRowClass(className?: string) {
  return cn(
    "group flex items-start gap-3 rounded-lg border border-border/70 bg-card/70 px-4 py-3 backdrop-blur-sm",
    "transition-[border-color,background-color] duration-200",
    "hover:border-primary/25 hover:bg-card",
    className,
  );
}

/** Static card (quiz grid, overview tiles inner) */
export function courseCardClass(className?: string) {
  return cn(
    "rounded-lg border border-border/70 bg-card/75 p-4 backdrop-blur-sm",
    className,
  );
}

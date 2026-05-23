import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Use on dark backgrounds while the document is still in light mode (e.g. marketing nav). */
  presentation?: "default" | "onDark";
}

export function Logo({ className, presentation = "default" }: LogoProps) {
  const onDark = presentation === "onDark";

  return (
    <div className={cn("relative flex items-center [--logo-height:2rem]", className)}>
      {/* Light asset: default on light surfaces; hidden when forcing onDark or site dark mode */}
      <Image
        src="/logo-light.png"
        alt="Zyx Education Logo"
        width={370}
        height={216}
        priority
        className={cn(
          "h-[var(--logo-height)] w-auto max-w-none",
          onDark ? "hidden" : "block dark:hidden"
        )}
      />

      {/* Dark asset: site dark mode, or forced onDark (e.g. black-2 nav) */}
      <Image
        src="/logo-dark.png"
        alt="Zyx Education Logo"
        width={370}
        height={216}
        priority
        className={cn(
          "h-[var(--logo-height)] w-auto max-w-none",
          onDark ? "block" : "hidden dark:block"
        )}
      />
    </div>
  );
}

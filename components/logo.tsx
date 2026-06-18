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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 2182 1275"
        fill="none"
        className="h-[var(--logo-height)] w-auto max-w-none shrink-0 select-none"
      >
        {/* Path 1 (Z) */}
        <path
          d="M820.486 0L1043.32 311.527L561.052 985.764H785.07C1218.92 985.764 1414.6 741.149 1490.45 548.958C1530.06 448.611 1614.41 218.403 1779.69 153.473C1726.56 188.889 1645.61 253.821 1596.7 619.792C1511.51 1257.29 1018.23 1275 675.869 1275H0L705.095 289.236H0V0H820.486Z"
          className={onDark ? "fill-white" : "fill-marketing-navy dark:fill-white"}
        />

        {/* Path 2 (X) */}
        <path
          d="M1548 389.927L1826.91 0H2181.08L1725.09 637.5L2181.08 1275H1826.91L1584.83 936.551C1624.06 852.061 1646.88 746.292 1646.88 613.889C1646.88 330.556 1729.52 188.89 1782.64 153.473C1617.37 218.403 1594.99 445.66 1555.38 546.007C1531.12 607.48 1494.6 674.317 1441.95 736.797L914.931 0H1269.1L1548 389.927Z"
          className={onDark ? "fill-white" : "fill-zx-accent dark:fill-white"}
        />
      </svg>
    </div>
  );
}


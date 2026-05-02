"use client";

type MarketingHeroLoopsProps = {
  /** Unique prefix for SVG gradient id (avoid clashes when multiple SVGs exist). */
  id: string;
};

export function MarketingHeroLoops({ id }: MarketingHeroLoopsProps) {
  const gradId = `${id.replace(/[^a-zA-Z0-9_-]/g, "")}-hero-loop-grad`;

  return (
    <svg
      className="pointer-events-none absolute inset-0 size-full opacity-[0.14]"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-brand-primary)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--color-tertiary-3)" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#${gradId})`} strokeWidth="1.15">
        <ellipse cx="78%" cy="18%" rx="38%" ry="52%" transform="rotate(-12 78 18)" />
        <ellipse cx="12%" cy="72%" rx="42%" ry="48%" transform="rotate(8 12 72)" />
        <ellipse cx="52%" cy="48%" rx="55%" ry="62%" transform="rotate(-4 52 48)" />
      </g>
    </svg>
  );
}

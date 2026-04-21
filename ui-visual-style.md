# UI Visual Style Guide

This document defines the visual language used across ZYX Edu marketing surfaces and shared UI.

## 1) Design Tokens (Source of Truth)

- Token file: `app/globals.css`
- Tailwind mode: v4 CSS tokens via `@theme inline`
- Color format: OKLCH semantic variables only (`--background`, `--primary`, etc.)

### Core semantic tokens
- `bg-background` / `text-foreground`: default page surface and primary text
- `bg-muted` / `text-muted-foreground`: secondary section surfaces and supporting copy
- `bg-card` / `text-card-foreground`: card panels and elevated content
- `bg-primary` / `text-primary-foreground`: primary action and emphasis
- `border-border`: default borders and section dividers
- `ring-ring`: focus ring fallback

### Brand mapping
- Brand primary (blue): `--primary` (`bg-primary`, `text-primary`)
- Brand secondary (orange): `--secondary` (`bg-secondary`, `text-secondary`)
- Use semantic tokens first; use `brand-*` tokens only for intentional brand accents.

## 2) Section Rhythm

- Use `SectionContainer` (`components/layout/section-container.tsx`) for all major marketing sections.
- Standard section spacing:
  - default: `py-20 md:py-28`
  - compact CTA sections: `tight` prop (`py-12 md:py-16`)
- Recommended alternation:
  - primary content: `bg-background`
  - supporting separators: `bg-muted`
  - dark anchors: sparingly, only where narrative emphasis is required

## 3) Typography

- Use `SectionHeading` (`components/ui/section-heading.tsx`) for section titles.
- Tiers:
  - `hero`: page-leading display
  - `primary`: major section headings
  - `secondary`: supporting section headings
- Body copy uses `text-body-*` classes and should prefer `text-muted-foreground` unless primary emphasis is needed.

## 4) Cards and Surfaces

- Cards should use:
  - `bg-card border border-border shadow-sm`
- On muted backgrounds, cards should remain white/near-white for elevation contrast.
- Avoid hard-coded shadows/borders when semantic utilities are available.

## 5) Interactive Elements

- Shared interaction utility: `.interactive` from `globals.css`
- Buttons:
  - default CTA: `variant="default"` (primary token)
  - secondary action: `variant="outline"`
- Focus behavior:
  - inputs/selects should use primary-tinted focus (`focus-visible:border-primary`, `focus-visible:ring-primary/50`)
- Active states (tabs/toggles/dots):
  - use data-state classes and semantic accent tokens (`data-[state=active]:*`, `data-[state=on]:*`)

## 6) Ornament and Motion

- Ornament component: `AnimatedOrnamentCanvas`
- Tone strategy:
  - dark sections: default (`tone="dark"`)
  - light sections: `tone="light"` to preserve contrast
- Respect reduced motion (already implemented in component and global animation utilities).

## 7) Do / Do Not

### Do
- Use semantic utilities (`bg-background`, `text-muted-foreground`, `border-border`)
- Keep visual hierarchy through contrast, not arbitrary colors
- Reuse shared primitives (`SectionContainer`, `SectionHeading`, `Button`, `Card`)

### Do not
- Introduce ad-hoc color literals in component class strings
- Reintroduce one-off section spacing per page
- Mix multiple visual systems on the same page (legacy dark shells + new light rhythm)

## 8) Marketing Page Implementation Checklist

- [ ] Uses `MarketingPageHero` for hero treatment
- [ ] Sections wrapped in `SectionContainer`
- [ ] Cards use `bg-card border-border shadow-sm`
- [ ] Primary actions use `bg-primary`
- [ ] Supporting text uses `text-muted-foreground`
- [ ] Lint/build pass after visual changes

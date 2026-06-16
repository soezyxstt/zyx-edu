# Globals: read this before every phase

Applies to every phase file in this folder. Phase files reference section 2 as UI-STD.

Status: PLAN ONLY. Nothing has been built unless a phase file's checklist says so.

---

## 1. Execution rules

1. Work phases in the README order. Never start a phase before its dependencies' Gate tables are fully green, except phases marked `parallel-ok`.
2. Before writing any code in any phase, read these four files in full: `PROJECT_RECAP.md`, `AGENTS.md`, `db/schema.ts`, `lib/env.ts`.
3. Database changes: edit `db/schema.ts` only (mirror the existing column helper style), then `npm run db:generate`, then `npm run db:migrate`. Never hand-edit anything inside `drizzle/`. Production push: `npm run db:push:prod`, only after the Gate passes locally.
4. After every meaningful edit batch: `npm run lint` and `npm run build`. Both must pass with zero new errors before the next numbered step.
5. Every phase ships behind the env feature flag named in its file. Flag absent or `0` means the feature is invisible. Add each flag to `lib/env.ts` as optional.
6. Already built, DO NOT REBUILD: KO extraction (`lib/ko-extractor.ts`), RAG sync (`lib/pinecone.ts`, `lib/inngest-functions.ts`), question generation (`lib/question-generator.ts`), quiz attempts (`app/api/quiz/*`), SM-2 flashcards (`lib/flashcard-scheduler.ts`), diktat PDFs (`lib/diktat-*.ts`), website materials (`lib/material-generator.ts`, `lib/markdown-compiler.ts`), admin AI portal (`app/admin/ai/*`). Phases only extend these at the exact points named.
7. Money rule: AI quota is spent only on tutoring, mistake feedback, and content generation. Streaks, recommendations, study paths, reflections, analytics are deterministic SQL plus rules. If a step would add a Gemini call outside the named ones, stop, it is a mistake.
8. UI copy: short labels, sentence case, numbers over sentences. One helper sentence max per section. No exclamation marks. No filler. No em or en dash characters anywhere.

---

## 2. UI Build Standard (UI-STD)

### 2.0 Landing page is the visual reference

Before writing any UI or frontend code, open `app/page.tsx` and the components it renders from `components/landing/`. The landing page already previews the future product features as built components. Match them, do not reinvent.

| Feature you are building | Previewed in |
|---|---|
| Quiz UI | `components/landing/landing-demo-quiz.tsx` |
| AI tutor chat | `components/landing/landing-demo-tutor.tsx` |
| Flashcards | `components/landing/landing-demo-flashcards.tsx` |
| Study path | `components/landing/landing-demo-path.tsx` |
| Learning loop, streak feel | `components/landing/landing-learning-loop.tsx` |
| Course cards | `components/landing/landing-course-preview.tsx` |
| Pricing | `components/landing/landing-pricing-preview.tsx` |

Rule: when a phase tells you to build one of these features, the real page must look like its landing preview (same layout idea, spacing, tokens, icon usage). If the spec and the preview conflict, follow the spec and keep the preview's visual language.

### 2.0b Page ornaments (required on full pages)

Every standalone page gets the decorative background layer, the way `/plans`, `/testimonial`, and `/about` already do. Pages without it look flat and boring.

- Component: `PageOrnaments` from `components/ui/page-ornaments.tsx`.
- Usage: place `<PageOrnaments variant="..." />` as the first child inside a `relative overflow-hidden` wrapper, content goes above it with `relative z-10` if needed.
- Existing variants: `testimonial`, `plans`, `about`. Reuse the closest one; add a new variant config in the same file (same glow + ring + shape + math layer pattern, same opacity ranges) only if a page needs its own composition.
- Reference implementations: `app/plans/plans-client.tsx`, `app/testimonial/page.tsx`, `app/about/about-client.tsx`. The landing hero uses `components/animated-ornament-canvas.tsx` instead; that one stays landing-only.
- Keep it subtle: tokens only (`var(--primary)`, `var(--color-brand-secondary)`, `var(--color-tertiary-1)`), opacities at or below the existing configs, `pointer-events-none`, `aria-hidden`.
- Dense data surfaces (`/admin`, in-course lesson reader) may skip ornaments; marketing and app shell pages do not.

### 2.1 Available primitives (do not install new UI libraries)

| Need | Use | Import |
|---|---|---|
| Buttons | `Button` | `components/ui/button` |
| Tags, status labels | `Badge` (already `rounded-md`, never restyle to full) | `components/ui/badge` |
| Side panels | `Sheet` | `components/ui/sheet` |
| Modals | `Dialog` | `components/ui/dialog` |
| Tabs | `Tabs` | `components/ui/tabs` |
| Inputs | `Input`, `Textarea`, `Label`, `Select` | `components/ui/*` |
| Dividers | `Separator` or `border-b border-border` | `components/ui/separator` |
| Toasts | `toast` from `sonner` (provider in `components/app-toaster.tsx`) | `sonner` |
| Scroll entrance | `Reveal` (handles reduced motion and admin bypass) | `components/ui/reveal` |
| Icons | lucide-react, default `size-4`, section icons `size-5` | `lucide-react` |
| Charts, sparklines | recharts (installed) | `recharts` |
| Client data fetching | `@tanstack/react-query` for polling surfaces, otherwise Server Components | |
| Math | `MathText` | `components/course/math-text` |

### 2.2 Layout rules

- Page shell: reuse existing wrappers (`components/shell-page.tsx`, `components/course/course-page-shell.tsx`, admin layout). Never build a new shell.
- Section separation: heading + `border-b border-border` + vertical rhythm (`space-y-8` between sections, `space-y-3` inside). Cards only where a spec literally says Card, then exactly `bg-card border border-border shadow-sm rounded-xl`. Default is NO card.
- Lists of records: divider rows (`divide-y divide-border`), each row `py-3 flex items-center justify-between gap-4`. Not card grids.
- Mobile: single column under `sm:`, test at 380 px width.
- Dark mode: semantic tokens only (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-muted`, `text-primary`, `text-status-*`). Zero raw hex, zero default Tailwind palette classes.

### 2.3 Typography rules

- Page title: `h1` with `text-h4 font-heading` on app pages (`text-h5` under `sm:`).
- Section heading: `h2` with `text-h6 font-heading`.
- Body: `text-body-base`; meta and helper: `text-body-sm text-muted-foreground`.
- Big stat figures: `font-heading text-h3 font-bold` with the unit in `text-body-sm text-muted-foreground` beside it.

### 2.4 Motion rules (the only allowed animations)

| Case | Spec |
|---|---|
| Hover or focus | `transition-colors duration-150` |
| Element appears after client state change | tw-animate-css: `animate-in fade-in slide-in-from-bottom-2 duration-300` |
| List stagger | same plus inline `style={{ animationDelay: index * 50 + 'ms' }}`, cap 8 items |
| Section enters on scroll | wrap in `<Reveal>` (never on `/admin`, the component bypasses) |
| Progress and mastery bars | track `h-1.5 rounded-md bg-muted`, fill `h-full rounded-md bg-primary`, width via `transition-[width] duration-500 ease-out` |
| Inline busy | `Loader2` icon `animate-spin size-4`, only inside buttons or rows, never page-center spinners |
| Collapsible open | `animate-in fade-in duration-200` on revealed content |

Anything else (parallax, count-up, confetti, springs) is forbidden unless a phase spec names it.

### 2.5 State rules (every screen implements all four)

| State | Spec |
|---|---|
| Loading | Skeletons mirroring final layout: `div` blocks `bg-muted rounded-md animate-pulse` with realistic heights. No spinners. |
| Empty | One line `text-body-sm text-muted-foreground` plus at most one `Button variant="outline" size="sm"` CTA. No illustrations. |
| Error | Row with `TriangleAlert size-4 text-status-error`, short message, `Button variant="ghost" size="sm"` Retry. |
| Ready | Per spec. |

### 2.6 Hard prohibitions

- No `rounded-full` on anything that is not a perfect 1:1 circle (avatar, status dot).
- No nested cards, no card-in-card, no grid of stat cards. Stats are typographic figures separated by dividers.
- No new fonts, no gradient backgrounds (the radial glows inside `PageOrnaments` are the one exception), no purple, no centered hero layouts on app pages.
- No em or en dash characters in UI copy. Use commas or periods.

---

## 3. Services, free tiers, standing decisions

| Concern | Service | Free limit that shapes design |
|---|---|---|
| LLM | Gemini 2.5 Flash (existing key, 4-key rotation) | about 250 req/day per key, routed via AI Gateway |
| Embeddings | Gemini text-embedding-004 | about 1,500 req/day |
| AI proxy, logs, cache | Cloudflare AI Gateway | unlimited proxy, 100k logged req/mo, rate limiting |
| Edge cache | Cloudflare Workers KV | 100k reads/day, ONLY 1k writes/day, 1 GB |
| Object storage | Cloudflare R2 | 10 GB, zero egress, serves file URLs via `/api/storage/file/{key}` |
| Vectors (default) | Pinecone Serverless Starter | 2 GB, namespace per course (`course_{courseId}`) |
| Vectors (prod migration) | Cloudflare Vectorize via `zyx-vector-api` Worker | ~6,500 vectors at 768 dims, controlled by `VECTOR_STORE` env |
| Realtime (live quiz) | Cloudflare Durable Objects + `zyxrealtime` Worker | 100k req/day, WebSocket/SSE |
| Diktat PDF renderer | Railway Puppeteer service (`zyxacademydiktat`) | Separate deployment, called via `DIKTAT_RENDERER_URL` |
| DB | Turso (libsql, wired in `lib/db/index.ts`) | 5 GB, 500M row reads/mo |
| Jobs | Inngest Cloud | 50k steps/mo |
| File upload (browser) | UploadThing (dev fallback); production prefers direct R2 | UploadThing: 2 GB; R2: 10 GB |
| Push notifications | Firebase Cloud Messaging (FCM) via Firebase Admin SDK | Free tier, device tokens in `user_push_tokens` table |
| Email | Resend | 100 emails/day |
| Auth | Better-Auth (credentials + Google OAuth) | Free |
| Analytics / monitoring | Vercel Analytics + Speed Insights + Sentry | Sentry: 5k events/mo free |

Standing decisions (never re-litigate):
1. Turso/SQLite stays. No Postgres return.
2. Pinecone is the dev default; `VECTOR_STORE` env switches modes: `pinecone` (dev), `dual` (write both, read Pinecone), `vectorize` (read from Vectorize). Production targets `dual` → `vectorize` migration.
3. Storage runs on R2 through `lib/storage/index.ts` (`STORAGE_PROVIDER_MODE`). Keep the UploadThing provider wired for development convenience.
4. All Gemini traffic goes through Cloudflare AI Gateway (caching, rate limiting, observability).
5. Engagement features (streak, reflection, live quiz) are deterministic SQL, never AI-generated.
6. Three Cloudflare Workers support the app: `zyx-vector-api` (Vectorize proxy), `zyxrealtime` (live quiz WebSocket), `zyxacademydiktat` (Puppeteer PDF on Railway).
7. Feature flags (`FEATURE_*` in env) gate every non-trivial feature. Flag absent or `"0"` = invisible.

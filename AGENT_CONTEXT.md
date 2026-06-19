# Zyx Engineering Notes (Agent Context)

This document is the single, authoritative, compact source of truth for the project's current status, standing architectural decisions, coding constraints, and cost rules.

---

## 1. Execution Rules

1. Before writing code, read `db/schema.ts` and `lib/env.ts` for current schema/env state.
2. DB changes: edit `db/schema.ts` only, then `bun run db:generate` then `bun run db:migrate`. Never hand-edit `drizzle/`. Production push: `bun run db:push:prod`.
3. After every meaningful edit batch: `bun run lint` and `bun run build`. Both must pass with zero new errors before next step.
4. Every feature ships behind the `FEATURE_*` env flag named in `lib/env.ts`. Flag absent or `"0"` = invisible.
5. Already built, DO NOT REBUILD: KO extraction, RAG sync, question generation, quiz attempts, SM-2 flashcards, diktat PDFs, website materials, admin AI portal.
6. AI quota is spent only on tutoring, mistake feedback, and content generation. Streaks, recommendations, study paths, reflections, analytics are deterministic SQL + rules.
7. UI copy: short labels, sentence case, numbers over sentences. No exclamation marks, no filler, no em/en dashes.

---

## 2. Current State

Last Updated: 2026-06-16

### Completed
- **SQLite migration completed**: Turso production configured, Local SQLite dev mode configured, DB queries routed successfully.
- **R2 migration completed**: UploadThing provider mode switched to R2 by default, assets uploaded and validated.
- **AI Gateway routing completed**: Gemini client configured to route all traffic through Cloudflare AI Gateway.
- **Storage abstraction completed**: Reusable storage client (`lib/storage/index.ts`) abstracting R2 and UploadThing providers.
- **vNext Content Architecture migration completed**: Canonical Markdown-First Knowledge System implemented, schemas updated, local SQLite and production Turso databases fully migrated, MTD backfill completed, validation, extraction, assessment indexing, and policy layers fully operational.

### Verified
- SQLite/Turso schema setup and connection verified.
- R2 uploads and public CDN serving verified.
- AI Gateway metrics proxying verified.
- vNext architecture pipeline and verification tests (16/16 tests passing).
- Production database schemas and MTD backfill verified successfully.

### Current Focus
Deploying and monitoring the Canonical Markdown-First Knowledge System in production environment, ensuring robust integration of assessments and learning components.

### Blockers
None

---

## 3. Core Architectural Stack
- **Database**: Turso for production, local SQLite (`dev.db`) for development. Never attempt to use PostgreSQL or neon-client.
- **Vector Store**: Pinecone (Serverless Starter) is the primary vector database. Vectorize (Cloudflare) is conditional only (P8).
- **Primary LLM**: Google Gemini API via `@google/genai` (Gemini 2.5 Flash is the primary model).
- **AI Gateway**: Cloudflare AI Gateway routes all Gemini traffic (`CF_AI_GATEWAY_URL`). Caching enabled for Tier 1 tutor queries.
- **Storage**: Cloudflare R2 bucket (`zyx`) is the storage provider. UploadThing is deprecated and pending complete teardown (P7).

---

## 4. UI Build Standard (UI-STD)

### Primitives (do not install new UI libraries)

| Need | Use | Import |
|---|---|---|
| Buttons | `Button` | `components/ui/button` |
| Tags, status labels | `Badge` (already `rounded-md`, never pill) | `components/ui/badge` |
| Side panels | `Sheet` | `components/ui/sheet` |
| Modals | `Dialog` | `components/ui/dialog` |
| Tabs | `Tabs` | `components/ui/tabs` |
| Inputs | `Input`, `Textarea`, `Label`, `Select` | `components/ui/*` |
| Dividers | `Separator` or `border-b border-border` | `components/ui/separator` |
| Toasts | `toast` from `components/ui/toast` | `@/components/ui/toast` |
| Scroll entrance | `Reveal` (handles reduced motion + admin bypass) | `components/ui/reveal` |
| Icons | lucide-react, default `size-4`, section icons `size-5` | `lucide-react` |
| Math | `MathText` | `components/course/math-text` |

### Typography

- **Headings**: Lexend (`font-heading`), line-height 1.1x. Scale: `text-h1` (56px) → `text-h6` (20px). Use semantic `h1`-`h6` when possible.
- **Body**: Inter (`font-sans`), line-height 1.4x. Utilities: `text-body-lg` (20px), `text-body-md` (18px), `text-body-base` (16px, default), `text-body-sm` (14px).
- Page title: `h1 text-h4 font-heading` (`text-h5` under `sm:`). Section heading: `h2 text-h6 font-heading`. Body: `text-body-base`. Meta: `text-body-sm text-muted-foreground`.

### Layout

- Section separation: heading + `border-b border-border` + `space-y-8` between sections, `space-y-3` inside.
- Lists: `divide-y divide-border`, each row `py-3 flex items-center justify-between gap-4`. Not card grids.
- Cards only where spec says Card: `bg-card border border-border shadow-sm rounded-xl`. No nested cards.
- Mobile: single column under `sm:`, test at 380px.
- Dark mode: semantic tokens only; `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-muted`, `text-primary`, `text-status-*`. Zero raw hex, zero default Tailwind palette.

### Page Ornaments

Every standalone page gets `<PageOrnaments variant="..." />` as first child inside `relative overflow-hidden`. Reuse existing variants (`testimonial`, `plans`, `about`). Dense data surfaces (admin, lesson reader) may skip.

### Motion (only allowed animations)

| Case | Spec |
|---|---|
| Hover/focus | `transition-colors duration-150` |
| Element appears | `animate-in fade-in slide-in-from-bottom-2 duration-300` |
| List stagger | same + `style={{ animationDelay: index * 50 + 'ms' }}`, cap 8 |
| Section enters | `<Reveal>` (never on admin) |
| Progress bars | `h-1.5 rounded-md bg-muted`, fill `h-full rounded-md bg-primary`, `transition-[width] duration-500 ease-out` |
| Loading | Skeletons: `bg-muted rounded-md animate-pulse`, no spinners |
| Empty | One line `text-body-sm text-muted-foreground` + optional `Button variant="outline" size="sm"` |
| Error | `TriangleAlert size-4 text-status-error` + message + `Button variant="ghost" size="sm"` Retry |

### Hard Prohibitions

- No `rounded-full` on anything that is not a perfect 1:1 circle (avatar, status dot).
- No nested cards, card-in-card, stat card grids.
- No new fonts, no gradient backgrounds (except `PageOrnaments` radial glows), no purple, no centered hero on app pages.
- No em/en dashes anywhere in the codebase. Use `;`, `,`, or `.` instead.

---

## 5. Services & Free Tiers

| Service | Usage | Free limit |
|---|---|---|
| LLM | Gemini 2.5 Flash (4-key rotation via AI Gateway) | ~250 req/day per key |
| Embeddings | Gemini text-embedding-004 | ~1,500 req/day |
| AI Gateway | Proxy, cache, rate limiting | 100k logged req/mo |
| KV Cache | AI tutor response cache | 100k reads/day, 1k writes/day |
| R2 | Object storage | 10 GB, zero egress |
| Pinecone | Primary vector store | 2 GB Serverless Starter |
| Vectorize (opt) | Secondary vector store | ~6,500 vectors at 768 dims |
| Turso | SQLite database | 5 GB, 500M row reads/mo |
| Inngest | Background job orchestration | 50k steps/mo |
| Resend | Transactional emails | 100/day |
| FCM | Push notifications | Free |
| Sentry | Error tracking | 5k events/mo |
| UploadThing | Dev file upload fallback | 2 GB |

## 6. Money & Quota Rules
- **AI Quota Philosophy**: AI should only be spent on:
  1. Tutor drawer explanation chat.
  2. Batched mistake feedback/explanations.
  3. Master Teaching Document chapter content generation.
- **Zero-AI Features**: Recommendations, Streaks, Study Paths, Cohort Analytics, and reflections are computed deterministically with SQL + logic. Do NOT call Gemini.
- **Write-Limit Guards**: Cloudflare Workers KV write limits must be guarded. Daily write counter under `meta:writes:{yyyy-mm-dd}` must stop writing when it approaches 900.

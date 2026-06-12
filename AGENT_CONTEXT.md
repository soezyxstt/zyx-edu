# ZYX Engineering Notes (Agent Context)

This document is the single, authoritative, compact source of truth for the project's current status, standing architectural decisions, coding constraints, and cost rules.

---

## 1. Current State

Last Updated: 2026-06-12

### Completed
- **SQLite migration completed**: Turso production configured, Local SQLite dev mode configured, DB queries routed successfully.
- **R2 migration completed**: UploadThing provider mode switched to R2 by default, assets uploaded and validated.
- **AI Gateway routing completed**: Gemini client configured to route all traffic through Cloudflare AI Gateway.
- **Storage abstraction completed**: Reusable storage client (`lib/storage/index.ts`) abstracting R2 and UploadThing providers.

### Verified
- SQLite/Turso schema setup and connection verified.
- R2 uploads and public CDN serving verified.
- AI Gateway metrics proxying verified.

### Current Focus
P0 Infrastructure Activation (Phase 0)
Remaining:
- KV namespace (configure `zyx-ai-cache` on Cloudflare and record ID)
- `docs/baselines.md` (baseline metrics table)
- `scripts/r2-smoke.ts` (health check verification script)

### Blockers
None

---

## 2. Core Architectural Stack
- **Database**: Turso for production, local SQLite (`dev.db`) for development. Never attempt to use PostgreSQL or neon-client.
- **Vector Store**: Pinecone (Serverless Starter) is the primary vector database. Vectorize (Cloudflare) is conditional only (P8).
- **Primary LLM**: Google Gemini API via `@google/genai` (Gemini 2.5 Flash is the primary model).
- **AI Gateway**: Cloudflare AI Gateway routes all Gemini traffic (`CF_AI_GATEWAY_URL`). Caching enabled for Tier 1 tutor queries.
- **Storage**: Cloudflare R2 bucket (`zyx`) is the storage provider. UploadThing is deprecated and pending complete teardown (P7).

---

## 3. Design & UI Constraints (UI-STD Summary)
- **Absolutely No Pills**: Do not use `rounded-full` on any element that is not a perfect 1:1 circle (e.g. avatars, checkmarks).
- **Minimizing Card/Box Nesting**: Use typography, padding, and subtle borders (`border-border`) first. Standard card pattern: `bg-card border border-border shadow-sm rounded-xl`.
- **Typography**: 
  - Brand headings: Lexend (mapped to `font-heading`, line-height 1.1x size).
  - Body & UI: Inter (mapped to `font-sans`, line-height 1.4x size).
- **Dark Mode**: Use semantic tokens only (e.g., `bg-background`, `text-muted-foreground`, `border-border`). Never use raw hex values or Tailwind defaults like `bg-slate-100`.

---

## 4. Money & Quota Rules
- **AI Quota Philosophy**: AI should only be spent on:
  1. Tutor drawer explanation chat.
  2. Batched mistake feedback/explanations.
  3. Master Teaching Document chapter content generation.
- **Zero-AI Features**: Recommendations, Streaks, Study Paths, Cohort Analytics, and reflections are computed deterministically with SQL + logic. Do NOT call Gemini.
- **Write-Limit Guards**: Cloudflare Workers KV write limits must be guarded. Daily write counter under `meta:writes:{yyyy-mm-dd}` must stop writing when it approaches 900.

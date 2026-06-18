# Deployment Guide

## Architecture

Production runs on Vercel (Next.js) + Turso (DB) with supporting Cloudflare services.

```
Vercel (Next.js App Router)
 ├── Turso (libsql database)
 ├── Cloudflare R2 (object storage)
 ├── Inngest Cloud (background jobs)
 ├── Cloudflare AI Gateway (Gemini proxy)
 ├── Pinecone (vector store)
 └── Cloudflare Workers (3 services)
```

## Vercel Deployment

1. Connect repo to Vercel
2. Set all env vars from `lib/env.ts` in Vercel dashboard
3. Deploy — App Router + Server Actions work natively

## Turso Database

### Setup
```bash
# Install Turso CLI
npm install -g turso
turso auth login

# Create database
turso db create zyx-academy

# Create auth token
turso db create-token zyx-academy

# Set env vars:
# TURSO_CONNECTION_URL = libsql://...
# TURSO_AUTH_TOKEN = <token>
```

### Migration
```bash
npm run db:push:prod   # safe runner: backup → migrate → verify
```

The production migration script (`db/push-prod.ts`):
1. Backs up all tables to `drizzle/backups/`
2. Verifies DB connectivity
3. Applies pending migrations
4. Validates row counts (detects data loss)
5. Checks foreign key integrity

## Cloudflare Workers

Three Workers support the app:

### 1. zyx-vector-api (Vectorize proxy)
```
workers/vector-api/
├── wrangler.toml
├── index.ts
```

- Proxies upsert/query/delete to Cloudflare Vectorize
- Required only when `VECTOR_STORE=vectorize` or `dual`

```bash
cd workers/vector-api
wrangler deploy
wrangler secret put SHARED_SECRET
```

### 2. zyxrealtime (Live quiz WebSocket/SSE)
```
workers/realtime/
├── wrangler.toml
├── src/index.ts
```

- Durable Object `LiveQuizRoom` for real-time quiz sessions
- Deployed separately via `wrangler deploy`

```bash
cd workers/realtime
wrangler deploy
```

### 3. zyxacademydiktat (PDF renderer)
- Puppeteer service hosted on Railway
- Receives HTML → renders A4 PDF → returns to app
- Configured via `DIKTAT_RENDERER_URL` + `DIKTAT_RENDERER_SECRET`

## External Services Reference

| Service | Usage | Free Tier Limit |
|---|---|---|
| R2 | Object storage (PDFs, assets) | 10 GB, zero egress |
| Pinecone | Primary vector store | 2 GB Serverless Starter |
| Cloudflare AI Gateway | Gemini proxy, caching, rate limiting | 100k logged req/mo |
| Cloudflare KV | AI response cache | 100k reads/day, 1k writes/day |
| Inngest | Background job orchestration | 50k steps/mo |
| Resend | Transactional emails | 100 emails/day |
| Firebase Cloud Messaging | Push notifications | Free |
| Sentry | Error tracking | 5k events/mo |
| UploadThing | Dev file upload fallback | 2 GB |

## Feature Flags

All `FEATURE_*` env vars default to off. Enable gradually per environment. See [DEVELOPMENT.md](./DEVELOPMENT.md#feature-flags) for the full list.

# Baselines

Last updated: 2026-06-13

## P8 Vectorize Migration — Activation Record (Gate 8.1)

Trigger: Strategic consolidation — operational simplicity of running all
infrastructure on Cloudflare. Pinecone free tier is functional but adds a
third-party dependency outside the CF stack.

Decision recorded: 2026-06-13. Fill in Pinecone record count from the Pinecone
console before running the backfill script, then record the post-backfill
Vectorize count (gate 8.2).

## P8 Gate Status

| Gate | Test | Status |
|------|------|--------|
| 8.1 | Trigger + counts documented before code | done |
| 8.2 | Vectorize count == Pinecone count after backfill | pending — record counts below |
| 8.3 | shadow-compare overlap@5 >= 80% on 50 queries | pending |
| 8.4 | Vectorize p95 <= Pinecone p95 + 100 ms | pending |
| 8.5 | grep -ri pinecone lib app only hits retired adapter | pending |

## Metrics

| Metric | Value | Source | Date |
|--------|-------|--------|------|
| Vercel p75 load (ms) | — | Vercel Analytics | |
| Gemini req/day | — | AI Gateway dashboard | |
| Turso row reads/day | — | Turso console | |
| Pinecone record count (pre-backfill) | — | Pinecone console | fill before backfill |
| Vectorize record count (post-backfill) | — | wrangler vectorize describe zyx-edu | fill after backfill |

# ZYX Academy Master Plan (v3, modular)

One file per phase. Work top to bottom in the order below. Before ANY phase, read `globals.md` in this folder: it holds the execution rules, the UI Build Standard (referenced everywhere as UI-STD), and the service inventory. A phase is done only when every box in its file is checked and its Gate table is green.

## Execution order and status

| Order | File | Phase | Depends on | Status |
|---|---|---|---|---|
| 1 | [p0.md](p0.md) | Infrastructure activation | none | [ ] not started |
| 2 | [p1a.md](p1a.md) | Persistent mastery foundation | P0 | [ ] not started |
| 3 | [p3.md](p3.md) | Grounded AI tutor + learner memory + KV cache | P0, P1A | [ ] not started |
| 4 | [p2.md](p2.md) | Daily recommendations + streak | P1A | [ ] not started |
| 5 | [p1b.md](p1b.md) | Mastery intelligence layer | P1A | [ ] not started |
| 6 | [p4.md](p4.md) | Quiz feedback + adaptive companion | P1A, P3 (KV), P2 (builders); rule 2 needs P1B | [ ] not started |
| 7 | [p6a.md](p6a.md) | Tutor analytics MVP (parallel-ok after P1A) | P1A | [ ] not started |
| 8 | [pwr.md](pwr.md) | Weekly learning reflection (parallel-ok with P5) | P1A, P1B, P2 | [ ] not started |
| 9 | [p5.md](p5.md) | Personalized study paths | P1A, P1B, P2 | [ ] not started |
| 10 | [p6b.md](p6b.md) | Advanced cohort intelligence | P6A, P1B, P4 | [ ] not started |
| 11 | [p7.md](p7.md) | R2 storage (migration done 2026-06-10, teardown remains) | P0 | [~] mostly done |
| 12 | [p9.md](p9.md) | Real-time classroom (GATED) | P1A+P1B, P2, P4, P6A live in prod | [ ] gated |
| 13 | [p8.md](p8.md) | Vectorize migration (CONDITIONAL) | P3 adapter + fired trigger + size gate | [ ] conditional |
| 14 | [p10.md](p10.md) | Hardening, observability, cost control | all shipped phases | [ ] not started |

Update the Status column as you go: `[ ] not started`, `[~] in progress`, `[x] done (gate green, date)`.

## Dependency graph

```text
P0 ──→ P1A ──┬─→ P3  (profile reads P1A)
             ├─→ P2  (mastery picks)
             ├─→ P6A (only needs P1A, parallel-ok)
             └─→ P1B ──┬─→ P4 rule 2   (P4 rule 1 needs only P1A)
                       ├─→ PWR         (growth deltas; also needs P2 streak)
                       ├─→ P5          (locking)
                       └─→ P6B         (trends; builds on P6A + P4)
P7  independent after P0
P9  GATED on P1A+P1B, P2, P4, P6A in production
P8  CONDITIONAL on trigger + size gate; requires P3 adapter
P10 last
```

## Seed and script inventory (committed, reusable)

| Script | Phase | Asserts |
|---|---|---|
| `scripts/r2-smoke.ts` | P0 | R2 round trip |
| `scripts/seed-mastery.ts` | P1A | Math parity ±2 |
| `scripts/seed-streak.ts` | P2 | 3 streak scenarios |
| `scripts/seed-trends.ts` | P1B | 3 trend labels |
| `scripts/seed-interventions.ts` | P4 | Rule 1, resolution, dedupe |
| `scripts/seed-demo-cohort.ts` | P6A | Top-2 ranking, pitch screenshots |
| `scripts/seed-reflection.ts` | PWR | Exact payload {4, 82, 6, +11} |
| `scripts/seed-paths.ts` | P5 | Divergence, soundness, cycle |
| `scripts/seed-cohort-history.ts` | P6B | Sparkline data |
| `scripts/migrate-uploadthing-to-r2.ts`, `verify-then-delete-ut.ts`, `check-file-links.ts` | P7 | Migration safety |
| `scripts/load-test-live.ts` | P9 | Capacity, replay |
| `scripts/run-evals.ts` | P10 | Composite regression gate |

## Risk register

| Risk | Phase | Mitigation in plan |
|---|---|---|
| Gemini 250/day too small after feedback + summaries + Tier 3 | P3, P4 | Two cache layers, batched feedback (1 call/submission), Tier 3 budget-capped with silent fallback, everything else 0-AI |
| Personalized text poisoning shared cache | P3 | Only profile-free Tier 1 cached; Gate 3.2 inspects KV values |
| KV 1k writes/day | P3, P4 | Counter guard stops writes at 900; reads unaffected |
| Resend 100/day vs reflections | PWR | In-app primary; email flag off until weekly actives <= 90 |
| Sparse prerequisite edges | P1B, P5 | Chapter-order fallback + content audit with coverage % |
| Small cohorts make analytics noisy | P6A | Min 5 evidenced students per concept + engineered demo dataset |
| Vectorize too small | P8 | Conditional phase, size gate, adapter makes "never migrate" free |
| DO free-tier terms drift before P9 opens | P9 | Phase gated; re-verify terms at gate time; SQLite-backed DOs required |
| Backfill data loss | P7 | Verify-before-delete in two separate scripts, resumable, link checks pre/post |
| Inngest 50k steps/mo | P1A, P1B, PWR | 1 recompute per session, batch crons, usage check after each launch |

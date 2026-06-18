# Zyx Academy

**Stack:** Next.js 16 (App Router), Drizzle ORM + Turso/SQLite, Better-Auth, Google Gemini, Pinecone/Vectorize, Cloudflare R2, Inngest.

## Docs

| File | What it covers |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Full system architecture: 4-layer design, all database tables, AI pipelines, directory map, data flows |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Dev setup, commands, env vars, feature flags, code conventions |
| [DATABASE.md](docs/DATABASE.md) | Schema domains, migration workflow, key design decisions |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production architecture, Turso, Cloudflare Workers, services |
| [features.md](docs/features.md) | User-facing workflows: roles, pipelines, quota rules |

## Quick Start

```bash
bun install
cp .env.example .env.local   # fill in secrets
bun run dev                   # http://localhost:3000
```

## Reference

- **[AGENT_CONTEXT.md](AGENT_CONTEXT.md)**; current development state, blockers, standing decisions
- **[AGENTS.md](AGENTS.md)**; coding rules and conventions for AI agents

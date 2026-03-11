# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Toolforge "Deploy & Observe" — a GitHub Action that triggers Toolforge deployments + a mini dashboard to inspect deployment status/logs. Take-home test for Wikimedia.

## Commands

### Action (`action/`)
```bash
cd action && npm run build        # Bundle with ncc → dist/index.js
cd action && npm run typecheck    # tsc --noEmit
```

### Dashboard (`dashboard/`)
```bash
cd dashboard && npm run dev           # Concurrent server (port 3000) + Vite client (port 5173)
cd dashboard && npm run dev:server    # Server only (tsx watch)
cd dashboard && npm run dev:client    # Vite client only
cd dashboard && npm run build         # Vite build + tsc server
cd dashboard && npm run start         # Run production server
cd dashboard && npm run typecheck     # Typecheck client + server
```

### Docker
```bash
docker compose up                     # Dashboard with MOCK_MODE=true by default
MOCK_MODE=false TOOLFORGE_TOOL_NAME=x TOOLFORGE_DEPLOY_TOKEN=y docker compose up
```

## Architecture

Two **independent packages** (no monorepo tooling, no shared dependencies):

- **`action/`** — JS GitHub Action (CommonJS, bundled with `@vercel/ncc`). Triggers deployment via Toolforge Components API, polls for completion, writes GitHub Job Summary.
- **`dashboard/`** — Express backend + React SPA (ESM). Backend proxies Toolforge API (token never reaches browser). Client uses TanStack Query for data fetching/polling.

Both packages have their own `ToolforgeClient` with identical retry/backoff logic. This is intentional — they are independently deployable.

### Dashboard data flow
```
Browser → React (TanStack Query) → /api/* → Express routes → ToolforgeClient → Toolforge API
                                                           → mock-data.ts (if MOCK_MODE=true)
```

### Key files
- `dashboard/src/server/routes.ts` — API routes, uses discriminated union Config type
- `dashboard/src/server/toolforge-client.ts` — HTTP client with retry
- `dashboard/src/server/mock-data.ts` — Realistic mock data for demo
- `dashboard/src/shared/types.ts` — Types shared between server and client
- `action/src/api-client.ts` — HTTP client with retry + auth/timeout error classes

## TypeScript

- **Strict mode** everywhere, no `any`
- Action: CommonJS target, `outDir: dist`
- Dashboard has **two tsconfigs**: `tsconfig.json` (client, `noEmit`, Vite handles build) and `tsconfig.server.json` (server + shared, outputs to `dist/`)
- Server tsconfig `rootDir` is `src` — so `src/server/index.ts` → `dist/server/index.js`

## Conventions

- `interface` for object shapes, `type` for unions
- React: functional components, one per file, TanStack Query for all server state (no useState+useEffect for fetching)
- Express routes: discriminated union Config type (`mockMode: true` → `client: null`, `mockMode: false` → `client: ToolforgeClient`)
- Token handling: header-only (`Api-Key`), never in URLs/logs, `core.setSecret()` in action
- Retry: exponential backoff (1s, 2s, 4s), respects `Retry-After` header, retries on 429/5xx

## Environment Variables

Required when `MOCK_MODE` is not `true`:
- `TOOLFORGE_TOOL_NAME` — tool name on Toolforge
- `TOOLFORGE_DEPLOY_TOKEN` — deploy token (secret)

Optional:
- `TOOLFORGE_API_URL` (default: `https://api.svc.toolforge.org`)
- `MOCK_MODE` (default: `false`, set `true` for demo without real token)
- `PORT` (default: `3000`)

## Development Workflow

Each phase follows: develop → code review (agent) → `/simplify` → fix → commit.

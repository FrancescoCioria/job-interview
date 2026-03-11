# Design Document

## Overview

This project consists of two independent deliverables:

- **GitHub Action** (`action/`): Triggers and monitors Toolforge deployments from CI
- **Deployment Inspector** (`dashboard/`): Web UI to view deployment status and build logs

Both are TypeScript-strict, independently deployable, and designed to work with or without real Toolforge credentials.

## API Endpoints

The dashboard backend proxies these [Toolforge Components API](https://wikitech.wikimedia.org/wiki/Help:Toolforge/Components_API) endpoints:

```
GET  /components/v1/tool/{name}/deployment          → list deployments
GET  /components/v1/tool/{name}/deployment/{id}      → single deployment
GET  /builds/v1/tool/{name}/builds/{buildId}/logs    → build logs (text/plain)
```

## GitHub Action Reference

### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `tool_name` | Yes | — | Toolforge tool name |
| `deploy_token` | Yes | — | Deploy token (pass as secret) |
| `api_base_url` | No | `https://api.svc.toolforge.org` | API base URL |
| `force_build` | No | `false` | Force rebuild |
| `force_run` | No | `false` | Force restart |
| `timeout_seconds` | No | `300` | Max wait time |
| `dashboard_url` | No | — | Dashboard URL for Job Summary links |

### Outputs

| Output | Description |
|--------|-------------|
| `deployment_id` | ID of the triggered deployment |
| `deployment_status` | Final status (`successful`, `failed`, `timed_out`, etc.) |
| `deployment_url` | API URL to check deployment status |

### Behavior

1. Triggers a deployment via `POST /components/v1/tool/{name}/deployment`
2. Polls status every 5-15s with exponential backoff
3. Writes a GitHub Job Summary with deployment details, component status, and dashboard links
4. Sets outputs for downstream workflow steps
5. Fails the step if the deployment fails, times out, or encounters an API error

## Dashboard Features

- **Deployment list** with status badges, timestamps, and auto-polling
- **Deployment detail** with per-component build/run status
- **Build logs viewer** with terminal-style output
- **Mock mode** for demo/development without Toolforge credentials
- **Smart polling**: auto-refreshes every 5s while deployments are active, stops when complete

## Key Design Decisions

### Two Independent Packages

The action and dashboard share no code at build/runtime. Both contain their own `ToolforgeClient` with identical retry logic. This is intentional:

- The GitHub Action runs in a GitHub-hosted runner — it can't import from a sibling directory
- The dashboard deploys independently (Docker, VPS, etc.)
- No monorepo tooling means zero configuration overhead for reviewers
- The trade-off is manual type synchronization between `action/src/types.ts` and `dashboard/src/shared/types.ts`

### Backend Proxy Pattern

The dashboard frontend never communicates directly with the Toolforge API. All requests go through the Express backend, which attaches the `Api-Key` header server-side.

**Why**: The deploy token is a secret. Exposing it to the browser (even via environment variables at build time) would allow anyone with access to the dashboard to extract and misuse it.

**Data flow**:
```
Browser → /api/deployments → Express → Toolforge API (with Api-Key header)
```

### Mock Mode

The dashboard supports `MOCK_MODE=true`, which serves realistic sample data without any Toolforge credentials. This is critical because:

- Reviewers can evaluate the full UI without a Toolforge account
- `docker compose up` works out of the box with zero configuration
- Development doesn't depend on API availability

Mock data includes deployments in various states (running, successful, failed, timed out) to exercise all UI code paths.

### Discriminated Union Config

The Express server uses a discriminated union for configuration:

```typescript
type Config =
  | { mockMode: true; toolName: string; client: null }
  | { mockMode: false; toolName: string; client: ToolforgeClient };
```

This makes it impossible to accidentally use a null client in production mode — TypeScript enforces the check at compile time. Routes branch on `config.mockMode` and the compiler guarantees `config.client` is available when `mockMode` is `false`.

### TanStack Query for Server State

All data fetching uses TanStack Query (React Query) instead of `useState` + `useEffect`. Benefits:

- Automatic cache management and deduplication
- Built-in loading/error states
- Conditional polling: `refetchInterval` returns `5000` for active deployments, `false` for terminal ones — no wasted requests
- Background refetching with stale-while-revalidate

## Retry and Backoff Strategy

Both packages implement the same retry logic:

- **Max retries**: 3
- **Backoff**: Exponential (1s, 2s, 4s)
- **Retry-After**: If the API returns a `Retry-After` header, it takes precedence over calculated backoff
- **Retryable status codes**: 429 (rate limited), 500, 502, 503, 504
- **Non-retryable**: 401/403 (auth errors fail immediately with a specific error class)

The action's polling uses a separate strategy: 5s initial interval, increasing by 2s per poll up to 15s, with a configurable overall timeout (default 300s).

## Error Handling

### GitHub Action

Errors are classified into specific types with distinct handling:

| Error Type | Behavior |
|------------|----------|
| `ToolforgeAuthError` (401/403) | Fail immediately, message: "check your deploy token" |
| `ToolforgeTimeoutError` | Fail with elapsed time and last known status |
| `ToolforgeApiError` (5xx) | Retry with backoff, then fail with status code |
| Deployment `failed`/`timed_out` | Fail with `long_status` from the API |

All error paths still write a Job Summary so the developer can see what happened.

### Dashboard

- **Backend**: Catches `ToolforgeApiError`, maps 4xx → original status code, 5xx → 502 (Bad Gateway)
- **Frontend**: TanStack Query surfaces errors automatically. The `ErrorMessage` component renders with a retry button.

## Security Considerations

### Token Handling

- **Action**: `core.setSecret()` masks the token in GitHub Actions logs. Token is sent only in the `Api-Key` HTTP header.
- **Dashboard**: Token exists only in server-side environment variables. The Express proxy attaches it to outgoing requests. The React client has no access to it.
- **Never in URLs**: The token is never placed in URL query parameters, which could appear in server logs or browser history.

### Docker

- Multi-stage build keeps build-time dependencies out of the production image
- Runtime container runs as a non-root user (`app`)
- No secrets baked into the image — all configuration via environment variables at runtime

### CORS

- Production: CORS is not enabled (Express serves both API and static files from the same origin)
- Development: CORS allows the Vite dev server origin (port 5173) to reach the API (port 3000)

## Failure Modes

| Scenario | Action Behavior | Dashboard Behavior |
|----------|----------------|-------------------|
| Invalid token | Fails with auth error | Returns 401 to client, shows error |
| API unreachable | Retries 3x, then fails | Retries 3x, returns 502, shows error with retry button |
| Rate limited (429) | Respects Retry-After, retries | Respects Retry-After, retries |
| Deployment times out | Fails after `timeout_seconds` | Shows `timed_out` status badge |
| No credentials + mock off | N/A | Server exits with clear error message |

## Testing Strategy

Given the project scope, testing relies on:

1. **TypeScript strict mode** as the primary defense against type errors (no `any` allowed)
2. **Mock mode** as a manual integration test — exercises all UI components with realistic data
3. **Build verification** — both `npm run build` and `npm run typecheck` must pass
4. **Example workflow** (`.github/workflows/deploy.yml`) demonstrates real-world usage

With more time, the next additions would be:

- **Vitest** unit tests for retry logic, polling, and API client methods
- **Playwright** E2E tests against mock mode
- **GitHub Actions CI** to run typecheck + tests on every PR

## Trade-offs

| Decision | Benefit | Cost |
|----------|---------|------|
| No shared code between packages | Independent deployability, simple setup | Manual type synchronization |
| Express proxy instead of direct API calls | Token stays server-side | Extra hop, slightly more latency |
| TanStack Query over raw fetch | Caching, polling, error handling for free | Additional dependency (~30KB) |
| Mock mode with static data | Zero-config demo experience | Mock data may drift from real API shape |
| No test framework | Faster development in timebox | Relies on types + manual testing |
| Polling instead of WebSocket | Simpler implementation, works with any proxy | Higher latency, unnecessary requests |

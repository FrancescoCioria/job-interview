# Development Guidelines

## Workflow per Fase

Ogni fase di sviluppo segue questo processo prima del commit:

1. **Sviluppo** - Implementare la feature
2. **Code Review** - Lanciare un agente separato che revisiona il codice prodotto
3. **Simplify** - Eseguire `/simplify` per verificare riuso, qualita' ed efficienza
4. **Fix** - Applicare le correzioni emerse dai due step precedenti
5. **Commit** - Solo dopo aver superato review e simplify

## Project Structure

```
toolforge-deploy-and-observe/
├── action/          # GitHub Action (standalone, no shared deps with dashboard)
├── dashboard/
│   ├── src/
│   │   ├── server/  # Express backend
│   │   └── client/  # React SPA
│   └── Dockerfile
├── .github/workflows/
└── docs/
```

- `action/` and `dashboard/` are independent packages with separate `package.json`
- No monorepo tooling (no turborepo, no workspaces) - keep it simple
- Shared types between server and client live in `dashboard/src/shared/types.ts`

## TypeScript

- Strict mode enabled (`"strict": true`)
- No `any` - use `unknown` and narrow, or define proper types
- Prefer `interface` for object shapes, `type` for unions/intersections
- Export types separately from runtime code when possible
- Name types with PascalCase, variables and functions with camelCase

```ts
// Good
interface Deployment {
  deployId: string;
  status: DeploymentStatus;
  creationTime: string;
}

type DeploymentStatus = "pending" | "running" | "successful" | "failed" | "timed_out" | "cancelled";

// Bad
type deployment = {
  deploy_id: any;
}
```

## API Client (Backend)

- All Toolforge API calls go through a single `ToolforgeClient` class
- Constructor takes `baseUrl` and `token`
- Every method returns typed responses, never raw `fetch` results
- Retry logic with exponential backoff lives in one place (private `request` method)
- Never log or expose the token - mask it at construction time

```ts
class ToolforgeClient {
  private request<T>(method: string, path: string, opts?: RequestOpts): Promise<T>
  getDeployments(toolName: string): Promise<Deployment[]>
  getDeployment(toolName: string, deployId: string): Promise<Deployment>
  triggerDeployment(toolName: string, opts?: DeployOpts): Promise<Deployment>
}
```

## React Components

- Functional components only
- One component per file, filename matches component name
- Colocate component-specific styles (CSS modules or Tailwind in the same file)
- No prop drilling beyond 2 levels - use TanStack Query for server state

### File naming

```
components/StatusBadge.tsx    # Reusable UI pieces
pages/DeploymentList.tsx      # Route-level components
hooks/useDeployments.ts       # Custom hooks wrapping TanStack Query
lib/api.ts                    # API fetch functions
```

### Data fetching pattern

All server state goes through TanStack Query. Never use `useState` + `useEffect` for fetching.

```tsx
// hooks/useDeployments.ts
export function useDeployments() {
  return useQuery({
    queryKey: ["deployments"],
    queryFn: () => api.getDeployments(),
  });
}

// hooks/useDeployment.ts
export function useDeployment(id: string) {
  return useQuery({
    queryKey: ["deployment", id],
    queryFn: () => api.getDeployment(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "running" ? 5000 : false;
    },
  });
}
```

### UI state conventions

- Loading: use shadcn `Skeleton` components, never spinners
- Errors: inline error message with retry button, never silent failures
- Empty state: explicit message ("No deployments found"), never blank page

## Express Backend

- Minimal: only proxy routes + static file serving
- No ORM, no database - the backend is a pass-through to Toolforge API
- Validate environment variables at startup, fail fast with clear message
- All routes under `/api/` prefix
- Error responses follow a consistent shape:

```ts
interface ApiError {
  error: string;
  detail?: string;
}
```

## Mock Mode

The dashboard must work without a real Toolforge token.

- Activated via `MOCK_MODE=true` environment variable
- Mock data lives in `dashboard/src/server/mock-data.ts`
- Mock data is realistic: real-looking IDs, plausible timestamps, mix of statuses
- The mock implementation follows the same interface as the real client
- A visible banner in the UI indicates mock mode is active

## Error Handling

### GitHub Action
- Distinguish failure types via exit codes and output variables:
  - Auth failure (401/403) → fail immediately, clear message
  - API error (5xx) → retry with backoff, then fail
  - Rate limited (429) → respect Retry-After header
  - Timeout → fail with elapsed time and last known status
  - Deployment failed → fail with `long_status` from API

### Dashboard
- Backend: catch errors from Toolforge API, return structured error to frontend
- Frontend: TanStack Query `onError` + error boundaries for unexpected crashes
- Never show raw stack traces to the user

## Security

- Deploy token exists only in backend env vars, never sent to the browser
- Backend proxies all API calls - the frontend only talks to our Express server
- `core.setSecret()` in GitHub Action to mask token in logs
- No token in URL query parameters (use headers only)
- CORS: restricted to same-origin in production

## Testing Strategy

Given the 3-hour timebox, we don't write unit tests. Instead:

- **Type safety** is our primary defense against bugs (strict TypeScript)
- **Mock mode** serves as a manual integration test
- The GitHub Action includes a sample workflow file for real-world testing
- The `DESIGN.md` documents what tests we'd add with more time

## Git Conventions

- Commits: imperative mood, short subject line (`Add deployment polling logic`)
- One logical change per commit
- No generated files in commits except `action/dist/` (required for JS actions)

## Dependencies Policy

- Minimize dependencies - every dep is a liability the reviewer has to trust
- Pin exact versions in `package.json` (no `^` or `~`)
- Prefer well-known packages: `@actions/core`, `express`, `@tanstack/react-query`
- No utility libraries for things the language handles (no lodash, no moment)

## Docker

- Multi-stage build: stage 1 builds, stage 2 runs with `node:20-alpine`
- `.dockerignore` excludes `node_modules`, `.env`, `.git`
- The container runs as non-root user
- Health check endpoint: `GET /api/health`

## Environment Variables

All configuration via env vars, documented in `.env.example`:

```env
# Required
TOOLFORGE_TOOL_NAME=my-tool
TOOLFORGE_DEPLOY_TOKEN=your-token-here

# Optional
TOOLFORGE_API_URL=https://api.svc.toolforge.org
MOCK_MODE=false
PORT=3000
```

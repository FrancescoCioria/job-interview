# Toolforge Deploy & Observe

A GitHub Action that triggers [Toolforge](https://wikitech.wikimedia.org/wiki/Help:Toolforge) deployments via the Components API, paired with a web dashboard to inspect deployment status and logs.

## Getting Started

### Try it now (mock mode — no credentials needed)

```bash
cd dashboard && npm install && MOCK_MODE=true npm run dev
```

Opens at http://localhost:5173 with realistic sample data. Or with Docker: `docker compose up`.

### Connect to a real API

The dashboard backend acts as a proxy: you tell it **which API to call**, and it forwards every request there with the token attached. The browser never talks to the API directly.

```
Browser → React → /api/* → Express backend → TOOLFORGE_API_URL (your API)
```

You configure the backend with three environment variables:

| Variable | What it does | Example |
|----------|-------------|---------|
| `TOOLFORGE_API_URL` | Base URL of the API to connect to | `http://localhost:8080` or `https://api.svc.toolforge.org` |
| `TOOLFORGE_TOOL_NAME` | Tool name, used in API paths | `my-tool` |
| `TOOLFORGE_DEPLOY_TOKEN` | Token sent in the `Api-Key` header on every request | `tf-dp-xxxxxxxx` |

The API must expose these endpoints ([Toolforge Components API](https://wikitech.wikimedia.org/wiki/Help:Toolforge/Components_API)):

```
GET  /components/v1/tool/{name}/deployment          → list deployments
GET  /components/v1/tool/{name}/deployment/{id}      → single deployment
GET  /builds/v1/tool/{name}/builds/{buildId}/logs    → build logs (text/plain)
```

#### Quick one-liner

```bash
cd dashboard && npm install
TOOLFORGE_API_URL=http://localhost:8080 \
TOOLFORGE_TOOL_NAME=my-tool \
TOOLFORGE_DEPLOY_TOKEN=my-token \
npm run dev
```

That's it — the dashboard opens at http://localhost:5173.

#### Using a `.env` file (recommended for repeated use)

```bash
cd dashboard
npm install
cp .env.example .env
```

Edit `.env` — point `TOOLFORGE_API_URL` at your API:

```env
TOOLFORGE_API_URL=http://localhost:8080
TOOLFORGE_TOOL_NAME=my-tool
TOOLFORGE_DEPLOY_TOKEN=my-token
```

Then:

```bash
npm run dev:live          # dev mode with hot-reload (Vite on :5173, API on :3000)

# — or —
npm run build && npm run start:live   # production build on :3000
```

`dev:live` and `start:live` load `.env` automatically (Node `--env-file`, requires Node >= 20.6).

> `TOOLFORGE_API_URL` defaults to `https://api.svc.toolforge.org` if omitted.

#### With Docker

Create a `.env` in the project root (Docker Compose loads it automatically):

```bash
cp dashboard/.env.example .env   # edit, then:
docker compose up
```

### All environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TOOLFORGE_API_URL` | No | `https://api.svc.toolforge.org` | Base URL of the API to connect to |
| `TOOLFORGE_TOOL_NAME` | Yes (unless mock) | — | Tool name on Toolforge |
| `TOOLFORGE_DEPLOY_TOKEN` | Yes (unless mock) | — | Token sent in `Api-Key` header |
| `MOCK_MODE` | No | `false` | Set `true` to use sample data without credentials |
| `PORT` | No | `3000` | Dashboard server port |

---

## Repository Structure

```
├── action/          GitHub Action (TypeScript, bundled with @vercel/ncc)
├── dashboard/       Deployment Inspector (Express + React SPA)
├── .github/         Example workflow
└── docker-compose.yml
```

The two packages are independent — no shared dependencies, no monorepo tooling. Each has its own `package.json`, `tsconfig.json`, and can be deployed separately.

## GitHub Action

### Usage

```yaml
- name: Deploy to Toolforge
  uses: your-org/toolforge-deploy-and-observe/action@main
  with:
    tool_name: my-tool
    deploy_token: ${{ secrets.TOOLFORGE_DEPLOY_TOKEN }}
```

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

### What it does

1. Triggers a deployment via `POST /components/v1/tool/{name}/deployment`
2. Polls status every 5-15s with exponential backoff
3. Writes a GitHub Job Summary with deployment details, component status, and dashboard links
4. Sets outputs for downstream workflow steps
5. Fails the step if the deployment fails, times out, or encounters an API error

### Security

- Token is masked in logs via `core.setSecret()`
- Token is sent only in the `Api-Key` header, never in URLs or query parameters
- Auth failures (401/403) fail immediately without retry

## Dashboard Details

### Features

- **Deployment list** with status badges, timestamps, and auto-polling
- **Deployment detail** with per-component build/run status
- **Build logs viewer** with terminal-style output
- **Mock mode** for demo/development without Toolforge credentials
- **Smart polling**: auto-refreshes every 5s while deployments are active, stops when complete

### Architecture

```
Browser → React (TanStack Query) → /api/* → Express → ToolforgeClient → Toolforge API
                                                     → mock-data.ts (if MOCK_MODE=true)
```

The backend acts as a proxy: the browser only talks to the Express server, which forwards requests to the Toolforge API with the token attached. This keeps the deploy token server-side only.

## Development

### Action

```bash
cd action
npm install
npm run typecheck    # Type check
npm run build        # Bundle with ncc → dist/index.js
```

### Dashboard

```bash
cd dashboard
npm install
npm run dev          # Server (port 3000) + Vite client (port 5173)
npm run typecheck    # Type check client + server
npm run build        # Production build
npm run start        # Run production server
```

## Future Improvements

- **Unit tests**: Add Vitest for both packages with mock API responses
- **Trigger deployments** from the dashboard (POST endpoint + UI button)
- **WebSocket/SSE** for real-time log streaming instead of polling
- **Shared types package**: Extract common types to avoid manual sync between action and dashboard
- **Authentication** for the dashboard itself (currently relies on network-level access control)
- **Deployment history**: Persist and visualize deployment trends over time

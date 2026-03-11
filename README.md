# Toolforge Deploy & Observe

A GitHub Action that triggers [Toolforge](https://wikitech.wikimedia.org/wiki/Help:Toolforge) deployments via the Components API, paired with a web dashboard to inspect deployment status and logs.

```
├── action/          GitHub Action (TypeScript, bundled with @vercel/ncc)
├── dashboard/       Deployment Inspector (Express + React SPA)
```

## Dashboard

### Try it (mock mode — no credentials needed)

```bash
cd dashboard && npm install && MOCK_MODE=true npm run dev
```

Opens at http://localhost:5173 with realistic sample data. Or with Docker: `docker compose up`.

### Connect to a real API

The Express backend proxies all requests to your API, attaching the token server-side. The browser never talks to the API directly.

```
Browser → React → /api/* → Express → TOOLFORGE_API_URL (your API)
```

**One-liner:**

```bash
cd dashboard && npm install
TOOLFORGE_API_URL=http://localhost:8080 \
TOOLFORGE_TOOL_NAME=my-tool \
TOOLFORGE_DEPLOY_TOKEN=my-token \
npm run dev
```

**With a `.env` file** (recommended for repeated use):

```bash
cp .env.example .env     # fill in API URL, tool name, and token
npm run dev:live          # loads .env automatically
```

**With Docker:**

```bash
cp dashboard/.env.example .env   # fill in values, then:
docker compose up
```

The API must implement the [Toolforge Components API](https://wikitech.wikimedia.org/wiki/Help:Toolforge/Components_API) endpoints. See [DESIGN.md](DESIGN.md) for details.

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TOOLFORGE_API_URL` | No | `https://api.svc.toolforge.org` | Base URL of the API to connect to |
| `TOOLFORGE_TOOL_NAME` | Yes (unless mock) | — | Tool name, used in API paths |
| `TOOLFORGE_DEPLOY_TOKEN` | Yes (unless mock) | — | Token sent in `Api-Key` header |
| `MOCK_MODE` | No | `false` | Use sample data without credentials |
| `PORT` | No | `3000` | Dashboard server port |

## GitHub Action

```yaml
- name: Deploy to Toolforge
  uses: your-org/toolforge-deploy-and-observe/action@main
  with:
    tool_name: my-tool
    deploy_token: ${{ secrets.TOOLFORGE_DEPLOY_TOKEN }}
```

See [DESIGN.md](DESIGN.md) for inputs, outputs, and behavior details.

## Development

```bash
# Action
cd action && npm install
npm run typecheck        # type check
npm run build            # bundle → dist/index.js

# Dashboard
cd dashboard && npm install
npm run dev              # server (:3000) + Vite (:5173)
npm run typecheck        # type check client + server
npm run build            # production build
npm run start            # run production server
```

## Architecture & Design

See [DESIGN.md](DESIGN.md) for architecture, design decisions, security model, error handling, and trade-offs.

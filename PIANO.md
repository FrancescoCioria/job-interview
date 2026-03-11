# Piano d'Azione - Toolforge "Deploy & Observe"

## Overview del Progetto

Due deliverable principali:
- **Part A**: GitHub Action riutilizzabile (`toolforge-deploy`) che triggera deploy via API
- **Part B**: Mini dashboard web ("Deployment Inspector") per visualizzare status e log

Deliverable aggiuntivi: `README.md`, `DESIGN.md`

---

## Struttura Repository

```
toolforge-deploy-and-observe/
├── action/                        # Part A - GitHub Action
│   ├── action.yml                 # Action metadata (composite action)
│   ├── src/
│   │   ├── index.ts               # Entry point
│   │   ├── api-client.ts          # Toolforge API wrapper (retry, backoff)
│   │   ├── poll.ts                # Polling logic con timeout
│   │   └── summary.ts             # GitHub Job Summary builder
│   ├── dist/                      # Compiled JS (necessario per JS action)
│   ├── package.json
│   └── tsconfig.json
│
├── dashboard/                     # Part B - Deployment Inspector
│   ├── src/
│   │   ├── server.ts              # Express backend (proxy API)
│   │   └── client/                # React SPA
│   │       ├── App.tsx
│   │       ├── pages/
│   │       │   ├── DeploymentList.tsx
│   │       │   └── DeploymentDetail.tsx
│   │       └── components/
│   │           ├── StatusBadge.tsx
│   │           └── ComponentCard.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile                 # Per testabilita' in qualsiasi ambiente
│   └── .env.example
│
├── .github/
│   └── workflows/
│       └── deploy.yml             # Esempio di workflow che usa l'action
│
├── README.md
├── DESIGN.md
└── docker-compose.yml             # One-command setup per chi testa
```

---

## Scelte Tecniche e Motivazioni

### Part A: GitHub Action

**Tipo: JavaScript Action** (non composite)
- Motivo: migliore gestione di retry/backoff, polling asincrono, e output strutturati
- TypeScript compilato in un singolo file con `@vercel/ncc`
- Dipendenze: `@actions/core`, `@actions/github` (ufficiali GitHub)

**Flusso:**
1. Riceve input (`tool_name`, `deploy_token`, ecc.)
2. `POST /components/v1/tool/{tool_name}/deployment` con token come header API key
   - Query params: `force-build`, `force-run` se richiesti
3. Polling su `GET /components/v1/tool/{tool_name}/deployment/{deploy_id}`
   - Intervallo: 5s iniziale, incrementale fino a 15s
   - Retry con exponential backoff su 429/5xx
   - Timeout configurabile (default 300s)
4. Al termine: setta outputs (`deployment_id`, `deployment_status`, `deployment_url`)
5. Scrive Job Summary in markdown con link alla dashboard

**Endpoint API coinvolti:**
- `POST /components/v1/tool/{toolname}/deployment` - trigger deploy
- `GET /components/v1/tool/{toolname}/deployment/{deployment_id}` - poll status
- Auth: header `Api-Key` con deploy token

**Sicurezza:**
- `core.setSecret()` per mascherare il token nei log
- Mai loggare URL con token in query string
- Failure modes espliciti: `timeout`, `deployment_failed`, `auth_error`, `api_error`

### Part B: Dashboard

**Stack: Express + React SPA (Vite)**
- Un solo `package.json` con Vite che serve sia frontend che backend in dev
- In produzione: Express serve i file statici di React + espone API proxy
- Motivo della scelta: stack richiesto nelle istruzioni globali (TypeScript + React), leggero, zero config per chi testa

**Backend Express (poche route):**
- `GET /api/deployments` → proxy a `GET /components/v1/tool/{tool}/deployment`
- `GET /api/deployments/:id` → proxy a `GET /components/v1/tool/{tool}/deployment/:id`
- `GET /api/builds/:tool/:id/logs` → proxy a `GET /builds/v1/tool/{tool}/builds/:id/logs` (stretch goal)
- Config via env vars: `TOOLFORGE_API_URL`, `TOOLFORGE_DEPLOY_TOKEN`, `TOOLFORGE_TOOL_NAME`

**Frontend React:**
- **Pagina 1 - Lista deployment:** tabella con deploy_id, creation_time, status, long_status
- **Pagina 2 - Dettaglio deployment:** per-component build status + run status, long_status espanso, bottone refresh (+ auto-polling ogni 10s se in corso)
- UI semplice e leggibile, no librerie CSS pesanti - solo CSS modules o Tailwind

**Stretch goal:** tab "Build Logs" che mostra i log dal builds API (`/builds/v1/tool/{tool}/builds/{id}/logs`)

---

## Piano di Esecuzione (Ordine di Sviluppo)

### Fase 1: Scaffolding (~15 min)
- [ ] Init repo git
- [ ] Setup struttura cartelle
- [ ] `package.json` per action e dashboard
- [ ] tsconfig per entrambi

### Fase 2: API Client condiviso (~20 min)
- [ ] Modulo `api-client.ts` riutilizzabile (usato sia dall'action che dal dashboard backend)
- [ ] Implementare: retry con exponential backoff, gestione errori tipizzata
- [ ] Tipi TypeScript per le response API (Deployment, Build, Component)

### Fase 3: GitHub Action (~40 min)
- [ ] `action.yml` con inputs/outputs definiti
- [ ] `src/index.ts`: trigger deploy, poll, emit outputs
- [ ] `src/summary.ts`: genera Job Summary markdown
- [ ] Build con `ncc` e commit della `dist/`
- [ ] Test manuale: creare un workflow di esempio `.github/workflows/deploy.yml`

### Fase 4: Dashboard Backend (~25 min)
- [ ] Express server con proxy routes
- [ ] Validazione env vars all'avvio
- [ ] Error handling (API down, token invalido, tool non trovato)

### Fase 5: Dashboard Frontend (~35 min)
- [ ] Setup Vite + React
- [ ] Pagina lista deployment con status badges
- [ ] Pagina dettaglio con component cards
- [ ] Refresh button + auto-polling
- [ ] (Stretch) Build logs viewer

### Fase 6: Portabilita' e Testing (~15 min)
- [ ] `Dockerfile` per la dashboard (multi-stage: build + serve)
- [ ] `docker-compose.yml` con env vars
- [ ] `.env.example` con tutte le variabili documentate
- [ ] Testare: `npm run dev`, `docker compose up`, build statico

### Fase 7: Documentazione (~15 min)
- [ ] `README.md`: come lanciare in locale, come usare l'action, miglioramenti futuri
- [ ] `DESIGN.md`: failure modes, auth/security, tradeoffs

### Fase 8: Finalizzazione (~10 min)
- [ ] Review codice per leggibilita'
- [ ] Verificare che non ci siano secrets esposti
- [ ] Git commit, push
- [ ] Verificare che il repo sia auto-contenuto e funzionante

---

## Punti Chiave per la Valutazione

### Leggibilita' del codice
- TypeScript con tipi espliciti (no `any`)
- Nomi di variabili/funzioni auto-documentanti
- Commenti solo dove il "perche'" non e' ovvio
- Struttura modulare e separazione delle responsabilita'

### Funzionamento in vari ambienti
- **Locale senza Docker**: `npm install && npm run dev` (richiede solo Node.js)
- **Locale con Docker**: `docker compose up` (zero config)
- **Cloud/CI**: Dockerfile pronto, env vars standard
- **GitHub Action**: testabile con `act` in locale o in un repo reale

### Sicurezza
- Token mai nei log o nel frontend
- Backend fa da proxy (il browser non parla direttamente con Toolforge API)
- CORS restrittivo in produzione

### Gestione Errori
- Distinguere chiaramente: timeout vs deploy fallito vs errore auth vs API irraggiungibile
- Messaggi di errore utili e actionable

---

## Note sulla Toolforge API

**Trigger deployment:**
```
POST /components/v1/tool/{toolname}/deployment
Header: Api-Key: <deploy_token>
Query: ?force-build=true&force-run=true (opzionali)
```

**Response Deployment:**
```json
{
  "deploy_id": "string",
  "creation_time": "datetime",
  "status": "pending|running|failed|timed_out|successful|cancelling|cancelled",
  "long_status": "string (human-readable narrative)",
  "builds": { "component_name": { "build_id", "build_status", "build_image", "build_long_status" } },
  "runs": { "component_name": { "run_status", "run_long_status" } }
}
```

**Build logs (stretch):**
```
GET /builds/v1/tool/{toolname}/builds/{id}/logs
Header: Api-Key: <deploy_token>
Response: newline-separated log text
```

---

## Rischi e Mitigazioni

| Rischio | Mitigazione |
|---------|-------------|
| Non ho accesso reale alla Toolforge API per testare | Implementare mock mode nel dashboard per demo; documentare chiaramente nel README |
| Il reviewer potrebbe non avere un deploy token | Fornire mock data / demo mode che funziona senza token |
| La GitHub Action non e' testabile senza un repo Toolforge reale | Fornire workflow di esempio + documentazione chiara |

**Idea importante: Demo/Mock Mode**
Aggiungere un flag `MOCK_MODE=true` nel dashboard che usa dati finti ma realistici. Questo permette al reviewer di:
1. Lanciare il dashboard senza token
2. Vedere l'UI funzionante con dati verosimili
3. Verificare la qualita' del codice senza setup Toolforge

# ClaudiaFlow

A breast milk expression and feeding tracker built as a Progressive Web App. Designed for daily use by a single family -- all data stays local in the browser's IndexedDB.

## Features

- **Session logging** -- record pumping and feeding sessions with amount, duration, side, and notes
- **Trends & charts** -- daily totals, session scatter plots, and range-based trend analysis (ECharts)
- **AI chat** -- conversational lactation support powered by LLMs via OpenRouter (streaming SSE)
- **Photo import** -- snap a photo of a pump display or handwritten log; AI extracts session data via OCR
- **AI insights** -- automated pattern detection and supply trend analysis
- **Data cleanup cards** -- AI-assisted duplicate detection and data quality suggestions
- **CSV & JSON import/export** -- move data in and out, with pivot-table CSV support
- **Offline-first PWA** -- installable, works without a network connection
- **Dark mode** -- system-aware with manual override
- **i18n** -- English and Spanish

## Tech Stack

| Layer    | Stack                                                       |
| -------- | ----------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router v7 |
| State    | Zustand (persisted stores)                                  |
| Database | Dexie (IndexedDB) with live queries                         |
| Charts   | ECharts via echarts-for-react                               |
| Backend  | Cloudflare Workers, Hono, Zod                               |
| AI       | OpenRouter API (configurable models)                        |
| Testing  | Vitest, Testing Library, MSW, Playwright, fake-indexeddb    |

## Project Structure

```
claudiaflow/
  src/                  # React frontend
    components/         # UI components
    pages/              # Route pages
    hooks/              # Custom React hooks
    stores/             # Zustand stores
    db/                 # Dexie schema & hooks
    lib/                # Utilities, API client, aggregation
    i18n/               # Translations (en, es)
    types/              # TypeScript types
    test/               # Test setup, mocks, generators
  worker/               # Cloudflare Workers API
    src/
      routes/           # API route handlers
      lib/              # Prompts, schemas, types, OpenRouter client
      middleware/        # Rate limiting
  e2e/                  # Playwright end-to-end tests
  public/               # Static assets & PWA icons
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Frontend

```bash
npm install
cp .env.example .env    # edit if your worker runs elsewhere
npm run dev             # http://localhost:5173
```

### Worker (API backend)

```bash
cd worker
npm install
cp .dev.vars.example .dev.vars   # add your OpenRouter API key
npm run dev                      # http://localhost:8787
```

You'll need an [OpenRouter](https://openrouter.ai/) API key for the AI features (chat, vision, insights). The app works without one -- AI features will simply be unavailable.

### Environment Variables

**Frontend** (`.env`):

| Variable            | Description         | Default                 |
| ------------------- | ------------------- | ----------------------- |
| `VITE_API_BASE_URL` | Worker API base URL | `http://localhost:8787` |

**Worker** (`.dev.vars` for local, Cloudflare secrets for production):

| Variable             | Description                   |
| -------------------- | ----------------------------- |
| `OPENROUTER_API_KEY` | OpenRouter API key (secret)   |
| `ENVIRONMENT`        | `development` or `production` |

Non-secret worker config lives in `wrangler.toml` -- see the checked-in file for model selection, token limits, and rate-limit thresholds.

## Scripts

### Frontend (root)

```bash
npm run dev              # Vite dev server
npm run build            # TypeScript check + Vite build
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint
npm run test             # Vitest (single run)
npm run test:watch       # Vitest (watch mode)
npm run test:coverage    # Vitest with coverage
npm run e2e              # Playwright
npm run e2e:ui           # Playwright UI mode
```

### Worker

```bash
cd worker
npm run dev              # Wrangler local dev
npm run deploy           # Deploy to Cloudflare Workers
npm run test             # Vitest (single run)
npm run typecheck        # tsc --noEmit
```

## Deployment

### Frontend

Build locally and serve the `dist/` folder from any static host (nginx, Caddy, Netlify, Vercel, etc.):

```bash
npm run build
# deploy dist/ to your host
```

### Worker

```bash
cd worker
npm run deploy
```

Set `OPENROUTER_API_KEY` as a Cloudflare Workers secret:

```bash
npx wrangler secret put OPENROUTER_API_KEY
```

Create the KV namespace for image caching:

```bash
npx wrangler kv:namespace create IMAGE_CACHE
# update the id in wrangler.toml with the returned ID
```

## Privacy

All session data lives in the browser's IndexedDB. Nothing is sent to external servers except:

- **AI chat messages** -- sent to the worker API, forwarded to OpenRouter (opt-in feature)
- **Photo OCR** -- images sent to the worker API for AI extraction (opt-in feature)
- **AI insights** -- aggregated session data sent for analysis (opt-in feature)

No analytics, no tracking, no third-party scripts.

## License

[MIT](LICENSE)

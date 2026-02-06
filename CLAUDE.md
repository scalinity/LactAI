# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context

ClaudiaFlow is a breast milk expression and feeding tracker built for a single family member. It is a personal project with one real user — treat all data, UI copy, and features with that in mind. Changes ship directly to production and are immediately visible, so avoid breaking changes to the database schema or API contract without migration paths. The user's data lives entirely in their browser's IndexedDB.

## Commands

### Frontend (root)

```bash
npm run dev              # Vite dev server (localhost:5173)
npm run build            # tsc -b && vite build
npm run typecheck        # tsc --noEmit
npm run lint             # eslint .
npm run test             # vitest run
npm run test:watch       # vitest (watch mode)
npm run test:coverage    # vitest run --coverage
npm run e2e              # playwright test
npm run e2e:ui           # playwright test --ui
```

### Worker (backend)

```bash
cd worker
npm run dev              # wrangler dev (localhost:8787)
npm run deploy           # wrangler deploy (Cloudflare Workers)
npm run test             # vitest run
npm run test:watch       # vitest (watch mode)
npm run typecheck        # tsc --noEmit
```

### Running a single test

```bash
npx vitest run src/lib/aggregation.test.ts          # frontend
cd worker && npx vitest run src/routes/chat.test.ts  # worker
```

## Architecture

**Two-package monorepo**: React PWA frontend (`/src`) + Cloudflare Workers API (`/worker`).

### Frontend

- **React 19** + TypeScript + React Router v7 + Tailwind CSS 4
- **State**: Zustand stores (`src/stores/`) with persistence middleware. Four stores: `useAppStore` (unit prefs, onboarding), `useThemeStore` (dark mode), `useChatStore` (streaming state), `useSessionFormStore` (form state).
- **Database**: Dexie (IndexedDB) with live queries via `useLiveQuery`. Schema in `src/db/index.ts`, reactive hooks in `src/db/hooks.ts`. Currently on schema version 2.
- **Path alias**: `@/` maps to `./src/`
- **Code splitting**: Routes lazy-loaded via `React.lazy()` in `App.tsx`. Manual vendor chunks in `vite.config.ts` (react, echarts, dexie, date-fns).
- **API layer**: `src/lib/api.ts` handles all worker communication. Chat uses SSE streaming. Device ID (UUID v4) sent via `X-Device-ID` header for rate limiting.
- **Charts**: ECharts via `echarts-for-react`. Data preparation in `src/hooks/useChartData.ts`.

### Worker (Cloudflare)

- **Hono** framework with Zod validation on all inputs (`worker/src/lib/schemas.ts`)
- **Routes**: `/api/ai/chat` (streaming), `/api/ai/chat/title`, `/api/ai/vision-extract`, `/api/ai/insights`, `/api/ai/key-status`
- **LLM**: OpenRouter API (`worker/src/lib/openrouter.ts`). Model selection via env vars.
- **Rate limiting**: Per-device + per-IP daily quotas via Cloudflare KV (`worker/src/middleware/rate-limit.ts`)
- **Image caching**: Hash-based dedup in KV (`worker/src/lib/image-cache.test.ts`)

### Data flow for chat

1. User sends message -> `useChatActions().sendMessage()` in `src/hooks/useChatMessages.ts`
2. `buildChatContext()` (`src/lib/build-chat-context.ts`) queries Dexie for session stats and builds a text summary
3. Context + messages sent to `/api/ai/chat` which constructs system prompt via `getChatSystemPrompt()` (`worker/src/lib/prompts.ts`)
4. SSE stream parsed in `src/lib/api.ts:streamChatMessage()`, think tags stripped before display
5. After first exchange, title generated via `/api/ai/chat/title` (best-effort, fallback to truncated message)

### Key conventions

- **Units**: All amounts stored as `amount_ml` internally. Display conversion via `convertAmount()`/`formatAmount()` in `src/lib/units.ts`. User preference stored in `useAppStore.preferredUnit`.
- **Session types**: `"feeding"` or `"pumping"`. Default is `"feeding"`. Runtime validation with `isValidSessionType()`.
- **Think tag stripping**: LLM responses may contain `<think>...</think>` tags that must be stripped before displaying. Both frontend (`useChatMessages.ts`) and worker (`openrouter.ts`) have `stripThinkTags()`.
- **CSS theme**: Custom colors defined in `src/index.css` via `@theme` block. Key tokens: `rose-primary`, `cream`, `plum`, `sage`, `surface`. Dark mode overrides via `:root.dark`.
- **Fonts**: `Nunito` (display), `DM Sans` (body) loaded from Google Fonts.
- **Tests**: Frontend uses vitest + jsdom + fake-indexeddb + MSW. Worker uses vitest + @cloudflare/vitest-pool-workers.
- **API base URL**: Configured via `VITE_API_BASE_URL` env var, defaults to `http://localhost:8787`.

### Deployment

**Frontend**: Hosted on a Hostinger VPS. SSH in, pull latest, and rebuild.

```bash
ssh <user>@<hostinger-ip>     # SSH into VPS
cd /path/to/claudiaflow       # Navigate to project
git pull origin main           # Pull latest changes
npm run build                  # Build frontend
```

**Worker**: Deployed to Cloudflare Workers via `cd worker && npm run deploy`.

### Medical safety

The chat system has red flag detection for medical emergencies. The system prompt in `worker/src/lib/prompts.ts` instructs the AI to surface urgent alerts. Frontend scans responses for medical caution flags and tags messages accordingly (`ChatMessage.flags`).

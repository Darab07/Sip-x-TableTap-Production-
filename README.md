# TableTapCrusteez

## Overview

This repository is a full-stack monorepo that runs a Vite-powered React client and an Express server from a single codebase. It is tuned for kiosk/table ordering scenarios where each table has its own scoped menu flow and checkout path.

Key characteristics:
- **Single entry point** (`server/index.ts`) serves both API routes and the SPA.
- **Vite middleware** in development for fast HMR, with static assets served from `dist/public` in production.
- **Typed storage contracts** shared via `shared/schema.ts` so API code and future database adapters compile against the same schema.
- **Table-aware routing** powered by Wouter and a centralized table configuration provider (`client/src/hooks/useTableConfig.tsx`) even though the public paths are simplified (`/menu`, `/checkout/:type`, `/admin`).

## Project Structure

```
.
├── client/        # React application (Vite + Tailwind)
│   ├── public/    # Static assets (images, menu art, logos)
│   └── src/
│       ├── components/ui/   # Reusable UI primitives (Button, Card, etc.)
│       ├── hooks/           # App-specific hooks (e.g., table config provider)
│       ├── providers/       # Global context providers for the SPA shell
│       ├── routes/          # Route definitions (keeps App.tsx minimal)
│       ├── lib/             # Utilities (`cn`, user ID helper)
│       └── pages/           # Route-level screens (home, menu, checkout, admin)
├── server/        # Express entry, Vite glue, and storage abstraction
├── shared/        # Drizzle schema + Zod validation shared between server/client
└── attached_assets/  # Additional marketing assets exposed via `@assets`
```

## Development Workflow

1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Visit the logged LAN URL (e.g. `http://192.168.x.x:5000`) for the SPA with live reload.

### Scripts

| Command        | Description |
|----------------|-------------|
| `npm run dev`  | Launch Express + Vite in development mode. |
| `npm run build`| Build the client (`vite build`) and bundle the server (`esbuild`). |
| `npm start`    | Run the compiled server from `dist/index.js`. |
| `npm run check`| Type-check the full monorepo with `tsc`. |

## Table Configuration

The table routing model is centralized via `TableConfigProvider` (see `client/src/hooks/useTableConfig.tsx`) and composed through `AppProviders` (`client/src/providers/app-providers.tsx`):

- Configuration lives in browser `localStorage` under the `tableConfig` key.
- `client/src/hooks/useTableConfig.tsx` exposes React context utilities for reading, mutating, and persisting tables.
- The Router (`client/src/routes/app-router.tsx`) keeps the public surface minimal, redirecting `/` to `/menu` while still allowing internal table-aware logic via query parameters.
- The Admin dashboard uses the same provider, so toggling/adding/removing tables updates the router instantly without reloading.

Each table can be referenced via `/menu?table=Table7` or `/checkout/pay-fully?table=Table7`, and the Admin panel copies those URLs automatically.

## Server/API Notes

- `server/app.ts` encapsulates middleware (CORS, body parsing, structured logging) so the rest of the server can remain focused on features.
- `server/routes.ts` composes an Express Router mounted at `/api`. It includes a diagnostic `GET /health`, `GET /test`, and sample user CRUD endpoints that lean on the shared schema for validation.
- `server/storage.ts` contains a typed in-memory storage adapter. Replace it with a persistent implementation (e.g., PostgreSQL via Drizzle) when ready.
- `server/vite.ts` wires up Vite middleware in development and serves the built assets in production. Do not register catch-all routes before calling `setupVite` or `serveStatic`.

## Styling and UI

- TailwindCSS is configured in `tailwind.config.ts` with sensible defaults and utility layers defined in `client/src/index.css`.
- UI primitives (~shadcn) live in `client/src/components/ui` and rely on the shared `cn` utility for class merging.
- Animations and transitions are handled with `framer-motion`, especially in `client/src/pages/menu.tsx`.

## Testing & Quality

- Run `npm run check` before committing to ensure type safety across the repo.
- Consider introducing component tests (e.g., Vitest + React Testing Library) for the menu/cart logic and API tests (e.g., Supertest) as the server surface grows.

## Deployment

1. `npm run build` to create the server bundle and client assets.
2. Set `NODE_ENV=production` (and `PORT` if not `5000`).
3. Launch with `npm start`. The Express server will serve both API routes and the static client from the bundled output.

Keep `PORT` consistent; anything other than the allowed port (default `5000`) will be blocked in the target environment.
"# TableTap" 

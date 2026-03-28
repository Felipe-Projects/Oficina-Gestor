# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/oficina` (`@workspace/oficina`)

React + Vite web application for auto repair shop management ("Gestão de Oficina Mecânica"). Served at `/`. Features: Dashboard, OS management, Clients, Vehicles, Inventory, Financial, Service Catalog, Maintenance alerts, Appointment scheduling system with public booking page at `/agendar`, and Backup/Restore system (`/backup`).

## Backup System

- `GET /api/backup/exportar` — Download all data as JSON file
- `POST /api/backup/salvar` — Save a snapshot to the `backups` DB table (max 10 kept)
- `GET /api/backup/historico` — List saved backups (without `dados` field)
- `GET /api/backup/historico/:id/baixar` — Download a specific saved backup
- `DELETE /api/backup/historico/:id` — Delete a saved backup
- `POST /api/backup/importar` — Replace all data with the uploaded JSON backup
- **Auto-backup**: On server startup and every 6 hours, checks if 7 days have passed since the last automatic backup. If so, creates one automatically (`criarBackupAutomatico()` in `routes/backup.ts`).

## Render Deployment

A `render.yaml` is configured at the root. To deploy:

1. Push this repository to GitHub (or GitLab).
2. Create a new Render account at [render.com](https://render.com).
3. Go to **New → Blueprint** and connect your repository — Render will auto-detect `render.yaml`.
4. Set the required environment variables:
   - `DATABASE_URL` — your PostgreSQL connection string (Render PostgreSQL or external like Neon/Supabase)
   - `SESSION_SECRET` — a random secret string
5. Render will build and deploy the combined Express + React app. The Express server serves the React SPA in production (static files from `artifacts/oficina/dist/public/`).

Build command: `pnpm install && BASE_PATH=/ PORT=3000 pnpm --filter @workspace/oficina run build && pnpm --filter @workspace/api-server run build`
Start command: `pnpm --filter @workspace/db run push && node artifacts/api-server/dist/index.mjs`

### `artifacts/oficina-mobile` (`@workspace/oficina-mobile`)

Expo React Native mobile app for auto repair shop management. Served at `/mobile/`. Connects to the same API server as the web app — all data is shared in real-time. Features: Dashboard, OS list with detail view, Clients, Inventory, Financial. Uses `EXPO_PUBLIC_DOMAIN` for API calls. Scan QR code via Expo Go for native preview.

- API calls: `utils/api.ts` — wraps fetch with `https://${EXPO_PUBLIC_DOMAIN}` base URL
- 5 tabs: Início (Dashboard), OS, Clientes, Estoque, Finanças
- Stack screens: `app/os/[id].tsx` (OS detail), `app/cliente/[id].tsx` (client detail)

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

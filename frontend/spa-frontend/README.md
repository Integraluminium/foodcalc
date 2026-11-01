# Foodcalc SPA

Vite + React + TypeScript single-page frontend for Foodcalc. It talks to the
axum backend's JSON API (`/api/*`) with session-cookie auth and is developed
in parallel to the existing maud/htmx UI — only the `/api` (and later `/app`)
prefixes belong to this frontend; everything else keeps serving the old UI
unchanged.

## Development

```bash
# 1. Backend (port 3000; needs DATABASE_URL, e.g. in server/.env)
cd server && cargo run

# 2. Frontend dev server (port 5173, proxies /api -> :3000)
cd frontend/spa-frontend
npm install
npm run dev
```

Start the backend with `DISABLE_AUTO_LOGIN=1` to test the real login flow —
otherwise debug builds auto-login the `test` user on localhost.

## Architecture

    components ──▶ hooks (TanStack Query) ──▶ api/endpoints/* ──▶ api/client.ts

- `src/api/client.ts` — the only place that knows how to talk to the backend
  (fetch, session cookie, error mapping, PDF downloads). REST API changes
  only touch this file, `src/api/types.ts` and `src/api/endpoints/*`.
- `src/hooks/*` — TanStack Query hooks (queries, mutations, invalidation).
- `src/components/ui/*` — shared primitives; app shell in `components/layout`.
- `src/pages/*` — route-level screens (React Router).
- `src/styles/tokens.css` — all design tokens; per-component CSS modules.

DTO conventions: backend `BigDecimal` → string, `OffsetDateTime` → RFC3339
string, ids → `number` (i32).

## Production

The built SPA is served by the axum server under `/app/` (phase 5 of the
migration plan); until then the old UI remains untouched at `/`.

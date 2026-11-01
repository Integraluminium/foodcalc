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

## Implemented screens (Phase 1)

- `/recipes` — filterable list (Gerichte / Komponenten / Alle, Suche),
  create dialog. `/recipes/:id` — full editor: Zutaten, Sub-Komponenten
  (Gerichte und Komponenten frei kombinierbar), Arbeitsschritte
  (Dauer fix + Dauer pro kg), Energie-Stats (Gesamtgewicht, kJ,
  kJ/g = Skalierungsbasis für Portionen), klonen/löschen.
- `/ingredients` — list with energy kJ/g and source badge; drawer editor
  with Basisdaten, Quellen (Händler/Packung/Preis), Eigenschaften/Allergene
  und Einheitsgewichten (kg pro Einheit, Basis für Einkaufslisten).
- Master data pickers (groups, stores, units, properties) via
  `hooks/queries/useMasterData` with 10 min stale time.

Backend endpoints used: `/api/auth/*`, `/api/groups`, `/api/recipes`,
`/api/recipes/{id}/ingredients|steps|sub-recipes`, `/api/recipes/{id}/clone`,
`/api/ingredients`, `/api/ingredients/{id}/sources|weights|properties`,
`/api/stores`, `/api/units`, `/api/properties`.

## Production

The built SPA is served by the axum server under `/app/` (phase 5 of the
migration plan); until then the old UI remains untouched at `/`.

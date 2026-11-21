# Foodcalc SPA Frontend (`frontend/spa-frontend`)

React + TypeScript + Vite single-page application for Foodcalc, communicating exclusively with the backend JSON REST API (`/api/*`).

## Tech Stack

- **Framework:** React 18 + TypeScript + Vite
- **Server State & Caching:** TanStack Query (`@tanstack/react-query`)
- **Routing:** React Router
- **Styling:** CSS Modules (`*.module.css`) with design tokens — no utility-class frameworks
- **Internationalization:** `i18next` / `react-i18next` with complete `en_US` and `de_DE` translation namespaces

## Project Structure

```text
frontend/spa-frontend/src/
├── api/
│   ├── client.ts           # Fetch wrapper, error normalization, and credential handling
│   ├── types.ts            # Shared TypeScript DTOs matching server/src/api/ models
│   └── endpoints/          # Domain-grouped API functions & TanStack Query keys/hooks
├── components/
│   ├── ui/                 # Reusable primitives (buttons, modals, drawers, tables, skeletons)
│   └── patterns/           # Domain-composed UI patterns (event timeline, role matrix, drawers)
├── lib/                    # Pure utilities: energy/weight formatting, permissions, role helpers
├── locales/
│   ├── en_US/              # English translation JSON namespaces
│   └── de_DE/              # German translation JSON namespaces
└── pages/
    ├── admin/              # User access drawer, group & role management, audit log viewer
    ├── event/              # Event overview, meal workspace, timeline, shopping, status board
    ├── ingredients/        # Ingredient catalog, nutrition/allergen tags, supplier sources
    ├── inventory/          # Group & event inventory stock views and booking logs
    ├── recipes/            # Recipe editor, sub-components, preparation steps, Typst export triggers
    └── settings/           # Account settings and personal API token management

```

## Local Development

Ensure the Rust backend (`cargo run -p server`) is running first, then start the Vite dev server:

```sh
npm ci
npm run dev

```

Vite proxies `/api/*` requests to the local backend server and forwards session cookies automatically.

## Conventions & Quality Gates

* **CSS Modules Only:** Keep component styles scoped in colocated `*.module.css` files; avoid inline styles except for dynamic runtime coordinates (e.g., timeline bar offsets).
* **Strict i18n:** Every user-facing string, label, toast, and validation message must exist in both `src/locales/en_US/` and `src/locales/de_DE/`.
* **Permission-Aware UI:** Gate mutating controls using helpers in `src/lib/permissions.ts` and `src/lib/roles.ts` so UI affordances mirror backend RBAC policies (`viewer` / `editor` / `manager`).
* **Pre-Commit Checks:**
```sh
npm run build   # Type-checks (tsc) and builds production bundle
npm run lint    # ESLint checks
npm test        # Unit & component tests

```
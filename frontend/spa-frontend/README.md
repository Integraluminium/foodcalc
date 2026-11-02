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

## Implemented screens (Phase 2)

- `/events` — list with Zeitraum, Mahlzeiten-Anzahl, Kosten vs. Budget,
  create dialog, client-side search.
- `/events/:id` — header with Budget-Fortschrittsbalken und Export-Buttons
  (Rezepte-PDF, Allergene, Labels) plus two tabs:
  - **Speiseplan**: Mahlzeiten nach Tag gruppiert, je Mahlzeit Zeit, Ort,
    Portionen, **kJ/Portion** (Energie-Skalierungseingabe), kJ/g-Dichte,
    kalkuliertes Gesamtgewicht, €/Portion und Kosten; Bearbeiten/Duplizieren/
    Löschen/Rezept-PDF pro Zeile; Plan-Dialog mit **Live-Vorschau der
    Kochmenge** aus der Rezept-Energie-Dichte.
  - **Einkäufe**: Touren (Store + Datum) mit Positionen (Kategorie, Menge,
    Preis), Tour-Total, Text-Export; „Ohne Tour"-Sektion mit Store-Hinweis
    und Tour-Anlegen-Vorbefüllung.

Backend endpoints used (neu in Phase 2): `/api/events`,
`/api/events/{id}/meals|tours|shopping-list|source-overrides`,
`/api/events/{id}/exports/{recipes,meal,allergens,labels,tour}`,
`/api/places`. PDF-Exporte brauchen den Server mit `--features typst`;
ohne antworten sie mit einem klaren Fehler.

Hinweis: Die Sample-DB enthält ältere View-Stände; die Migration
`20261101240000_fix_event_ingredients_multiplier_per_meal.sql` korrigiert die
Multiplikator-Verknüpfung ( Meal-granular) und wurde für die lokale DB
bereits angewandt.

## Implemented screens (Phase 3 — in progress)

**Block A (fertig): Benutzer, Gruppen & Rechte**
- `/register` — offene Registrierung (erzeugt Konto + persönliche Gruppe
  atomar, Auto-Login), verlinkt vom Login
- `/account` — Profil, Passwortwechsel (mit aktueller-Passwort-Prüfung),
  eigene Gruppen
- `/admin` (nur Admins, Link in der Seitenleiste) — Benutzerverwaltung
  (Admin-Toggle, Passwort-Reset, Löschen mit Besitz-Schutz) und
  Gruppenverwaltung (anlegen/löschen, Mitglieder je Gruppe mit
  Benutzername/E-Mail-Suche hinzufügen/entfernen; persönliche Gruppen
  ausgenommen)
- Backend: `POST /api/auth/register` (public), `GET/PUT/DELETE /api/users*`,
  `GET/POST/DELETE /api/groups*/members*`. Rechte-Modell: `is_admin` +
  Gruppen-Mitgliedschaft — alle Checks laufen durch die zwei Choke-Punkte
  (`require_admin`/`require_group_manager` in `api/users.rs`,
  `usePermissions()` im SPA), damit ein künftiges Rollen-Modell nur dort
  anfasst.
- Fix: `/api/inventories` ist jetzt gruppenscoped.

**Block B (fertig): Rezept-UX**
- View-Modus als Standard auf `/recipes/:id` (Fokus-Ansicht mit kJ/g,
  kollabierbarem Rezept-Baum, Schritten, PDF-Export) — Edit-Elemente nur im
  Wizard
- **Wizard** unter `/recipes/new` und `/recipes/{id}/edit` (Basis →
  Zutaten & Sub-Komponenten → Arbeitsschritte → Prüfen), Draft via
  `useReducer`, Live-Kalkulations-Seitenleiste (Gewicht/Energie/Dichte je
  Zeile aufgelöst); Speichern committed über die bestehenden Teil-Endpoints
  (Diff-basiert: update/add/remove). Die Inline-Editoren der Detailseite
  (Dialog „Bearbeiten", Create-Dialog der Liste) sind entfernt — ein Weg
  zum Anlegen/Ändern.
- Liste: „+ Neues Rezept" führt in den Wizard; Drawer bleibt für die
  Event-Ansichten reserviert.

**Block C (fertig): Event-Cockpit**
- Vier Tabs auf `/events/:id`: **Speiseplan** (Phase 2, Mahlzeitendialog
  jetzt mit Gerichte/Komponenten-Filter und Energie-Presets aus
  `lib/plannerPresets.ts`), **Einkäufe & Logistik**, **Zeitplan**, **Exporte**
- *Einkäufe & Logistik*: Touren + Liste (Phase 2) plus neue Sektionen —
  **Inventare** (Event-Inventare koppeln/entkoppeln, Coverage-Tabelle
  Bedarf vs. Bestand mit Fehlmenge) und **Source-Overrides** (Zutat →
  Quelle pinnen, Liste mit Entfernen). Candidates kommen aus der
  Einkaufsliste.
- *Zeitplan*: read-only Tageskarten mit drei Lanes (🛒 Einkauf aus Touren,
  🍳 Vorkochen aus `food_prep`, 🍲 Essen aus dem Speiseplan).
- *Exporte*: Rezepte-PDF (kombiniert), Allergenliste, Labels/Zeltkarten,
  Mahlzeiten-Rezept-PDF (Mahlzeit wählbar), Touren-Listen als Text — die
  Export-Buttons sind aus dem Header hierher gezogen.
- Events-Liste: **Projekt-Drawer** (ℹ pro Zeile) mit Quick-Summary
  (Zeitraum, Mahlzeiten, Kosten/Budget-Balken) und „Projekt-Cockpit
  öffnen".
- Backend: `GET /api/events/{id}/preps`, `GET/POST/DELETE
  /api/events/{id}/inventories*`, `GET /api/events/{id}/inventory-coverage`.
- Migrations-Bugfix: `event_ingredients` konvertierte Zutatenmengen doppelt
  (extra `× ingredient_weight.weight`, Preis zusätzlich geteilt) — bei
  kg-Zeilen unsichtbar, sonst bis 1000× falsch
  (`20261102230000_fix_event_ingredients_double_unit_conversion.sql`).
- Robustheit: `weight`/`energy` in der Einkaufsliste sind jetzt `Option`
  (Zutaten ohne Unit-Gewicht zeigen „?"); `sqlx::Error::RowNotFound` wird
  global auf 404 gemappt statt 500.

**Block D (fertig): Inventare**
- `/inventories` — Karten, Create-Dialog, Detail-Drawer mit Bestandsliste
  (Mengen inline editierbar), Zutat einlagern, Inventar löschen (Confirm).
- Backend: vollständiges CRUD — `GET/POST /api/inventories`,
  `GET/PUT/DELETE /api/inventories/{id}`, `GET/POST /api/inventories/{id}/items`,
  `PUT/DELETE /api/inventories/{id}/items/{ingredient_id}`; alles
  gruppenscoped (`assert_can_edit_inventory`, 404 bei fremden Gruppen).

**Block E (fertig): Settings**
- `/settings` (Sidebar: „Einstellungen") — zwei Tabs: **Konto** (Profil,
  Passwortwechsel, eigene Gruppen) und **Gruppen** (geteilte
  `GroupsSection`-Komponente: Mitgliederverwaltung für eigene Gruppen,
  Admins können zusätzlich Gruppen anlegen/löschen). `/account` redirected
  auf `/settings`; `/admin` bleibt die reine Benutzerverwaltung.

**Event-Overview-PDF (fertig)**
- `GET /api/events/{id}/exports/overview` (typst-Feature): Management-
  Übersicht mit Rahmen (Zeitraum, Mahlzeiten/Portionen, Kosten vs. Budget
  inkl. Warnung bei Überschreitung/Ausreizen), Speiseplan-Tabelle (Zeit,
  Ort, Gericht, Portionen, Gewicht, kJ/Portion, Kosten), Einkaufstouren
  (Datum, Händler, Positionen) und Vorkochen (Datum, Rezept, Fenster).
  Template: `foodlib_new/templates/event_overview.typ`; Button im
  Exporte-Tab. Ohne typst-Feature: 422 mit Hinweis.

**Offen (Phase 4):** Event-spezifische Rezeptkopien (Overlay-Diff als
Design-Ansatz), Rollen pro Gruppe, Metro-Sync-UI. Nutzbarkeits-Feedback:
Rezept-/Event-Workflows laut Nutzer noch nicht ausgereift genug —
UX-Überarbeitung der bestehenden Screens als nächster Schritt.


## Production

The built SPA is served by the axum server under `/app/` (phase 5 of the
migration plan); until then the old UI remains untouched at `/`.

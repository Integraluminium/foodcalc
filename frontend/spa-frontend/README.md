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

**M1 — Aktiver Gruppen-Kontext (fertig)**
- Globaler **Gruppen-Switcher** in der Seitenleisten-Fußzeile („Aktive
  Gruppe — steuert Besitz und Sichtbarkeit"); Auswahl in `localStorage`
  persistiert und gegen `GET /api/auth/me` validiert. Kontext-Provider:
  `components/layout/ActiveGroupProvider.tsx`, Consumer-Hook:
  `hooks/useActiveGroup.ts` (Fallback auf erste Gruppe).
- **Event-Hub**: Gruppen-Filter (`src/pages/EventsPage.tsx`) — Standard ist
  die aktive Gruppe, „Alle Gruppen" explizit wählbar; neue Spalte „Gruppe".
- **Create-Dialoge vorbefüllt** mit der aktiven Gruppe: Event, Zutat,
  Inventar und Rezept-Wizard (Neuanlage).

**Offen (Phase 4):** Event-spezifische Rezeptkopien (Overlay-Diff als
Design-Ansatz), Rollen pro Gruppe, Metro-Sync-UI. Nutzbarkeits-Feedback:
Rezept-/Event-Workflows laut Nutzer noch nicht ausgereift genug —
UX-Überarbeitung der bestehenden Screens als nächster Schritt.

## UI-Redesign P0 — Fundamente & Deduplizierung (fertig)

Grundlage des UI-Plans (`UI_Spec.md` + Mockups): konsistente Pattern
(Master-Detail-Drawer, Status-Badges, Menü statt Textlink-Wüste) und eine
einzige Rechenquelle für die Energie-Skalierung.

- **`components/overlay/Overlay.tsx`** — einheitliches Overlay-Primitive
  (Drawer- und Modal-Variante, Größen sm/md/lg) mit ESC-zum-Schließen,
  Fokus-Falle und Body-Scroll-Lock. `ui/Dialog.tsx` und `ui/Drawer.tsx` sind
  jetzt Thin-Wrapper; alle bestehenden Dialoge bekommen ESC/Fokus gratis.
  Die alten `Dialog.module.css`/`Drawer.module.css` sind entfernt.
- **`components/layout/UserMenu.tsx`** — Sidebar-Fußzeile neu: nur
  Name/Avatar sichtbar, Klick öffnet Menü (Profil & Einstellungen, Verwaltung
  [nur Admin], Abmelden). Der Gruppen-Switcher bleibt als beschrifteter
  eigener Block („Aktive Gruppe"), da er Besitz/Sichtbarkeit steuert.
- **`i18n/`** — zentrale deutsche UI-Texte mit typsicherem `t(key)` (Keys aus
  `de.ts`); Shell und Hub-Überschriften migriert („Zutaten/Rezepte/…"), damit
  die UI konsistent deutsch ist. Späteres i18n = zweite Datei mit gleichen
  Keys, ohne Komponenten anzufassen.
- **`lib/scaling.ts`** — einzige Quelle der Energie-Skalierungs-Mathematik
  (`energyDensityKjPerG`, `scaledWeightKg`, `portionCost`); MealDialog-Vorschau
  und €/Portion-Spalte nutzen sie bereits. Getestet in `scaling.test.ts`.
- **`ui/AmountInput.tsx`** — einheitliche Mengeneingabe (Zahl + Stepper +
  Einheit + automatische kg-Umrechnung; unbekannte Umrechnung zeigt „?")
  für Rezeptzeilen, Inventar und Touren (Einsatz ab P1).
- **`ui/StatusBadge.tsx`** — Status-Vokabular der Event-Zutatenverwaltung:
  `available`/`planned`/`missing`/`unknown` mit fixen Badge-Farben.
- **`hub/StateViews.tsx`** — einheitliche Lade-/Fehler-/Leerzustände für alle
  Hub-Listen (Einsatz ab P1 beim Hub-Umbau).

## UI-Redesign P1 — Rezept-Domain (fertig)

Master-Detail nach UI_Spec §3.2/3.3: Inspektion ohne Kontextbruch, eine
geteilte Ansicht statt doppelter Editor-Wege.

- **`components/recipes/RecipeView.tsx`** — geteilte, rein lesende
  Rezeptansicht: Identity-Header (Typ, Eingewogen-Warnung, Besitzer-Gruppe),
  Diagnose-Metriken (Gewicht, Energie, kJ/g), kollabierbarer Rezept-Baum
  (Baum-Root-Badge zeigt jetzt Gericht/Komponente), Arbeitsschritte
  (read-only) und Eigenschaften/Allergene als Chips. Aktionen: Rezept-PDF,
  Bearbeiten/Klonen/Löschen (nur mit Gruppen-Rechten via `usePermissions`),
  Löschen mit Confirm. Wird als `variant="overlay"` im Hub-Drawer und als
  `variant="page"` auf `/recipes/:id` gerendert — Deep-Link bleibt.
- **`RecipesPage`** — Klick auf eine Zeile öffnet den Recipe-Drawer statt
  einer Routen-Navigation (Master-Detail, Kontext bleibt); neuer
  **Besitzer-Filter** (Default: aktive Gruppe, „Alle Gruppen" explizit,
  analog Events-Hub), Kommentar-Spalte, StateViews für Lade-/Fehler-/Leer-
  zustände. Im Drawer verlinkt „Vollansicht öffnen →" auf die Route.
- **`RecipeDetailPage`** — von 688 auf 21 Zeilen: rendert nur noch die
  geteilte `RecipeView`. Alle **Inline-Editoren** (Zutaten-Mengen-Edits,
  Step-Editor, Eingewogen-Toggle) sind entfernt — der Wizard
  (`/recipes/new`, `/recipes/:id/edit`) ist der einzige Bearbeitungsweg
  (das Doppel-Paradigma ist damit aufgelöst).
- **Query-Layer** — `queryKeys.recipes.tree` + `useRecipeTree(id)` zentral
  statt eines Ad-hoc-Keys in der Detailseite.

## UI-Redesign P2 — Zutaten-Domain (fertig)

Mockup „Ingredient detailed view": Drawer mit Key-Figures, Vendors-Tabelle
(inkl. optionalem Produkt-Link) und konsistenten Hub-Mustern.

- **`components/ingredients/IngredientView.tsx`** — geteilte Zutaten-Ansicht
  als Drawer (Master-Detail, von der Page extrahiert; später auch aus dem
  Rezept-Wizard nutzbar). Sektionen: Basisdaten (Bearbeiten/Speichern/
  Löschen), **Händler & Preise** (Vendors-Tabelle mit Packungsgröße, Preis,
  Link-Spalte 🔗 + „Link / Produkt-ID"-Feld beim Anlegen), Eigenschaften &
  Allergene, Gewichte pro Einheit. **Rechte-Check** via `usePermissions`:
  ohne Gruppen-Recht rendert alles read-only (Basisdaten als Facts-Liste,
  keine CRUD-Aktionen) mit Hinweis.
- **`IngredientsPage`** — von 781 auf ~210 Zeilen schlank: StateViews,
  `t()`-Überschrift, neue **Besitzer-Spalte** (Gruppen-Lookup, konsistent
  mit Rezept-/Event-Hub), Drawer öffnet die geteilte `IngredientView`.
  Seitenduplikate (Section-Styles, Inline-Editor) in die Komponente
  verschoben bzw. entfernt.

## UI-Redesign P3 — Inventare & Reconciliation (fertig)

Mockup „Detailed inventory management" + UI_Spec §4 „Inventory
Reconciliation".

- **`components/inventories/InventoryView.tsx`** — geteilte Inventar-Ansicht
  als Drawer mit **zwei Modi** (SegmentedControl): **Bearbeiten** (freie
  Mengeneingabe + „Zutat einlagern"-Formular, wie bisher) und **Abgleichen**
  (Reconciliation): je Bestandszeile **Schnellkorrektur-Buttons** (−1 / −0,1 /
  +0,1 / +1 kg, commit pro Klick) plus **Differenz-Feld** („±kg", Enter oder
  „Übernehmen") — Bestand wird nie unterschritten (Klemmung bei 0).
  Rechte-Check via `usePermissions` (ohne Recht: read-only Tabelle, kein
  Modus-Wechsel, kein Löschen).
- **`InventoriesPage`** — Karten-Hub mit **Besitzer-Gruppe** auf der Karte,
  StateViews, `t()`-Überschrift; Drawer öffnet die geteilte View (der Name
  wird im Drawer selbst geladen statt doppelt auf der Page).
- **Bugfix** — Karten-CSS referenzierte nicht existierende Tokens
  (`--surface`, `--radius`, `--primary`) → jetzt `--bg-card`, `--radius-md`,
  `--accent`.

## UI-Redesign Fix-Runde — Wizard-Polish & Mobile (fertig)

Nutzer-Feedback: Wizard überarbeiten; Inventar-Abgleich verdeckt auf Mobile
den Rest.

- **Inventar-Abgleich mobil** — die Reconciliation-Tabelle (4 Spalten) lief
  auf schmalen Screens über den Drawer hinaus. Jetzt: **gestapelte Karten**
  (Name + Bestand, darunter wrapppende Schnellkorrektur-Buttons und
  Differenz-Feld), Edit-Tabelle in `overflow-x`-Wrapper.
- **Wizard-CSS-Tokens** — Stepper/Schritte nutzten nicht existierende Tokens
  (`--primary`, `--text`, `--radius`) → Border/Hover/Aktiv-Zustand waren
  unsichtbar; jetzt `--accent`/`--border-strong`/`--radius-md`. `.main` war
  gar nicht definiert → definiert (Spalten-Umbruch Mobile).
- **Wizard-UX** — Zurück/Weiter/Speichern sind jetzt in einer **sticky
  Action-Bar** unten (auf Mobile immer erreichbar, statt unten in der
  zugeklappten Sidebar); Stepper springt nicht mehr nach vorn (nur besuchte
  Schritte klickbar, ✓ für erledigte); Zutatenzeilen zeigen jetzt den
  **Energie-Beitrag** („≈ X kJ"); der Review-Schritt listet Zutaten,
  Sub-Komponenten und Schritte tatsächlich auf (statt nur Zähler).

## UI-Redesign P4 — Event-Workspace-Shell (fertig)

Mockup „Event overview / Detailed view Event" + UI_Spec §2 „Workspace
Entry" / §3.4. Drawer-Regel dabei geschärft: Drawer für Hub-Inspektion,
Workspace volle Seite — keine Drawer-Stapel im Event.

- **`pages/event/EventWorkspace.tsx`** — Layout-Route für `/events/:id`:
  Topbar-Karte (Name, Zeitraum, Mahlzeiten, Kosten/Budget-Balken) statt der
  alten Inline-Header-Zeile; die fünf Phasen sind jetzt **Sub-Routen**
  (`/events/:id/{plan,shopping,timeline,exports}`, Index = Übersicht) und
  damit deep-linkable. Event-Detail + Mutationen werden einmal geladen und
  über **Outlet-Context** (`useWorkspace()`) geteilt — kein Doppel-Fetch je
  Tab.
- **Übersicht-Tab (`OverviewTab`)** — Rahmen-Daten als Facts-Grid (Zeitraum,
  Mahlzeiten, Portionen, Kochmenge, Kosten/Budget, Kommentar), gekoppelte
  Inventare mit Verweis auf den Logistik-Tab, und die Aktionen mit
  **„Klonen (Vorlage für neues Event)" als Primary** (Hauptworkflow für
  wiederkehrende Caterings), Bearbeiten und Löschen (Confirm).
- **Sidebar tritt zurück** — auf `/events/:id/*` kollabiert die Sidebar zum
  **Icon-Rail** (64 px: keine Labels, kein Gruppen-Switcher-Text,
  `UserMenu` nur als Avatar); außerhalb des Workspaces bleibt die volle
  Sidebar. Tab-Inhalte (`MealPlanTab`, `ShoppingTab`, `TimelineTab`,
  `ExportsTab`) sind unverändert über dünne Routen-Wrapper eingebunden
  (`tabRoutes.tsx`); `EventDetailPage.tsx` ist durch die Workspace-Route
  ersetzt (gelöscht).

## UI-Redesign Fix-Runde 2 + P5/P8-Anteile (fertig)

Nutzer-Feedback: Sidebar manuell klappbar, Admin-Overflows,
PDF-Export-Fehlermeldung, Speiseplan-Bearbeitung (P5), weiter bis P8.

- **Sidebar manuell klappbar** — Pfeil-Button (‹/›) am Marken-Kopf toggle
  den Rail-Modus **überall** und persistiert in `localStorage`
  (`foodcalc.sidebarCollapsed`); der Event-Workspace setzt nur den Default,
  die manuelle Wahl überschreibt ihn. `UserMenu` rendert im Rail nur den
  Avatar.
- **PDF-Export mit Feedback** — neues `lib/download.ts` (`downloadFile`)
  meldet Erfolg und **Fehler als Toast** (unten rechts; `components/ui/
  toast.ts` + `Toast.tsx`): fehlt dem Backend das `typst`-Feature (422),
  erscheint jetzt die Backend-Fehlermeldung statt eines stillen Nichts.
  Alle Export-Call-Sites umgestellt (Rezept-PDF, Mahlzeiten-PDF, Tour-Listen,
  Exporte-Tab).
- **Admin-Overflows** — Benutzertabelle in `overflow-x`-Wrapper (min 640 px,
  scrollbar), E-Mail-Spalte mit `overflow-wrap`; Panel `min-width: 0`.
- **P5 (Teil): Mahlzeit planen** — der Konfigurationsdialog zeigt jetzt eine
  **Kalkulations-Karte** (Portionen, Gesamt-Energie, Kochmenge aus
  `lib/scaling.ts`, kJ/g-Dichte) und einen **„Rezept-PDF (skaliert)“**-Button
  direkt im Dialog (`?servings=&energy_per_serving=`). Die
  Presets-Auswahl (Hauptgericht/Beilage/…) war bereits vorhanden.
- **P8: Kalkulations-Tab** — neuer Workspace-Tab `/events/:id/kalkulation`:
  Kennzahlen (Kosten gesamt vs. Budget, **€/Person**, **Energie/Person**
  mit Richtwert 8.500–10.500 kJ/Tag, Kochmenge), Kosten je Mahlzeit
  (inkl. €/Portion), Kosten je Tour (inkl. „Nicht zugeordnet“-Rest und
  Tour-Summe), Abdeckung durch Inventare (%-Balken, Bedarf/Aus Bestand/
  Zu kaufen). Alles abgeleitet aus existierenden Endpoints — keine
  Faktoren-Magie.

**Noch offen (blockiert auf Backend-Endpoints), für den Test relevant:**
- **P6 „By Meal“-Zutatenliste** — benötigt Meal-granulare Zutatenbedarfe
  (z. B. `GET /api/events/{id}/ingredients?group_by=meal`); „Combined“ und
  „By Source“ sind aus der Einkaufsliste ableitbar, sobald Ausschlüsse/
  Zuordnungen existieren.
- **P7 Einkaufs-Kuration** — benötigt Tour-Zuordnung/Ausschlüsse
  (`POST /api/events/{id}/tours/{tour_id}/items`,
  `DELETE …/shopping-list/{ingredient_id}`-ähnliche Semantik) und
  Override-Mengen-Splits.
- **P9 Timeline-Drag (Rest)** — Mahlzeiten/Touren sind verschiebbar; nur
  **Vorkochen** bleibt read-only, bis das REST-API Preps-CRUD erhält
  (`POST/PUT/DELETE /api/events/{id}/preps`).

## UI-Redesign: Runde 12 — Shopping-Touren vollstack (Mockup-Umsetzung)

- **Backend (Migration + REST):** Neue Tabellen `shopping_tour_items`
  (manuelle Zuordnung von Zutaten zu Touren — Overlay auf die
  view-basierte Store/Zeitfenster-Zuordnung) und `shopping_tour_completed`
  (Tour-Lifecycle). Endpunkte: `POST /tours/{id}/items`,
  `DELETE /tours/{id}/items/{ingredient_id}`,
  `PUT /tours/{id}/completed`. Abgeschlossene Touren sind serverseitig
  gesperrt (update/delete/items abgelehnt). Die `shopping-list`-Route
  respektiert Pins (Zuordnung wird erzwungen, „Ohne Tour“ gefiltert).
- **Tour-Dialog nach Mockup:** Store + Datum + „Automatic adding“
  (Passende vorauswählen / Keine / Alle) + Checkbox-Liste aller zugeord-
  neten Zutaten mit Store-Badge; Angehaktes wird nach dem Anlegen gepinnt
  — damit funktionieren auch „Privat“-/„Genesis“-Touren ohne Händler-Fit.
- **Tour-Lifecycle im UI:** Touren sind bearbeitbar, solange sie geplant
  sind; ✓ markiert sie als erledigt (🔒-Badge, gesperrt), 🔓 öffnet wieder.
  Manuelle Zuordnung per „Zutat hinzufügen“-Select, Entfernen per ✕ pro
  Zeile (nur in offenen Touren).
- **Sofort-Feedback:** `removeTour` läuft optimistisch (Tour verschwindet
  sofort, Rollback bei Fehler); Erfolgs-Toasts für Tour anlegen/löschen,
  Zuordnen/Entfernen, Erledigt/Wieder öffnen.
- **„Target Inventory“** (Mockup-Feld) ist noch nicht umgesetzt — dafür
  fehlt die Backend-Beziehung Tour→Inventar; dokumentiert, nicht tot im UI.

## UI-Redesign: Runde 11 — Timeline-Filter, Export-Tab aufgelöst, i18n-Sweep

- **Zeitplan:** Die Legende ist jetzt umschaltbar — Klick auf „Essen/Einkauf/
  Vorkochen“ blendet die Kategorie aus (ausradierte Legende = ausgeblendet).
  Lanes innerhalb eines Tages sind chronologisch sortiert; Drag-Gesten sind
  gehärtet (`preventDefault` gegen Textauswahl, Startzeit im Tagesfenster
  geklemmt, Tour-Commit ohne erfundenen Store).
- **Exporte-Tab aufgelöst (Nutzer-Entscheid):** Sammel-Exporte (Event-Übersicht,
  alle Rezepte, Allergenliste, Zeltkarten) → **Übersicht-Tab**; Touren-Listen
  → **Einkäufe-Tab** (⤓ pro Tour); Mahlzeiten-PDF → **Speiseplan-Drawer**.
  Route, Tab und `ExportsTab.tsx` sind entfernt.
- **Einkäufe & Logistik näher an den Mockups:** Touren tragen das
  „Geplant“-Badge, „Ohne Tour“ das „Fehlt“-Badge (Status-Vokabular aus dem
  Mockup); Abschnittsüberschriften „Einkaufstouren“/„Ohne Tour“ mit
  Erklärtext; Skeleton-Cards beim Laden statt Spinner.
- **i18n durchgezogen:** das komplette Event-Workspace-Suite (Workspace-Shell,
  Übersicht inkl. Exporte, Speiseplan, Mahlzeiten-Drawer, Einkäufe,
  Inventare-Sektion, Overrides, Kalkulation, Zeitplan) und die Rezept-Ansicht
  lesen alle Texte über `t()` aus `i18n/de.ts` (~150 Keys). Offen:
  `IngredientView`/`InventoryView` (nächste Runde).
- **Skeletons:** Inventar-Abdeckung und Source-Overrides laden jetzt mit
  Skeleton-Zeilen statt Spinner/„erscheint aus dem Nichts“.

## UI-Redesign: Runde 10 — Export-Konsolidierung, Drawer-Polish, Cache-Fix

- **Speiseplan aktualisiert sich nach Rezept-Bearbeitung:** Rezept-Mutationen
  invalidieren jetzt auch alle Events-Queries (`useRecipes.ts`) — Namen,
  Gewichte, Energiedichten und Kosten im Speiseplan/Kalkulation/Einkauf
  waren vorher Cache-veraltet.
- **Export-Orte konsolidiert:** genau ein Export pro Kontext — Drawer:
  skaliertes Mahlzeiten-PDF; Rezept-Ansicht: Basis-PDF; Exporte-Tab:
  Sammel-Exporte (Übersicht, alle Rezepte, Allergene, Zeltkarten) und
  Touren-Listen. Der ⤓-Button in Speiseplan-Zeilen und die Doppel-Buttons
  im Drawer (skaliert + Basis) sind entfernt.
- **Export-Feedback:** neuer `ExportButton` (`components/ui/ExportButton.tsx`)
  mit Spinner + Disabled während des Requests — überall dort eingesetzt
  (Drawer, Rezept-Ansicht, Exporte-Tab, Touren).
- **Mahlzeiten-Drawer vereinfacht:** der „Gerichte/Komponenten/Alle“-Filter
  ist entfernt (ein Rezept-Dropdown, Komponenten mit „(Komponente)“-Suffix);
  Kalkulations- und Rezept-Baum-Sektion zeigen Skeletons statt spontan
  erscheinender Inhalte.

## UI-Redesign: Runde 9 — Ladeverhalten, Mahlzeiten-Drawer, Timeline-Gantt

- **Globaler Error-Toast:** Unerwartete Fehler (5xx, Netzwerk) aus *allen*
  Queries und Mutationen landen automatisch im Toast unten rechts
  (`queryCache`/`mutationCache`-Handler in `App.tsx`). 4xx bleiben lokal
  sichtbar, 401 führt zum Login — so hat jede Server-Panne eine Rückmeldung,
  auch ohne lokale Fehlerbehandlung.
- **Skeleton-Loading:** `Skeleton`/`SkeletonTable`/`SkeletonCards`
  (`components/ui/Skeleton.tsx`); der generische Hub-`LoadingState` zeigt
  jetzt eine pulsierende Tabellensilhouette statt eines Spinners — Inhalte
  „erscheinen" nicht mehr spontan, sondern wachsen in eine sichtbare
  Struktur.
- **Mahlzeiten-Drawer (ersetzt Dialog und Stift):** Klick auf eine
  Speiseplan-Zeile öffnet die Bearbeitung als Seitendrawer
  (`event_detail/MealDrawer.tsx`) mit Energieskalierung, Live-Kalkulation,
  **Rezept-Überblick inkl. Baum** und den PDF-Exporten der Mahlzeit
  (skaliert/Basis) direkt im Drawer. `MealDialog.tsx` ist entfernt.
- **Timeline als React-Gantt (`TimelineTab.tsx`):** Die maud-Timeline-Logik
  (gemeinsame Stundenachse, 04:00-logischer Tag, Greedy-Lane-Packing pro
  Kategorie) ist nach React portiert — **Mahlzeiten und Touren sind per
  Drag & Drop verschiebbar** (30-Minuten-Raster, über Tagesgrenzen hinweg,
  Drop-Tag-Highlighting), Mahlzeiten zusätzlich in der Endzeit ziehbar.
  Commit läuft über die bestehenden REST-Mutations (`PUT …/meals/{id}`,
  `PUT …/tours/{id}`); Vorkochen ist read-only markiert, bis das REST-API
  Preps-CRUD erhält (Helper-Schichten gibt es weiterhin nur im alten UI).


## Production

The built SPA is served by the axum server under `/app/` (phase 5 of the
migration plan); until then the old UI remains untouched at `/`.

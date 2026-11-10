import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import RequireAuth from './components/layout/RequireAuth'
import ActiveGroupProvider from './components/layout/ActiveGroupProvider'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import PlaceholderPage from './pages/PlaceholderPage'
import EventsPage from './pages/EventsPage'
import RecipesPage from './pages/RecipesPage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'
import RecipeDetailPage from './pages/RecipeDetailPage'
import RecipeWizardPage from './pages/RecipeWizardPage'
import InventoriesPage from './pages/InventoriesPage'
import IngredientsPage from './pages/IngredientsPage'
import { ApiError } from './api'
import { notify } from './components/ui/toast'
import EventWorkspace from './pages/event/EventWorkspace'
import { OverviewTab } from './pages/event/OverviewTab'
import {
  KalkulationRoute,
  PlanRoute,
  ShoppingRoute,
  TimelineRoute,
} from './pages/event/tabRoutes'

/**
 * Unerwartete Fehler (5xx, Netzwerk, nicht-ApiError-Würfe) laufen app-weit
 * in den Toast unten rechts; 4xx werden lokal am Aufrufort gerendert, 401
 * führt der Unauthorized-Handler zum Login. So hat jede Server-Panne eine
 * sichtbare Rückmeldung, auch wo eine Seite selbst keine Fehleranzeige hat.
 */
function isUnexpected(error: unknown): boolean {
  if (error instanceof ApiError) return error.status >= 500 || error.status === 0
  return true
}

function reportUnexpected(scope: 'Anfrage' | 'Aktion', error: unknown): void {
  if (!isUnexpected(error)) return
  const detail =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error)
  notify('error', `${scope} fehlgeschlagen: ${detail}`)
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => reportUnexpected('Anfrage', error),
  }),
  mutationCache: new MutationCache({
    onError: (error) => reportUnexpected('Aktion', error),
  }),
  defaultOptions: {
    queries: {
      // Never retry client errors (4xx) — e.g. validation failures or
      // 401s — only transient/server issues.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false
        }
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            element={
              <RequireAuth>
                <ActiveGroupProvider>
                  <AppShell />
                </ActiveGroupProvider>
              </RequireAuth>
            }
          >
            <Route path="/" element={<Navigate to="/events" replace />} />
            <Route
              path="/recipes"
              element={<RecipesPage />}
            />
            <Route
              path="/recipes/new"
              element={<RecipeWizardPage />}
            />
            <Route
              path="/recipes/:recipeId"
              element={<RecipeDetailPage />}
            />
            <Route
              path="/recipes/:recipeId/edit"
              element={<RecipeWizardPage />}
            />
            <Route
              path="/ingredients"
              element={<IngredientsPage />}
            />
            <Route
              path="/events"
              element={<EventsPage />}
            />
            <Route
              path="/events/:eventId"
              element={<EventWorkspace />}
            >
              <Route index element={<OverviewTab />} />
              <Route path="plan" element={<PlanRoute />} />
              <Route path="shopping" element={<ShoppingRoute />} />
              <Route path="kalkulation" element={<KalkulationRoute />} />
              <Route path="timeline" element={<TimelineRoute />} />
            </Route>
            <Route
              path="/settings"
              element={<SettingsPage />}
            />
            <Route
              path="/account"
              element={<Navigate to="/settings" replace />}
            />
            <Route
              path="/admin"
              element={<AdminPage />}
            />
            <Route
              path="/inventories"
              element={<InventoriesPage />}
            />
            <Route
              path="*"
              element={
                <PlaceholderPage title="Nicht gefunden" phase="—" hint="Diese URL existiert nicht." />
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

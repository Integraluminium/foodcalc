import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import RequireAuth from './components/layout/RequireAuth'
import LoginPage from './pages/LoginPage'
import PlaceholderPage from './pages/PlaceholderPage'
import EventsPage from './pages/EventsPage'
import EventDetailPage from './pages/EventDetailPage'
import RecipesPage from './pages/RecipesPage'
import RecipeDetailPage from './pages/RecipeDetailPage'
import IngredientsPage from './pages/IngredientsPage'
import { ApiError } from './api'

const queryClient = new QueryClient({
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
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Navigate to="/events" replace />} />
            <Route
              path="/recipes"
              element={<RecipesPage />}
            />
            <Route
              path="/recipes/:recipeId"
              element={<RecipeDetailPage />}
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
              element={<EventDetailPage />}
            />
            <Route
              path="/inventories"
              element={
                <PlaceholderPage
                  title="Inventories"
                  phase="Phase 3"
                  hint="Lager und Bestände, Zuordnung zu Events."
                />
              }
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

import {MutationCache, QueryCache, QueryClient, QueryClientProvider} from '@tanstack/react-query'
import type {ComponentType} from 'react'
import {createBrowserRouter, Navigate, RouterProvider} from 'react-router-dom'
import {ApiError} from './api'
import RequireAuth from './components/layout/RequireAuth.tsx'
import AppShell from './components/layout/shell/AppShell.tsx'
import {notify} from './components/ui/toast/toast.ts'
import PlaceholderPage from './pages/placeholder/PlaceholderPage.tsx'

/**
 * Helper for React Router's `lazy` route property.
 * Supports default exports (`lazyRoute(() => import('./Page'))`)
 * and named exports (`lazyRoute(() => import('./Page'), 'NamedExport')`).
 */
function lazyRoute<T extends Record<string, any>>(
  importer: () => Promise<T>,
  exportName: keyof T = 'default',
) {
  return async () => {
    const module = await importer()
    return { Component: module[exportName] as ComponentType }
  }
}

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

const router = createBrowserRouter([
  {
    path: '/login',
    lazy: lazyRoute(() => import('./pages/login/LoginPage.tsx')),
  },
  {
    path: '/register',
    lazy: lazyRoute(() => import('./pages/login/RegisterPage.tsx')),
  },
  {
    path: '/status-board/:eventId/kitchen',
    lazy: lazyRoute(() => import('./pages/display/KitchenDisplayPage.tsx')),
  },
  {
    path: '/status-board/:eventId/serving',
    lazy: lazyRoute(() => import('./pages/display/ServingDisplayPage.tsx')),
  },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { path: '/', element: <Navigate to="/events" replace /> },
      {
        path: '/recipes',
        lazy: lazyRoute(() => import('./pages/recipe/RecipesPage.tsx')),
      },
      {
        path: '/recipes/new',
        lazy: lazyRoute(() => import('./pages/recipe/details/RecipeDetailPage.tsx')),
      },
      {
        path: '/recipes/:recipeId',
        lazy: lazyRoute(() => import('./pages/recipe/details/RecipeDetailPage.tsx')),
      },
      {
        path: '/recipes/:recipeId/edit',
        lazy: lazyRoute(
          () => import('./pages/recipe/details/RecipeDetailPage.tsx'),
          'RecipeEditRedirect',
        ),
      },
      {
        path: '/ingredients',
        lazy: lazyRoute(() => import('./pages/ingredient/IngredientsPage.tsx')),
      },
      {
        path: '/ingredients/new',
        lazy: lazyRoute(() => import('./pages/ingredient/details/IngredientDetailPage.tsx')),
      },
      {
        path: '/ingredients/:ingredientId',
        lazy: lazyRoute(() => import('./pages/ingredient/details/IngredientDetailPage.tsx')),
      },
      {
        path: '/events',
        lazy: lazyRoute(() => import('./pages/event/EventsPage.tsx')),
      },
      {
        path: '/events/:eventId',
        lazy: lazyRoute(() => import('./pages/event/workspace/EventWorkspace.tsx')),
        children: [
          {
            index: true,
            lazy: lazyRoute(
              () => import('./pages/event/workspace/overview/OverviewTab.tsx'),
              'OverviewTab',
            ),
          },
          {
            path: 'plan',
            lazy: lazyRoute(
              () => import('./pages/event/workspace/meals/MealPlanTab.tsx'),
              'MealPlanTab',
            ),
          },
          {
            path: 'shopping',
            lazy: lazyRoute(
              () => import('./pages/event/workspace/shopping/ShoppingTab.tsx'),
              'ShoppingTab',
            ),
          },
          {
            path: 'kalkulation',
            lazy: lazyRoute(
              () => import('./pages/event/workspace/calculation/KalkulationTab.tsx'),
              'KalkulationTab',
            ),
          },
          {
            path: 'timeline',
            lazy: lazyRoute(
              () => import('./pages/event/workspace/timeline/TimelineTab.tsx'),
              'TimelineTab',
            ),
          },
          {
            path: 'live',
            lazy: lazyRoute(
              () => import('./pages/event/workspace/live/LiveBoardTab.tsx'),
              'LiveBoardTab',
            ),
          },
        ],
      },
      {
        path: '/settings',
        lazy: lazyRoute(() => import('./pages/settings/SettingsPage.tsx')),
      },
      { path: '/account', element: <Navigate to="/settings" replace /> },
      {
        path: '/admin',
        lazy: lazyRoute(() => import('./pages/admin/AdminPage.tsx')),
      },
      {
        path: '/inventories',
        lazy: lazyRoute(() => import('./pages/inventory/InventoriesPage.tsx')),
      },
      {
        path: '/static/Documents',
        lazy: lazyRoute(() => import('./pages/documents/DocumentsPage.tsx')),
      },
      {
        path: '*',
        element: (
          <PlaceholderPage title="Nicht gefunden" phase="—" hint="Diese URL existiert nicht." />
        ),
      },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
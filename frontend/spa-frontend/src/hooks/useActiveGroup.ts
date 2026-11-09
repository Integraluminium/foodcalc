import { createContext, useContext } from 'react'
import type { Group } from '../api/types'

/**
 * Active group context (M1 of the UI plan / UI_Spec §3.1).
 *
 * The backend scopes all resources by group membership ("N Personen zu M
 * Gruppen, M Gruppen auf M Inventare, Person/Gruppe als Inhaber von
 * Rezepten"). Clients pick one *active* group — the sidebar switcher, hub
 * filters and create dialogs all default to it. The selection is persisted
 * in `localStorage` and validated against the session user's groups.
 *
 * `<ActiveGroupProvider>` lives in `components/layout/ActiveGroupProvider.tsx`;
 * this file only exports the context and the `useActiveGroup()` consumer hook.
 */
export interface ActiveGroupContextValue {
  /** All groups the session user belongs to (from `GET /api/auth/me`). */
  groups: Group[]
  /** Currently active group id; falls back to the first group. */
  activeGroupId: number | null
  /** The active group object; `null` while the session user is loading. */
  activeGroup: Group | null
  /** Switch the active group (persisted in localStorage). */
  setActiveGroupId: (id: number | null) => void
}

export const ActiveGroupContext = createContext<ActiveGroupContextValue | null>(null)

export function useActiveGroup(): ActiveGroupContextValue {
  const context = useContext(ActiveGroupContext)
  if (!context) {
    throw new Error('useActiveGroup must be used inside <ActiveGroupProvider>')
  }
  return context
}


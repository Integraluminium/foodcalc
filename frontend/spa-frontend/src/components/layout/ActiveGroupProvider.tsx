import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Group } from '../../api/types'
import {
  ActiveGroupContext,
  type ActiveGroupContextValue,
} from '../../hooks/useActiveGroup'
import { useCurrentUser } from '../../hooks/useAuth'

/**
 * Provides the app-wide active group context (see `useActiveGroup` for the
 * consumer hook). Mounted once inside `RequireAuth` in `App.tsx`.
 */
const STORAGE_KEY = 'foodcalc.activeGroupId'
const EMPTY_GROUPS: Group[] = []

function readStoredGroupId(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const id = Number(raw)
    return Number.isFinite(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

export default function ActiveGroupProvider({ children }: { children: ReactNode }) {
  const { data: user } = useCurrentUser()
  // Stable reference so consumers don't re-render during the session query.
  const groups = useMemo(() => user?.groups ?? EMPTY_GROUPS, [user?.groups])
  const [stored, setStored] = useState<number | null>(() => readStoredGroupId())

  const activeGroupId = useMemo(() => {
    if (groups.length === 0) return null
    // Prefer the stored selection, fall back to the first group so there is
    // always a usable default once authentication has loaded.
    if (stored !== null && groups.some((group) => group.id === stored)) {
      return stored
    }
    return groups[0].id
  }, [groups, stored])

  const setActiveGroupId = useCallback((id: number | null) => {
    setStored(id)
    try {
      if (id === null) localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, String(id))
    } catch {
      // Storage unavailable (private mode, tests) — selection lives in state.
    }
  }, [])

  const value = useMemo<ActiveGroupContextValue>(
    () => ({
      groups,
      activeGroupId,
      activeGroup: groups.find((group) => group.id === activeGroupId) ?? null,
      setActiveGroupId,
    }),
    [groups, activeGroupId, setActiveGroupId],
  )

  return <ActiveGroupContext.Provider value={value}>{children}</ActiveGroupContext.Provider>
}

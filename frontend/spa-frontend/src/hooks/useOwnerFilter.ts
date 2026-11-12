import { useCallback, useState } from 'react'

/** Owner filter: a concrete group id, or `'all'` for every group. */
export type GroupFilter = number | 'all'

/**
 * Geteilter Besitzer-/Gruppenfilter für Hub-Listen (UI_Spec §3.2): Default
 * „Alle Gruppen“ — die Owner-Gruppe spielt erst bei Erstellung/Bearbeitung
 * eine Rolle (dort wird sie gewählt bzw. per Besitz-Übertragung gesetzt).
 * Eine explizite Filterwahl gilt für die Session weiter.
 */
export function useOwnerFilter() {
  const [override, setOverride] = useState<GroupFilter | null>(null)
  const ownerFilter: GroupFilter = override ?? 'all'
  const setOwnerFilter = useCallback((value: GroupFilter) => setOverride(value), [])
  const matches = useCallback(
    <T extends { group_id: number }>(row: T): boolean =>
      ownerFilter === 'all' || row.group_id === ownerFilter,
    [ownerFilter],
  )
  return { ownerFilter, setOwnerFilter, matches }
}

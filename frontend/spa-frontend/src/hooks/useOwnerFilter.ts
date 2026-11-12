import {useState} from 'react'
import {useActiveGroup} from './useActiveGroup'

/**
 * Geteilter Besitzer-/Gruppenfilter für Hub-Listen (UI_Spec §3.2): folgt
 * zunächst der aktiven Gruppe der Seitenleiste; eine explizite Wahl
 * („Alle Gruppen“ oder konkrete Gruppe) gilt für die Session weiter.
 */
export function useOwnerFilter() {
  const { activeGroupId } = useActiveGroup()
  /** `null` = der Sidebar-Gruppe folgen, sonst explizite Wahl. */
  const [override, setOverride] = useState<GroupFilter | null>(null)
  const ownerFilter: GroupFilter = override ?? activeGroupId ?? 'all'
  const setOwnerFilter = (value: GroupFilter) => setOverride(value)
  const matches = <T extends { group_id: number }>(row: T): boolean =>
    ownerFilter === 'all' || row.group_id === ownerFilter
  return { ownerFilter, setOwnerFilter, matches }
}

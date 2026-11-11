import { useOutletContext } from 'react-router-dom'
import type { EventDetail } from '../../../api/types.ts'
import type { useEventMutations } from '../../../hooks/queries/useEvents.ts'

/**
 * Geteilter Kontext für alle Workspace-Tabs (via Outlet-Context): das
 * geladene Event-Detail und die Mutationen werden einmal geholt und
 * geteilt, statt dass jeder Tab eigene Requests fährt.
 */
export interface WorkspaceContext {
  eventId: number
  detail: EventDetail
  mutations: ReturnType<typeof useEventMutations>
}

/** Consumer-Hook für die Tab-Inhalte (Outlet-Context der Workspace-Route). */
export function useWorkspace(): WorkspaceContext {
  return useOutletContext<WorkspaceContext>()
}

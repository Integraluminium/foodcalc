import {useMutation, useQueryClient} from '@tanstack/react-query'
import {eventsApi, ingredientsApi, inventoriesApi, recipesApi,} from '../../api'
import {notify} from "../../components/ui/toast/toast.ts";


/** Resource domains that support ownership transfer. */
export type OwnerKind = 'recipes' | 'ingredients' | 'inventories' | 'events'

const SET_OWNERS = {
  recipes: recipesApi.setOwner,
  ingredients: ingredientsApi.setOwner,
  inventories: inventoriesApi.setOwner,
  events: eventsApi.setOwner,
} as const

/**
 * Besitz-Übertragung (LeABAC): eine geteilte Mutation für alle vier Domänen.
 * Besitz wirkt überall (Besitzer-Anzeigen, Filter, Rechte) — deshalb wird
 * nach Erfolg der komplette Query-Cache invalidiert (seltene Aktion).
 */
export function useOwnerTransfer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: { kind: OwnerKind; id: number; groupId: number }) => {
      await SET_OWNERS[args.kind](args.id, args.groupId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries()
      notify('success', 'Besitz übertragen.')
    },
  })
}

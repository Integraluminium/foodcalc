import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  eventsApi,
  type MealAddInput,
  type MealUpdateInput,
  type TourInput,
} from '../../api/endpoints/events'
import { queryKeys } from '../../api/queryKeys'
import type { ShoppingList } from '../../api/types'
import { notify } from '../../components/ui/toast/toast.ts'

const EVENTS_ROOT = ['events'] as const

/** All events of the user's groups with planner totals. */
export function useEvents() {
  return useQuery({
    queryKey: queryKeys.events.list,
    queryFn: eventsApi.list,
  })
}

/** Event detail: frame data, planned meals (with aggregates) and total cost. */
export function useEvent(id: number) {
  return useQuery({
    queryKey: queryKeys.events.detail(id),
    queryFn: () => eventsApi.detail(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

/** Event shopping list grouped by tour plus uncovered ingredients. */
export function useShoppingList(eventId: number) {
  return useQuery({
    queryKey: queryKeys.events.shoppingList(eventId),
    queryFn: () => eventsApi.shoppingList(eventId),
    enabled: Number.isFinite(eventId) && eventId > 0,
  })
}

/** Food prep tasks with recipe names (timeline feed). */
export function useEventPreps(eventId: number) {
  return useQuery({
    queryKey: queryKeys.events.preps(eventId),
    queryFn: () => eventsApi.preps(eventId),
    enabled: Number.isFinite(eventId) && eventId > 0,
  })
}

/** Inventories linked to the event. */
export function useEventInventories(eventId: number) {
  return useQuery({
    queryKey: queryKeys.events.inventories(eventId),
    queryFn: () => eventsApi.eventInventories(eventId),
    enabled: Number.isFinite(eventId) && eventId > 0,
  })
}

/** Source overrides pinned for this event. */
export function useEventOverrides(eventId: number) {
  return useQuery({
    queryKey: queryKeys.events.overrides(eventId),
    queryFn: () => eventsApi.overrides(eventId),
    enabled: Number.isFinite(eventId) && eventId > 0,
  })
}

/** Shopping tours of the event (timeline feed). */
export function useEventTours(eventId: number) {
  return useQuery({
    queryKey: queryKeys.events.tours(eventId),
    queryFn: () => eventsApi.tours(eventId),
    enabled: Number.isFinite(eventId) && eventId > 0,
  })
}

/** Per-ingredient demand vs. the stock of linked inventories. */
export function useInventoryCoverage(eventId: number) {
  return useQuery({
    queryKey: queryKeys.events.inventoryCoverage(eventId),
    queryFn: () => eventsApi.inventoryCoverage(eventId),
    enabled: Number.isFinite(eventId) && eventId > 0,
  })
}

function useInvalidateEvents() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: EVENTS_ROOT })
  }
}

export function useCreateEvent() {
  const invalidate = useInvalidateEvents()
  return useMutation({
    mutationFn: eventsApi.create,
    onSuccess: invalidate,
  })
}

/** All editing mutations for one event; every success refreshes event queries. */
export function useEventMutations(eventId: number) {
  const invalidate = useInvalidateEvents()
  const queryClient = useQueryClient()

  const update = useMutation({
    mutationFn: (input: {
      name?: string
      comment?: string | null
      budget?: string | null
    }) => eventsApi.update(eventId, input),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: () => eventsApi.remove(eventId),
    onSuccess: invalidate,
  })
  const clone = useMutation({
    mutationFn: () => eventsApi.clone(eventId),
    onSuccess: invalidate,
  })
  const addMeal = useMutation({
    mutationFn: (input: MealAddInput) => eventsApi.addMeal(eventId, input),
    onSuccess: invalidate,
  })
  const updateMeal = useMutation({
    mutationFn: (args: { mealId: number } & MealUpdateInput) => {
      const { mealId, ...input } = args
      return eventsApi.updateMeal(eventId, mealId, input)
    },
    onSuccess: invalidate,
  })
  const removeMeal = useMutation({
    mutationFn: (mealId: number) => eventsApi.removeMeal(eventId, mealId),
    onSuccess: invalidate,
  })
  const duplicateMeal = useMutation({
    mutationFn: (mealId: number) => eventsApi.duplicateMeal(eventId, mealId),
    onSuccess: invalidate,
  })
  const addTour = useMutation({
    mutationFn: (input: TourInput) => eventsApi.addTour(eventId, input),
    onSuccess: () => {
      invalidate()
      notify('success', 'Tour angelegt — passende Zutaten wurden zugeordnet.')
    },
  })
  const updateTour = useMutation({
    mutationFn: (args: { tourId: number } & TourInput) => {
      const { tourId, ...input } = args
      return eventsApi.updateTour(eventId, tourId, input)
    },
    onSuccess: invalidate,
  })
  /**
   * Optimistic: die Tour verschwindet sofort aus der Liste (inkl. Rollback
   * bei Fehler) — vorher hing die Karte bis zum Refetch sichtbar herum.
   */
  const removeTour = useMutation({
    mutationFn: (tourId: number) => eventsApi.removeTour(eventId, tourId),
    onMutate: async (tourId) => {
      await queryClient.cancelQueries({ queryKey: EVENTS_ROOT })
      const previousList = queryClient.getQueryData<ShoppingList>(
        queryKeys.events.shoppingList(eventId),
      )
      queryClient.setQueryData<ShoppingList>(
        queryKeys.events.shoppingList(eventId),
        (current) =>
          current
            ? { ...current, tours: current.tours.filter((t) => t.id !== tourId) }
            : current,
      )
      return { previousList }
    },
    onError: (_error, _tourId, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.events.shoppingList(eventId),
          context.previousList,
        )
      }
    },
    onSuccess: () => notify('success', 'Tour gelöscht.'),
    onSettled: () => invalidate(),
  })
  const addTourItem = useMutation({
    mutationFn: (args: { tourId: number; ingredientId: number }) =>
      eventsApi.addTourItem(eventId, args.tourId, args.ingredientId),
    onSuccess: () => {
      invalidate()
      notify('success', 'Zutat der Tour zugeordnet.')
    },
  })
  const removeTourItem = useMutation({
    mutationFn: (args: { tourId: number; ingredientId: number }) =>
      eventsApi.removeTourItem(eventId, args.tourId, args.ingredientId),
    onSuccess: () => {
      invalidate()
      notify('success', 'Zuordnung aufgehoben.')
    },
  })
  const setTourCompleted = useMutation({
    mutationFn: (args: { tourId: number; completed: boolean }) =>
      eventsApi.setTourCompleted(eventId, args.tourId, args.completed),
    onSuccess: (_result, args) => {
      invalidate()
      notify(
        'success',
        args.completed
          ? 'Tour als erledigt markiert — sie ist jetzt gesperrt.'
          : 'Tour wieder geöffnet.',
      )
    },
  })
  const addEventInventory = useMutation({
    mutationFn: (inventoryId: number) =>
      eventsApi.addEventInventory(eventId, inventoryId),
    onSuccess: invalidate,
  })
  const removeEventInventory = useMutation({
    mutationFn: (inventoryId: number) =>
      eventsApi.removeEventInventory(eventId, inventoryId),
    onSuccess: invalidate,
  })
  const addOverride = useMutation({
    mutationFn: (sourceId: number) => eventsApi.addOverride(eventId, sourceId),
    onSuccess: invalidate,
  })
  const removeOverride = useMutation({
    mutationFn: (sourceId: number) => eventsApi.removeOverride(eventId, sourceId),
    onSuccess: invalidate,
  })

  return {
    update,
    remove,
    clone,
    addMeal,
    updateMeal,
    removeMeal,
    duplicateMeal,
    addTour,
    updateTour,
    removeTour,
    addTourItem,
    removeTourItem,
    setTourCompleted,
    addEventInventory,
    removeEventInventory,
    addOverride,
    removeOverride,
  }
}

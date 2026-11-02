import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  eventsApi,
  type MealAddInput,
  type MealUpdateInput,
  type TourInput,
} from '../../api/endpoints/events'
import { queryKeys } from '../../api/queryKeys'

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
    onSuccess: invalidate,
  })
  const updateTour = useMutation({
    mutationFn: (args: { tourId: number } & TourInput) => {
      const { tourId, ...input } = args
      return eventsApi.updateTour(eventId, tourId, input)
    },
    onSuccess: invalidate,
  })
  const removeTour = useMutation({
    mutationFn: (tourId: number) => eventsApi.removeTour(eventId, tourId),
    onSuccess: invalidate,
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
    addEventInventory,
    removeEventInventory,
    addOverride,
    removeOverride,
  }
}

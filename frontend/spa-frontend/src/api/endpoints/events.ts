import {api} from '../client'
import type {
  Event,
  EventDetail,
  EventInventoryCoverage,
  EventListItem,
  EventMember,
  FoodPrepWithRecipe,
  Inventory,
  PlannerMeal,
  ShoppingList,
  ShoppingTour,
  SourceOverride,
  StatusBoardSnapshot,
} from '../types'

export interface EventCreateInput {
  name: string
  comment: string | null
  /** Decimal string; empty string clears the budget. */
  budget: string | null
  group_id: number
}

export interface EventUpdateInput {
  name?: string
  comment?: string | null
  budget?: string | null
}

export interface MealAddInput {
  recipe_id: number
  place_id?: number
  /** RFC 3339, e.g. `2026-06-01T18:00:00Z`. */
  start_time: string
  end_time?: string
  /** Planned energy per portion in kJ — drives the scaling. */
  energy_per_serving: string
  servings: number
  comment?: string | null
}

export interface MealUpdateInput {
  recipe_id?: number
  place_id?: number
  start_time?: string
  end_time?: string
  energy_per_serving?: string
  servings?: number
  comment?: string | null
}

export interface TourInput {
  /** RFC 3339 timestamp of the tour date. */
  tour_date: string
  store_id: number
}

export const eventsApi = {
  list: () => api.get<EventListItem[]>('/events'),
  detail: (id: number) => api.get<EventDetail>(`/events/${id}`),
  create: (input: EventCreateInput) => api.post<Event>('/events', input),
  update: (id: number, input: EventUpdateInput) =>
    api.put<Event>(`/events/${id}`, input),
  remove: (id: number) => api.delete<void>(`/events/${id}`),
  clone: (id: number) => api.post<{ id: number }>(`/events/${id}/clone`, {}),

  /** Explicit ownership transfer (Besitz-Übertragung). */
  setOwner: (id: number, groupId: number) =>
    api.put<void>(`/events/${id}/owner`, { group_id: groupId }),
  meals: (eventId: number) => api.get<PlannerMeal[]>(`/events/${eventId}/meals`),
  addMeal: (eventId: number, input: MealAddInput) =>
    api.post<{ meal_id: number }>(`/events/${eventId}/meals`, input),
  updateMeal: (eventId: number, mealId: number, input: MealUpdateInput) =>
    api.put<{ meal_id: number }>(`/events/${eventId}/meals/${mealId}`, input),
  removeMeal: (eventId: number, mealId: number) =>
    api.delete<void>(`/events/${eventId}/meals/${mealId}`),
  duplicateMeal: (eventId: number, mealId: number) =>
    api.post<{ meal_id: number }>(`/events/${eventId}/meals/${mealId}/duplicate`, {}),

  shoppingList: (eventId: number) =>
    api.get<ShoppingList>(`/events/${eventId}/shopping-list`),
  tours: (eventId: number) => api.get<ShoppingTour[]>(`/events/${eventId}/tours`),
  addTour: (eventId: number, input: TourInput) =>
    api.post<ShoppingTour>(`/events/${eventId}/tours`, input),
  updateTour: (eventId: number, tourId: number, input: TourInput) =>
    api.put<ShoppingTour>(`/events/${eventId}/tours/${tourId}`, input),
  removeTour: (eventId: number, tourId: number) =>
    api.delete<void>(`/events/${eventId}/tours/${tourId}`),
  /** Manually pin an ingredient onto a tour (overrides the auto assignment). */
  addTourItem: (eventId: number, tourId: number, ingredientId: number) =>
    api.post<void>(`/events/${eventId}/tours/${tourId}/items`, {
      ingredient_id: ingredientId,
    }),
  removeTourItem: (eventId: number, tourId: number, ingredientId: number) =>
    api.delete<void>(
      `/events/${eventId}/tours/${tourId}/items/${ingredientId}`,
    ),
  /** Lock a tour as done (or reopen it). */
  setTourCompleted: (eventId: number, tourId: number, completed: boolean) =>
    api.put<void>(`/events/${eventId}/tours/${tourId}/completed`, {
      completed,
    }),

  overrides: (eventId: number) =>
    api.get<SourceOverride[]>(`/events/${eventId}/source-overrides`),
  addOverride: (eventId: number, sourceId: number) =>
    api.post<SourceOverride>(`/events/${eventId}/source-overrides`, {
      source_id: sourceId,
    }),
  removeOverride: (eventId: number, sourceId: number) =>
    api.delete<void>(`/events/${eventId}/source-overrides/${sourceId}`),

  preps: (eventId: number) =>
    api.get<FoodPrepWithRecipe[]>(`/events/${eventId}/preps`),
  eventInventories: (eventId: number) =>
    api.get<Inventory[]>(`/events/${eventId}/inventories`),
  addEventInventory: (eventId: number, inventoryId: number) =>
    api.post<{ event_id: number; inventory_id: number }>(
      `/events/${eventId}/inventories/${inventoryId}`,
      {},
    ),
  removeEventInventory: (eventId: number, inventoryId: number) =>
    api.delete<void>(`/events/${eventId}/inventories/${inventoryId}`),
  inventoryCoverage: (eventId: number) =>
    api.get<EventInventoryCoverage[]>(`/events/${eventId}/inventory-coverage`),


  createReorder: (
    eventId: number,
    input: { meal_id: number; amount_label: string; urgency: string; note?: string },
  ) => api.post<{ id: number }>(`/events/${eventId}/reorders`, input),

  advanceReorder: (eventId: number, reorderId: number, status: string) =>
    api.put<void>(`/events/${eventId}/reorders/${reorderId}/status`, { status }),

  setMealAvailability: (
    eventId: number,
    mealId: number,
    availability: string,
    eta_minutes?: number | null,
  ) =>
    api.put<void>(`/events/${eventId}/meals/${mealId}/availability`, {
      availability,
      eta_minutes: eta_minutes ?? null,
    }),

  statusBoard: (eventId: number) =>
    api.get<StatusBoardSnapshot>(`/events/${eventId}/status-board`),
}

/** Direct per-event collaborators (grants without group membership). */
export const eventMembersApi = {
  list: (eventId: number) =>
    api.get<EventMember[]>(`/events/${eventId}/members`),
  /** `roles` are granted for this event only. */
  add: (eventId: number, user: string, roles: string[]) =>
    api.post<EventMember>(`/events/${eventId}/members`, {user, roles}),
  setRoles: (eventId: number, userId: number, roles: string[]) =>
    api.put<void>(`/events/${eventId}/members/${userId}`, {roles}),
  remove: (eventId: number, userId: number) =>
    api.delete<void>(`/events/${eventId}/members/${userId}`),
}
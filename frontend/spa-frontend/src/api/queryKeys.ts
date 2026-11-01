/**
 * Central TanStack Query key registry. Keeping every key here makes
 * invalidation targets greppable and avoids typos across hooks.
 */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  recipes: {
    list: (filters: { kind?: string; search?: string }) =>
      ['recipes', 'list', filters] as const,
    detail: (id: number) => ['recipes', 'detail', id] as const,
  },
  ingredients: {
    list: (search: string) => ['ingredients', 'list', search] as const,
    detail: (id: number) => ['ingredients', 'detail', id] as const,
  },
  master: {
    groups: ['master', 'groups'] as const,
    stores: ['master', 'stores'] as const,
    units: ['master', 'units'] as const,
    properties: ['master', 'properties'] as const,
    places: ['master', 'places'] as const,
  },
  events: {
    list: ['events', 'list'] as const,
    detail: (id: number) => ['events', 'detail', id] as const,
    shoppingList: (id: number) => ['events', 'shopping-list', id] as const,
  },
} as const

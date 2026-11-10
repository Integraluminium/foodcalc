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
    tree: (id: number) => ['recipes', 'tree', id] as const,
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
    preps: (id: number) => ['events', 'preps', id] as const,
    overrides: (id: number) => ['events', 'overrides', id] as const,
    tours: (id: number) => ['events', 'tours', id] as const,
    inventories: (id: number) => ['events', 'inventories', id] as const,
    inventoryCoverage: (id: number) => ['events', 'inventory-coverage', id] as const,
  },
  inventories: {
    list: ['inventories', 'list'] as const,
    detail: (id: number) => ['inventories', 'detail', id] as const,
    items: (id: number) => ['inventories', 'items', id] as const,
  },
  users: {
    list: (search: string) => ['users', 'list', search] as const,
  },
  groups: {
    list: ['groups', 'list'] as const,
    members: (id: number) => ['groups', 'members', id] as const,
  },
} as const

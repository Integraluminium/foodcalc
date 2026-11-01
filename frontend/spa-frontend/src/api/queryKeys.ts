/**
 * Central TanStack Query key registry. Keeping every key here makes
 * invalidation targets greppable and avoids typos across hooks.
 */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
} as const

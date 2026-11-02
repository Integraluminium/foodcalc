import { api } from '../client'
import type { RecipeTreeNode } from '../types'

/** Tree view of the recipe recursion with base amounts per node. */
export const recipesTreeApi = {
  tree: (id: number) => api.get<RecipeTreeNode>(`/recipes/${id}/tree`),
  /**
   * Cooking instructions PDF. Optional scaling like an event meal:
   * `servings × energy_per_serving`.
   */
  exportPdf: (id: number, servings?: number, energyPerServing?: number) => {
    const params = new URLSearchParams()
    if (servings !== undefined) params.set('servings', String(servings))
    if (energyPerServing !== undefined)
      params.set('energy_per_serving', String(energyPerServing))
    const suffix = params.toString() ? `?${params.toString()}` : ''
    return api.download(`/recipes/${id}/export${suffix}`, 'rezept.pdf')
  },
}

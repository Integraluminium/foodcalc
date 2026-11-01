import { api, buildQuery } from '../client'
import type {
  Recipe,
  RecipeDetail,
  RecipeIngredient,
  RecipeKind,
  RecipeListItem,
  RecipeStep,
  RecipeSubRecipe,
} from '../types'

export interface RecipeFilters {
  kind?: RecipeKind
  search?: string
}

export interface RecipeCreateInput {
  name: string
  comment: string | null
  kind: RecipeKind
  group_id: number
}

export interface RecipeUpdateInput {
  name?: string
  comment?: string | null
  kind?: RecipeKind
  weighed_in?: boolean
}

export interface RecipeIngredientInput {
  ingredient_id: number
  amount: string
  unit_id: number
}

export interface RecipeStepInput {
  order: number
  name: string
  description: string
  fixed_duration_seconds: number
  duration_per_kg_seconds: number
}

export const recipesApi = {
  list: (filters?: RecipeFilters) =>
    api.get<RecipeListItem[]>(`/recipes${buildQuery({ type: filters?.kind, search: filters?.search })}`),
  detail: (id: number) => api.get<RecipeDetail>(`/recipes/${id}`),
  create: (input: RecipeCreateInput) => api.post<Recipe>('/recipes', input),
  update: (id: number, input: RecipeUpdateInput) =>
    api.put<Recipe>(`/recipes/${id}`, input),
  remove: (id: number) => api.delete<void>(`/recipes/${id}`),
  clone: (id: number, input?: { name?: string }) =>
    api.post<{ id: number }>(`/recipes/${id}/clone`, input ?? {}),
  addIngredient: (id: number, input: RecipeIngredientInput) =>
    api.post<RecipeIngredient>(`/recipes/${id}/ingredients`, input),
  updateIngredient: (id: number, ingredientId: number, input: RecipeIngredientInput) =>
    api.put<RecipeIngredient>(`/recipes/${id}/ingredients/${ingredientId}`, input),
  removeIngredient: (id: number, ingredientId: number) =>
    api.delete<void>(`/recipes/${id}/ingredients/${ingredientId}`),
  addStep: (id: number, input: RecipeStepInput) =>
    api.post<RecipeStep>(`/recipes/${id}/steps`, input),
  updateStep: (id: number, stepId: number, input: RecipeStepInput) =>
    api.put<RecipeStep>(`/recipes/${id}/steps/${stepId}`, input),
  removeStep: (id: number, stepId: number) =>
    api.delete<void>(`/recipes/${id}/steps/${stepId}`),
  addSubRecipe: (id: number, input: { child_recipe_id: number; weight: string }) =>
    api.post<RecipeSubRecipe>(`/recipes/${id}/sub-recipes`, input),
  updateSubRecipe: (id: number, childId: number, input: { weight: string }) =>
    api.put<RecipeSubRecipe>(`/recipes/${id}/sub-recipes/${childId}`, input),
  removeSubRecipe: (id: number, childId: number) =>
    api.delete<void>(`/recipes/${id}/sub-recipes/${childId}`),
}

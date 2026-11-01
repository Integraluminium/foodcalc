import { api, buildQuery } from '../client'
import type {
  Ingredient,
  IngredientDetail,
  IngredientSource,
  IngredientWeight,
  IngredientWithSources,
  Property,
} from '../types'

export interface IngredientSourceInput {
  store_id: number
  package_size: string
  unit_id: number
  price: string
  url: string | null
  comment: string | null
}

export const ingredientsApi = {
  list: (search?: string) =>
    api.get<IngredientWithSources[]>(`/ingredients${buildQuery({ search })}`),
  detail: (id: number) => api.get<IngredientDetail>(`/ingredients/${id}`),
  create: (input: {
    name: string
    energy: string
    comment: string | null
    group_id: number
  }) => api.post<Ingredient>('/ingredients', input),
  update: (
    id: number,
    input: {
      name?: string
      energy?: string
      comment?: string | null
      group_id?: number
    },
  ) => api.put<Ingredient>(`/ingredients/${id}`, input),
  remove: (id: number) => api.delete<void>(`/ingredients/${id}`),
  addSource: (id: number, input: IngredientSourceInput) =>
    api.post<IngredientSource>(`/ingredients/${id}/sources`, input),
  updateSource: (id: number, sourceId: number, input: IngredientSourceInput) =>
    api.put<IngredientSource>(`/ingredients/${id}/sources/${sourceId}`, input),
  removeSource: (id: number, sourceId: number) =>
    api.delete<void>(`/ingredients/${id}/sources/${sourceId}`),
  addWeight: (id: number, input: { unit_id: number; weight: string }) =>
    api.post<IngredientWeight>(`/ingredients/${id}/weights`, input),
  updateWeight: (id: number, unitId: number, input: { weight: string }) =>
    api.put<IngredientWeight>(`/ingredients/${id}/weights/${unitId}`, input),
  removeWeight: (id: number, unitId: number) =>
    api.delete<void>(`/ingredients/${id}/weights/${unitId}`),
  addProperty: (id: number, input: { property_id: number }) =>
    api.post<void>(`/ingredients/${id}/properties`, input),
  removeProperty: (id: number, propertyId: number) =>
    api.delete<void>(`/ingredients/${id}/properties/${propertyId}`),
}

export type { Property }

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ingredientsApi,
  type IngredientSourceInput,
} from '../../api/endpoints/ingredients'
import { queryKeys } from '../../api/queryKeys'

const LIST_ROOT = ['ingredients'] as const

export interface IngredientFilters {
  search?: string
  /** Only ingredients carrying this property (picker filter). */
  property_id?: number
}

export function useIngredients(filters?: IngredientFilters) {
  const search = filters?.search
  return useQuery({
    queryKey: [
      ...queryKeys.ingredients.list(search ?? ''),
      filters?.property_id ?? null,
    ],
    queryFn: () => ingredientsApi.list(filters),
  })
}

/** Composed detail: base fields + sources + unit weights + properties. */
export function useIngredient(id: number | null) {
  return useQuery({
    queryKey: queryKeys.ingredients.detail(id ?? 0),
    queryFn: () => ingredientsApi.detail(id as number),
    enabled: id !== null && Number.isFinite(id) && id > 0,
  })
}

function useInvalidateIngredients() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: LIST_ROOT })
  }
}

export function useCreateIngredient() {
  const invalidate = useInvalidateIngredients()
  return useMutation({
    mutationFn: ingredientsApi.create,
    onSuccess: invalidate,
  })
}

/** Rezepte, die diese Zutat verwenden (Verwendungsliste + Lösch-Warnung). */
export function useIngredientUsages(id: number | null) {
  return useQuery({
    queryKey: ['ingredients', 'usages', id] as const,
    queryFn: () => ingredientsApi.usages(id as number),
    enabled: id !== null && Number.isFinite(id) && id > 0,
  })
}

export function useIngredientMutations(ingredientId: number) {
  const invalidate = useInvalidateIngredients()

  const update = useMutation({
    mutationFn: (input: {
      name?: string
      energy?: string
      comment?: string | null
      group_id?: number
    }) => ingredientsApi.update(ingredientId, input),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: () => ingredientsApi.remove(ingredientId),
    onSuccess: invalidate,
  })
  const addSource = useMutation({
    mutationFn: (input: IngredientSourceInput) =>
      ingredientsApi.addSource(ingredientId, input),
    onSuccess: invalidate,
  })
  const updateSource = useMutation({
    mutationFn: ({ sourceId, ...input }: { sourceId: number } & IngredientSourceInput) =>
      ingredientsApi.updateSource(ingredientId, sourceId, input),
    onSuccess: invalidate,
  })
  const removeSource = useMutation({
    mutationFn: (sourceId: number) =>
      ingredientsApi.removeSource(ingredientId, sourceId),
    onSuccess: invalidate,
  })
  const addWeight = useMutation({
    mutationFn: (input: { unit_id: number; weight: string }) =>
      ingredientsApi.addWeight(ingredientId, input),
    onSuccess: invalidate,
  })
  const updateWeight = useMutation({
    mutationFn: (args: { unitId: number; weight: string }) =>
      ingredientsApi.updateWeight(ingredientId, args.unitId, {
        weight: args.weight,
      }),
    onSuccess: invalidate,
  })
  const removeWeight = useMutation({
    mutationFn: (unitId: number) =>
      ingredientsApi.removeWeight(ingredientId, unitId),
    onSuccess: invalidate,
  })
  const addProperty = useMutation({
    mutationFn: (propertyId: number) =>
      ingredientsApi.addProperty(ingredientId, { property_id: propertyId }),
    onSuccess: invalidate,
  })
  const removeProperty = useMutation({
    mutationFn: (propertyId: number) =>
      ingredientsApi.removeProperty(ingredientId, propertyId),
    onSuccess: invalidate,
  })

  return {
    update,
    remove,
    addSource,
    updateSource,
    removeSource,
    addWeight,
    updateWeight,
    removeWeight,
    addProperty,
    removeProperty,
  }
}

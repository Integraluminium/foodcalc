import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ingredientsApi,
  type IngredientSourceInput,
} from '../../api/endpoints/ingredients'
import { queryKeys } from '../../api/queryKeys'

const LIST_ROOT = ['ingredients'] as const

export function useIngredients(search?: string) {
  return useQuery({
    queryKey: queryKeys.ingredients.list(search ?? ''),
    queryFn: () => ingredientsApi.list(search),
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
    mutationFn: (args: { sourceId: number } & IngredientSourceInput) =>
      ingredientsApi.updateSource(ingredientId, args.sourceId, args),
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

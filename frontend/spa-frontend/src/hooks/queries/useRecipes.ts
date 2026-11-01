import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  recipesApi,
  type RecipeFilters,
  type RecipeStepInput,
  type RecipeUpdateInput,
} from '../../api/endpoints/recipes'
import { queryKeys } from '../../api/queryKeys'

const LIST_ROOT = ['recipes'] as const

/** Recipes for the list screen (kind/search filters are part of the key). */
export function useRecipes(filters?: RecipeFilters) {
  const normalized = { kind: filters?.kind, search: filters?.search }
  return useQuery({
    queryKey: queryKeys.recipes.list(normalized),
    queryFn: () => recipesApi.list(filters),
  })
}

/** Full recipe tree (ingredients, sub-recipes, steps, properties, stats). */
export function useRecipe(id: number) {
  return useQuery({
    queryKey: queryKeys.recipes.detail(id),
    queryFn: () => recipesApi.detail(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

function useInvalidateRecipes() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: LIST_ROOT })
  }
}

export function useCreateRecipe() {
  const invalidate = useInvalidateRecipes()
  return useMutation({
    mutationFn: recipesApi.create,
    onSuccess: invalidate,
  })
}

export interface RecipeIngredientInput {
  ingredient_id: number
  amount: string
  unit_id: number
}

/** All editing mutations for one recipe; every success refreshes the lists. */
export function useRecipeMutations(recipeId: number) {
  const invalidate = useInvalidateRecipes()

  const update = useMutation({
    mutationFn: (input: RecipeUpdateInput) => recipesApi.update(recipeId, input),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: () => recipesApi.remove(recipeId),
    onSuccess: invalidate,
  })
  const clone = useMutation({
    mutationFn: (input?: { name?: string }) => recipesApi.clone(recipeId, input),
    onSuccess: invalidate,
  })
  const addIngredient = useMutation({
    mutationFn: (input: RecipeIngredientInput) =>
      recipesApi.addIngredient(recipeId, input),
    onSuccess: invalidate,
  })
  const updateIngredient = useMutation({
    mutationFn: (args: { ingredientId: number } & RecipeIngredientInput) =>
      recipesApi.updateIngredient(recipeId, args.ingredientId, args),
    onSuccess: invalidate,
  })
  const removeIngredient = useMutation({
    mutationFn: (ingredientId: number) =>
      recipesApi.removeIngredient(recipeId, ingredientId),
    onSuccess: invalidate,
  })
  const addStep = useMutation({
    mutationFn: (input: RecipeStepInput) => recipesApi.addStep(recipeId, input),
    onSuccess: invalidate,
  })
  const updateStep = useMutation({
    mutationFn: (args: { stepId: number } & RecipeStepInput) =>
      recipesApi.updateStep(recipeId, args.stepId, args),
    onSuccess: invalidate,
  })
  const removeStep = useMutation({
    mutationFn: (stepId: number) => recipesApi.removeStep(recipeId, stepId),
    onSuccess: invalidate,
  })
  const addSubRecipe = useMutation({
    mutationFn: (input: { child_recipe_id: number; weight: string }) =>
      recipesApi.addSubRecipe(recipeId, input),
    onSuccess: invalidate,
  })
  const updateSubRecipe = useMutation({
    mutationFn: (args: { childId: number; weight: string }) =>
      recipesApi.updateSubRecipe(recipeId, args.childId, {
        weight: args.weight,
      }),
    onSuccess: invalidate,
  })
  const removeSubRecipe = useMutation({
    mutationFn: (childId: number) =>
      recipesApi.removeSubRecipe(recipeId, childId),
    onSuccess: invalidate,
  })

  return {
    update,
    remove,
    clone,
    addIngredient,
    updateIngredient,
    removeIngredient,
    addStep,
    updateStep,
    removeStep,
    addSubRecipe,
    updateSubRecipe,
    removeSubRecipe,
  }
}

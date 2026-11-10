import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  recipesApi,
  type RecipeFilters,
  type RecipeStepInput,
  type RecipeUpdateInput,
} from '../../api/endpoints/recipes'
import { recipesTreeApi } from '../../api/endpoints/recipesTree'
import { queryKeys } from '../../api/queryKeys'


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

/** Recursive composition tree (view mode, S/I nodes with base amounts). */
export function useRecipeTree(id: number) {
  return useQuery({
    queryKey: queryKeys.recipes.tree(id),
    queryFn: () => recipesTreeApi.tree(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

function useInvalidateRecipeData() {
  const queryClient = useQueryClient()
  return () => {
    // Rezept-Änderungen wirken überall nach: Listen/Details/Bäume, aber auch
    // Events (Namen, Gewichte, Kosten, Energiedichten im Speiseplan und in
    // Kalkulation/Einkauf). Ohne die Events-Invalidierung zeigt der
    // Speiseplan nach einer Rezept-Bearbeitung veraltete Werte.
    void queryClient.invalidateQueries({ queryKey: ['recipes'] })
    void queryClient.invalidateQueries({ queryKey: ['events'] })
  }
}

export function useCreateRecipe() {
  const invalidate = useInvalidateRecipeData()
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
  const invalidate = useInvalidateRecipeData()

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

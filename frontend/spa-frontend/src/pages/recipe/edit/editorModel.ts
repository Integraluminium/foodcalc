import type {RecipeDetail} from '../../../api/types.ts'
import {toNumber} from '../../../lib/format.ts'

/** Draft of one ingredient line; `existingId` = server row id when editing. */
export interface DraftIngredient {
    existingId?: number
    ingredientId: number
    amount: string
    unitId: number
    /** Resolved base weight in kg (amount × kg/unit) once known. */
    kg: number | null
    /** kJ/g density from the ingredient catalog. */
    density: number | null
}

export interface DraftSubRecipe {
    existingId?: number
    recipeId: number
    /** kg of the sub-recipe used by this one. */
    weight: string
    /** kJ/g density of the sub-recipe, resolved by its detail. */
    density: number | null
}

export interface DraftStep {
    existingId?: number
    name: string
    description: string
    fixedSeconds: number
    perKgSeconds: number
    /** Marks this step as a HACCP control point. */
    isHaccp: boolean
}

export interface Draft {
    name: string
    comment: string
    kind: 'meal' | 'component'
    groupId: number
    weighedIn: boolean
    ingredients: DraftIngredient[]
    subRecipes: DraftSubRecipe[]
    steps: DraftStep[]
}

export type Action =
    | { type: 'set-frame'; patch: Partial<Pick<Draft, 'name' | 'comment' | 'kind' | 'groupId' | 'weighedIn'>> }
    | { type: 'add-ingredient'; row: DraftIngredient }
    | { type: 'update-ingredient'; index: number; patch: Partial<DraftIngredient> }
    | { type: 'remove-ingredient'; index: number }
    | { type: 'add-sub'; row: DraftSubRecipe }
    | { type: 'update-sub'; index: number; patch: Partial<DraftSubRecipe> }
    | { type: 'remove-sub'; index: number }
    | { type: 'add-step' }
    | { type: 'update-step'; index: number; patch: Partial<DraftStep> }
    | { type: 'remove-step'; index: number }
    | { type: 'move-step'; index: number; direction: -1 | 1 }
    | { type: 'replace'; draft: Draft }

export function reducer(state: Draft, action: Action): Draft {
    switch (action.type) {
        case 'set-frame':
            return {...state, ...action.patch}
        case 'add-ingredient':
            return {...state, ingredients: [...state.ingredients, action.row]}
        case 'update-ingredient':
            return {
                ...state,
                ingredients: state.ingredients.map((row, index) =>
                    index === action.index ? {...row, ...action.patch} : row,
                ),
            }
        case 'remove-ingredient':
            return {
                ...state,
                ingredients: state.ingredients.filter((_, index) => index !== action.index),
            }
        case 'add-sub':
            return {...state, subRecipes: [...state.subRecipes, action.row]}
        case 'update-sub':
            return {
                ...state,
                subRecipes: state.subRecipes.map((row, index) =>
                    index === action.index ? {...row, ...action.patch} : row,
                ),
            }
        case 'remove-sub':
            return {
                ...state,
                subRecipes: state.subRecipes.filter((_, index) => index !== action.index),
            }
        case 'add-step':
            return {
                ...state,
                steps: [
                    ...state.steps,
                    {name: '', description: '', fixedSeconds: 0, perKgSeconds: 0, isHaccp: false},
                ],
            }
        case 'update-step':
            return {
                ...state,
                steps: state.steps.map((step, index) =>
                    index === action.index ? {...step, ...action.patch} : step,
                ),
            }
        case 'remove-step':
            return {
                ...state,
                steps: state.steps.filter((_, index) => index !== action.index),
            }
        case 'move-step': {
            const target = action.index + action.direction
            if (target < 0 || target >= state.steps.length) return state
            const steps = [...state.steps]
            ;[steps[action.index], steps[target]] = [steps[target], steps[action.index]]
            return {...state, steps}
        }
        case 'replace':
            return action.draft
    }
}

/** Creates an empty draft for the create mode. */
export function emptyDraft(groupId: number, kind: 'meal' | 'component'): Draft {
    return {
        name: '',
        comment: '',
        kind,
        groupId,
        weighedIn: false,
        ingredients: [],
        subRecipes: [],
        steps: [],
    }
}

/** Maps an existing recipe detail into the draft (edit mode). */
export function draftFromDetail(detail: RecipeDetail): Draft {
    return {
        name: detail.name,
        comment: detail.comment ?? '',
        kind: detail.kind,
        groupId: detail.group_id,
        weighedIn: detail.weighed_in,
        ingredients: detail.ingredients.map((row) => ({
            existingId: row.ingredient_id,
            ingredientId: row.ingredient_id,
            amount: String(toNumber(row.amount) ?? ''),
            unitId: row.unit_id,
            kg: null,
            density: null,
        })),
        subRecipes: detail.sub_recipes.map((row) => ({
            existingId: row.recipe_id,
            recipeId: row.recipe_id,
            weight: String(toNumber(row.weight) ?? ''),
            density: null,
        })),
        steps: detail.steps.map((step) => ({
            existingId: step.id,
            name: step.name,
            description: step.description,
            fixedSeconds: step.fixed_duration_seconds,
            perKgSeconds: step.duration_per_kg_seconds,
            isHaccp: step.is_haccp,
        })),
    }
}

export interface DraftStats {
    /** Resolved cooking weight in kg (rows with known conversion only). */
    weight: number
    /** Resolved total energy in kJ. */
    energy: number
    /** kJ/g — the value the energy-based event scaling later relies on. */
    density: number | null
}

/**
 * Live-Planwerte des Entwurfs — reine Funktion, damit die Skalierungs-
 * Kernlogik (kg × Dichte) unit-testbar ist, ohne React oder API.
 */
export function draftStats(draft: Draft): DraftStats {
    let weight = 0
    let energy = 0
    for (const row of draft.ingredients) {
        if (row.kg !== null) {
            weight += row.kg
            if (row.density !== null) energy += row.kg * 1000 * row.density
        }
    }
    for (const row of draft.subRecipes) {
        const kg = toNumber(row.weight)
        if (kg !== null) {
            weight += kg
            if (row.density !== null) energy += kg * 1000 * row.density
        }
    }
    return {
        weight,
        energy,
        density: weight > 0 ? energy / (weight * 1000) : null,
    }
}

/**
 * Entwurf ohne abgeleitete Werte (kg/Dichte) — Basis des Dirty-Vergleichs:
 * Server-Refetches der Detail-Queries füllen die Auflösung nach und sollen
 * NICHT als ungespeicherte Änderung gelten.
 */
export function dirtyDraft(draft: Draft): unknown {
    return {
        ...draft,
        ingredients: draft.ingredients.map(({ kg: _kg, density: _density, ...rest }) => rest),
        subRecipes: draft.subRecipes.map(({ density: _density, ...rest }) => rest),
    }
}

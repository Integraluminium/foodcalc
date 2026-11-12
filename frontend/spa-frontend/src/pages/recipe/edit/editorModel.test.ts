import {describe, expect, it} from 'vitest'
import type {RecipeDetail} from '../../../api/types'
import {draftFromDetail, draftStats, emptyDraft, reducer, type Draft} from './editorModel'

function detail(): RecipeDetail {
    return {
        id: 7,
        name: 'Chili',
        comment: 'scharf',
        kind: 'meal',
        group_id: 3,
        weighed_in: true,
        ingredients: [
            {ingredient_id: 11, amount: '2', unit_id: 5},
            {ingredient_id: 12, amount: '0.5', unit_id: 5},
        ],
        sub_recipes: [{recipe_id: 20, weight: '1.5'}],
        steps: [
            {
                id: 30,
                order: 100,
                name: 'Anschwitzen',
                description: 'Zwiebeln',
                fixed_duration_seconds: 600,
                duration_per_kg_seconds: 1500,
            },
        ],
    } as unknown as RecipeDetail
}

describe('reducer', () => {
    it('set-frame patcht nur die übergebenen Felder', () => {
        const state = emptyDraft(3, 'meal')
        const next = reducer(state, {
            type: 'set-frame',
            patch: {name: 'Chili', kind: 'component'},
        })
        expect(next.name).toBe('Chili')
        expect(next.kind).toBe('component')
        expect(next.groupId).toBe(3)
    })

    it('add/update/remove-ingredient arbeitet indexgenau', () => {
        let state = emptyDraft(3, 'meal')
        state = reducer(state, {
            type: 'add-ingredient',
            row: {ingredientId: 11, amount: '2', unitId: 5, kg: null, density: null},
        })
        state = reducer(state, {
            type: 'add-ingredient',
            row: {ingredientId: 12, amount: '1', unitId: 5, kg: null, density: null},
        })
        state = reducer(state, {
            type: 'update-ingredient',
            index: 1,
            patch: {amount: '4'},
        })
        expect(state.ingredients[1].amount).toBe('4')
        state = reducer(state, {type: 'remove-ingredient', index: 0})
        expect(state.ingredients).toHaveLength(1)
        expect(state.ingredients[0].ingredientId).toBe(12)
    })

    it('move-step tauscht Nachbarn und respektiert die Grenzen', () => {
        let state = emptyDraft(3, 'meal')
        state = reducer(state, {type: 'add-step'})
        state = reducer(state, {type: 'add-step'})
        state = reducer(state, {type: 'update-step', index: 0, patch: {name: 'A'}})
        state = reducer(state, {type: 'update-step', index: 1, patch: {name: 'B'}})

        const upAtFirst = reducer(state, {type: 'move-step', index: 0, direction: -1})
        expect(upAtFirst.steps.map((step) => step.name)).toEqual(['A', 'B'])

        const swapped = reducer(state, {type: 'move-step', index: 0, direction: 1})
        expect(swapped.steps.map((step) => step.name)).toEqual(['B', 'A'])

        const downAtLast = reducer(swapped, {type: 'move-step', index: 1, direction: 1})
        expect(downAtLast.steps.map((step) => step.name)).toEqual(['B', 'A'])
    })
})

describe('draftFromDetail / emptyDraft', () => {
    it('übernimmt Rahmen und Zeilen inkl. existingIds', () => {
        const draft = draftFromDetail(detail())
        expect(draft.name).toBe('Chili')
        expect(draft.kind).toBe('meal')
        expect(draft.weighedIn).toBe(true)
        expect(draft.ingredients[0]).toMatchObject({
            existingId: 11,
            ingredientId: 11,
            amount: '2',
            unitId: 5,
            kg: null,
            density: null,
        })
        expect(draft.subRecipes[0]).toMatchObject({recipeId: 20, weight: '1.5'})
        expect(draft.steps[0]).toMatchObject({existingId: 30, fixedSeconds: 600, perKgSeconds: 1500})
    })

    it('emptyDraft startet leer mit Vorgaben', () => {
        const draft = emptyDraft(9, 'component')
        expect(draft).toEqual({
            name: '',
            comment: '',
            kind: 'component',
            groupId: 9,
            weighedIn: false,
            ingredients: [],
            subRecipes: [],
            steps: [],
        })
    })
})

describe('draftStats', () => {
    it('gewichtet Energie über kg × Dichte und leitet die Dichte ab', () => {
        const draft: Draft = {
            ...emptyDraft(1, 'meal'),
            ingredients: [
                {ingredientId: 1, amount: '2', unitId: 5, kg: 2, density: 0.5},
                {ingredientId: 2, amount: '1', unitId: 5, kg: null, density: null},
            ],
            subRecipes: [{recipeId: 20, weight: '1.5', density: 4}],
        }
        const stats = draftStats(draft)
        expect(stats.weight).toBeCloseTo(3.5)
        expect(stats.energy).toBeCloseTo(2 * 1000 * 0.5 + 1.5 * 1000 * 4)
        expect(stats.density).toBeCloseTo(stats.energy / (stats.weight * 1000))
    })

    it('liefert Nullen und null-Dichte für einen leeren Entwurf', () => {
        expect(draftStats(emptyDraft(1, 'meal'))).toEqual({
            weight: 0,
            energy: 0,
            density: null,
        })
    })
})

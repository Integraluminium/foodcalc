import {describe, expect, it} from 'vitest'
import type {PlannerMeal} from '../api/types'
import {eventAggregates} from './eventAggregation'

function meal(servings: number, weight: string | number | null): PlannerMeal {
    return {servings, weight} as unknown as PlannerMeal
}

describe('eventAggregates', () => {
    it('summiert Portionen, Kochmenge und Kosten über alle Mahlzeiten', () => {
        const result = eventAggregates([meal(30, '12.5'), meal(50, 7.25)], '233.33')
        expect(result.mealCount).toBe(2)
        expect(result.portions).toBe(80)
        expect(result.weightKg).toBeCloseTo(19.75)
        expect(result.cost).toBeCloseTo(233.33)
    })

    it('ignoriert fehlende Gewichte und fehlende Kosten', () => {
        const result = eventAggregates([meal(10, null), meal(20, '3')], null)
        expect(result.portions).toBe(30)
        expect(result.weightKg).toBeCloseTo(3)
        expect(result.cost).toBe(0)
    })

    it('liefert Nullen für ein Event ohne Mahlzeiten', () => {
        expect(eventAggregates([], '5')).toEqual({
            mealCount: 0,
            portions: 0,
            weightKg: 0,
            cost: 5,
        })
    })
})

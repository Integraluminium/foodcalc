import type {PlannerMeal} from '../api/types'
import {toNumber} from './format'

export interface EventAggregates {
  mealCount: number
  portions: number
  weightKg: number
  cost: number
}

/**
 * Event-Kennzahlen aus den Planner-Mahlzeiten (Portionen, Kochmenge, Kosten)
 * — eine Berechnungsquelle für Workspace-Topbar, Übersicht-Tab und später die
 * Kalkulation, statt dreifach reduzierter Reduce-Blöcke.
 */
export function eventAggregates(
  meals: readonly PlannerMeal[],
  totalCost: string | number | null | undefined,
): EventAggregates {
  let portions = 0
  let weightKg = 0
  for (const meal of meals) {
    portions += meal.servings
    weightKg += toNumber(meal.weight) ?? 0
  }
  return {
    mealCount: meals.length,
    portions,
    weightKg,
    cost: toNumber(totalCost) ?? 0,
  }
}


/**
 * Single source of truth for the energy-based scaling math (UI_Spec §1.2):
 * recipes scale by nutritional energy (kJ), not by weight. Every screen that
 * shows or computes a scaled amount (meal dialog preview, planner rows,
 * recipe stats) must use these helpers instead of re-deriving the math.
 *
 * Decimal strings (backend `BigDecimal` convention) are accepted directly.
 */
import { toNumber } from './format'

/** Energy density in kJ/g from resolved totals; `null` when not computable. */
export function energyDensityKjPerG(
  weightKg: number | string | null | undefined,
  energyKj: number | string | null | undefined,
): number | null {
  const weight = toNumber(weightKg)
  const energy = toNumber(energyKj)
  if (weight === null || energy === null || weight <= 0) return null
  return energy / (weight * 1000)
}

/** Cooked weight (kg) implied by a target energy; `null` when not computable. */
export function scaledWeightKg(
  baseWeightKg: number | string | null | undefined,
  baseEnergyKj: number | string | null | undefined,
  targetEnergyKj: number,
): number | null {
  const weight = toNumber(baseWeightKg)
  const energy = toNumber(baseEnergyKj)
  if (weight === null || energy === null || energy <= 0) return null
  if (!Number.isFinite(targetEnergyKj) || targetEnergyKj < 0) return null
  return (weight * targetEnergyKj) / energy
}

/** Cost per portion from a meal total; `null` for invalid inputs. */
export function portionCost(
  totalPrice: number | string | null | undefined,
  servings: number | null | undefined,
): number | null {
  const price = toNumber(totalPrice)
  if (price === null || servings == null || servings <= 0) return null
  return price / servings
}

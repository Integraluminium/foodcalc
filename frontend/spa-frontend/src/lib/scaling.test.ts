import { describe, expect, it } from 'vitest'
import { energyDensityKjPerG, portionCost, scaledWeightKg } from './scaling'

describe('scaling helpers', () => {
  it('computes energy density from totals', () => {
    // 14_860 kJ in 1 kg → 14.86 kJ/g
    expect(energyDensityKjPerG(1, 14860)).toBeCloseTo(14.86)
    expect(energyDensityKjPerG('1.0000', '14860.00')).toBeCloseTo(14.86)
    expect(energyDensityKjPerG(0, 100)).toBeNull()
    expect(energyDensityKjPerG(-1, 100)).toBeNull()
    expect(energyDensityKjPerG(null, 100)).toBeNull()
    expect(energyDensityKjPerG(1, null)).toBeNull()
  })

  it('scales weight by target energy', () => {
    // Base: 2 kg carrying 1000 kJ → 5000 kJ target → 10 kg
    expect(scaledWeightKg(2, 1000, 5000)).toBeCloseTo(10)
    expect(scaledWeightKg('2.0000', '1000', 0)).toBe(0)
    expect(scaledWeightKg(2, 0, 5000)).toBeNull()
    expect(scaledWeightKg(null, 1000, 5000)).toBeNull()
    expect(scaledWeightKg(2, null, 5000)).toBeNull()
    expect(scaledWeightKg(2, 1000, Number.NaN)).toBeNull()
    expect(scaledWeightKg(2, 1000, -1)).toBeNull()
  })

  it('computes cost per portion', () => {
    expect(portionCost(60, 30)).toBeCloseTo(2)
    expect(portionCost('60.00', 30)).toBeCloseTo(2)
    expect(portionCost(null, 30)).toBeNull()
    expect(portionCost(60, 0)).toBeNull()
    expect(portionCost(60, null)).toBeNull()
  })
})

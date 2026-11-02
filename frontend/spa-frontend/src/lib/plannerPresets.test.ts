import { describe, expect, it } from 'vitest'
import { ENERGY_PRESETS, presetForKj } from './plannerPresets'

describe('plannerPresets', () => {
  it('contains unique kJ values with positive energy', () => {
    const kjs = ENERGY_PRESETS.map((preset) => preset.kj)
    expect(new Set(kjs).size).toBe(kjs.length)
    for (const kj of kjs) expect(kj).toBeGreaterThan(0)
  })

  it('resolves presets by kJ and returns null otherwise', () => {
    expect(presetForKj(2400)?.label).toBe('Hauptgericht')
    expect(presetForKj(999)).toBeNull()
  })
})

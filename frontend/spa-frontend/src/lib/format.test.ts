import { describe, expect, it } from 'vitest'
import { formatDecimal, formatKjPerG, formatMinutes, toNumber } from './format'

describe('format helpers', () => {
  it('parses BigDecimal strings', () => {
    expect(toNumber('2.5000')).toBe(2.5)
    expect(toNumber('')).toBeNull()
    expect(toNumber(null)).toBeNull()
    expect(toNumber('not-a-number')).toBeNull()
    expect(toNumber(3)).toBe(3)
  })

  it('formats decimals with fixed precision', () => {
    expect(formatDecimal('2.5000')).toBe('2.50')
    expect(formatDecimal(1.005, 3)).toBe('1.005')
    expect(formatDecimal(null)).toBe('–')
  })

  it('formats energy densities', () => {
    expect(formatKjPerG(14.86)).toBe('14.86 kJ/g')
    expect(formatKjPerG(null)).toBe('–')
  })

  it('formats step durations in minutes', () => {
    expect(formatMinutes(600)).toBe('10 min')
    expect(formatMinutes(0)).toBe('–')
  })
})

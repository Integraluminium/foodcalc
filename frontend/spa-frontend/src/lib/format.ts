/**
 * Formatting helpers for the wire conventions (BigDecimal strings,
 * RFC3339 timestamps). Keep every user-facing number formatting here so
 * decimal separators and units stay consistent across screens.
 */

/** Parses a BigDecimal string into a number, `null` for non-numeric input. */
export function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Fixed-decimal formatting; `–` for missing values. */
export function formatDecimal(
  value: string | number | null | undefined,
  fractionDigits = 2,
): string {
  const parsed = toNumber(value)
  return parsed === null ? '–' : parsed.toFixed(fractionDigits)
}

/** Energy density as shown in list rows and the recipe header. */
export function formatKjPerG(value: number | null | undefined): string {
  return value === null || value === undefined ? '–' : `${value.toFixed(2)} kJ/g`
}

/** Seconds → compact minutes (step durations are modeled in seconds). */
export function formatMinutes(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '–'
  return `${Math.round(seconds / 60)} min`
}

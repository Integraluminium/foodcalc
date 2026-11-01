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

// --- Date/time helpers (RFC 3339 wire format ↔ datetime-local inputs) ------

const pad2 = (n: number) => String(n).padStart(2, '0')

/** `datetime-local` input value → RFC 3339 (UTC) for the API. */
export function localInputToRfc3339(value: string): string {
  return new Date(value).toISOString()
}

/** RFC 3339 → `datetime-local` input value in the local timezone. */
export function rfc3339ToLocalInput(value: string): string {
  const d = new Date(value)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** Short weekday + date label for day grouping ("Mo., 01.06."). */
export function formatDayLabel(rfc3339: string): string {
  const d = new Date(rfc3339)
  return `${WEEKDAYS[d.getDay()]}, ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`
}

/** HH:MM in local time. */
export function formatTime(rfc3339: string): string {
  const d = new Date(rfc3339)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** Compact date range ("01.06. – 03.06.2026"), `–` when empty. */
export function formatDateRange(
  first: string | null,
  last: string | null,
): string {
  if (!first && !last) return '–'
  const fmt = (value: string) => {
    const d = new Date(value)
    return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`
  }
  const a = first ? fmt(first) : null
  const b = last ? fmt(last) : null
  if (a && b && a === b) return a
  return a && b ? `${a} – ${b}` : (a ?? b ?? '–')
}

const WEEKDAYS = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.']

/** `date` input value ("2026-06-01") → RFC 3339 at local noon (UTC wire). */
export function dateInputToRfc3339(value: string): string {
  return new Date(`${value}T12:00:00`).toISOString()
}

/** RFC 3339 → `date` input value in local time. */
export function rfc3339ToDateInput(value: string): string {
  const d = new Date(value)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

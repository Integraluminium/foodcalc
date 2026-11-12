import {DE} from './de'

export type StringKey = keyof typeof DE


/**
 * Löst einen Pfad wie `plan.col.time` im Wörterbuch auf und ersetzt `{name}`-Platzhalter.
 * Fehlt der Schlüssel, wird der Pfad selbst zurückgegeben (sichtbar im UI, leicht zu finden).
 */
export function t(path: string, params: Record<string, string | number> = {}): string {
  const value = path
    .split('.')
    .reduce<unknown>(
      (node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined),
      DE,
    )

  if (typeof value !== 'string') return path

  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

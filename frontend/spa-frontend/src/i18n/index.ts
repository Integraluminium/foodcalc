import {DE} from './de'
import {EN} from './en'

/**
 * Pfade zu allen Blättern des Wörterbuchs (z. B. `plan.col.time`) — Typ für
 * `t()`. Tippfehler und nicht existierende Schlüssel fallen damit bereits
 * beim Kompilieren auf, statt zur Laufzeit den Pfad selbst anzuzeigen.
 */
type LeafPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${LeafPaths<T[K]>}`
}[keyof T & string]

export type StringKey = LeafPaths<typeof DE>

/**
 * Locale-Registry: `de` ist Quelle, `en` ist strukturell synchron
 * (Parity-Guard in `en.ts`). Ein Locale-Umschalter tauscht später nur das
 * aktive Wörterbuch unten aus — `t()` selbst bleibt unverändert.
 */
const DICTIONARIES = {de: DE, en: EN} as const
type Locale = keyof typeof DICTIONARIES
const ACTIVE_LOCALE: Locale = 'de'
void DICTIONARIES
void ACTIVE_LOCALE


/**
 * Löst einen Pfad wie `plan.col.time` im Wörterbuch auf und ersetzt `{name}`-Platzhalter.
 * Fehlt der Schlüssel, wird der Pfad selbst zurückgegeben (sichtbar im UI, leicht zu finden).
 */
export function t(path: StringKey, params: Record<string, string | number> = {}): string {
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

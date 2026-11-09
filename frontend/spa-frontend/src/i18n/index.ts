import { STRINGS } from './de'

export type StringKey = keyof typeof STRINGS

/**
 * Löst einen UI-Text auf. Keys sind zur Compile-Zeit geprüft; unbekannte
 * Keys können daher nicht ins UI gelangen. Platzhalter (`{name}`) werden
 * über `vars` ersetzt.
 */
export function t(
  key: StringKey,
  vars?: Record<string, string | number>,
): string {
  let text: string = STRINGS[key]
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}

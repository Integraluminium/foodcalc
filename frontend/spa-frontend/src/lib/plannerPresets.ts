/**
 * Named energy presets for meal planning. Users think in "Hauptgericht /
 * Beilage / Dessert" rather than kJ numbers — the presets encode the
 * kitchen's experience values (kJ per portion).
 */
export interface EnergyPreset {
  label: string
  /** Planned energy per portion in kJ. */
  kj: number
  hint: string
}

export const ENERGY_PRESETS: EnergyPreset[] = [
  { label: 'Hauptgericht', kj: 2400, hint: 'Standard-Hauptmahlzeit' },
  { label: 'Beilage', kj: 800, hint: 'Neben anderen Gerichten' },
  { label: 'Custom', kj: -1, hint: 'Trage selbst ein' },
]

/** Finds a preset matching the given kJ value, if any (pure). */
export function presetForKj(kj: number): EnergyPreset | null {
  return ENERGY_PRESETS.find((preset) => preset.kj === kj) ?? null
}

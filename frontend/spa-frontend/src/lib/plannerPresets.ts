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
  { label: 'Reichlich', kj: 3000, hint: 'Hungrige Gruppen / kalte Tage' },
  { label: 'Frühstück', kj: 2000, hint: 'Erste Mahlzeit des Tages' },
  { label: 'Dessert', kj: 1200, hint: 'Nachspeise' },
  { label: 'Beilage', kj: 800, hint: 'Neben anderen Gerichten' },
]

/** Finds a preset matching the given kJ value, if any (pure). */
export function presetForKj(kj: number): EnergyPreset | null {
  return ENERGY_PRESETS.find((preset) => preset.kj === kj) ?? null
}

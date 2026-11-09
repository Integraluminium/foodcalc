import { formatDecimal } from '../../lib/format'
import styles from './AmountInput.module.css'

export interface UnitOption {
  id: number
  name: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  /** Optional unit selector, rendered next to the amount field. */
  units?: UnitOption[]
  unitId?: number
  onUnitChange?: (unitId: number) => void
  /** kg per selected unit; renders the resolved base weight when known. */
  kgPerUnit?: number | null
  /** Stepper increment (also the native input step). */
  step?: number
  min?: string
  placeholder?: string
  ariaLabel?: string
  disabled?: boolean
}

/**
 * Unified amount entry (recipe rows, inventory items, tour positions):
 * numeric field with steppers, optional unit selector and an automatic kg
 * conversion hint — unknown conversions show "?" instead of faking precision.
 */
export function AmountInput({
  value,
  onChange,
  units,
  unitId,
  onUnitChange,
  kgPerUnit,
  step = 1,
  min = '0',
  placeholder,
  ariaLabel,
  disabled = false,
}: Props) {
  const parsed = Number(value)

  const nudge = (direction: 1 | -1) => {
    if (!Number.isFinite(parsed)) return
    const next = Math.round((parsed + direction * step) * 1000) / 1000
    onChange(String(Math.max(next, Number(min) || 0)))
  }

  const converted =
    kgPerUnit != null && Number.isFinite(parsed) ? parsed * kgPerUnit : null

  return (
    <span className={styles.wrap}>
      <span className={styles.amount}>
        <input
          className={`input ${styles.field}`}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          disabled={disabled}
        />
        <span className={styles.steppers}>
          <button
            type="button"
            className={styles.stepBtn}
            onClick={() => nudge(1)}
            aria-label="Erhöhen"
            disabled={disabled}
          >
            ▲
          </button>
          <button
            type="button"
            className={styles.stepBtn}
            onClick={() => nudge(-1)}
            aria-label="Verringern"
            disabled={disabled}
          >
            ▼
          </button>
        </span>
        {units && units.length > 0 && (
          <select
            className={`input ${styles.unit}`}
            value={unitId ?? ''}
            onChange={(event) => onUnitChange?.(Number(event.target.value))}
            aria-label="Einheit"
            disabled={disabled}
          >
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        )}
      </span>
      {kgPerUnit !== undefined && (
        <span
          className={`muted ${styles.conversion}`}
          title={
            converted === null ? 'Keine Umrechnung bekannt' : undefined
          }
        >
          {converted === null ? '= ? kg' : `= ${formatDecimal(converted)} kg`}
        </span>
      )}
    </span>
  )
}

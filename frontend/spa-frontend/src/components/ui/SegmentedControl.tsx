import styles from './SegmentedControl.module.css'

export interface SegmentOption<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel?: string
}

/** Small button-group for filters (Gerichte / Komponenten / Alle). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: Props<T>) {
  return (
    <div className={styles.group} role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={
            option.value === value
              ? `${styles.option} ${styles.active}`
              : styles.option
          }
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

import type {ReactNode} from 'react'
import styles from './SegmentedControl.module.css'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
  disabled?: boolean
}

interface Props<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel?: string
}

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
              : option.disabled ? `${styles.option} ${styles.disabled}`
              : styles.option
          }
          onClick={() => onChange(option.value)}
          disabled={option.disabled}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
}
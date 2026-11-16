import {X} from "lucide-react";
import type {ReactNode} from 'react'
import styles from './SearchBar.module.css'

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  /** Contextual filters (GroupFilterSelect, SegmentedControl, etc.) */
  children?: ReactNode
}

export function SearchBar({
                            value,
                            onChange,
                            placeholder = 'Suchen…',
                            autoFocus = false,
                            children,
                          }: SearchBarProps) {
  return (
    <div className={styles.controls}>
      <div className={styles.inputWrapper}>
        {/*<Search size={16} className={styles.searchIcon} aria-hidden="true" />*/}
        <input
          type="search"
          className={`input ${styles.search}`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
        />
        {value && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => onChange('')}
            aria-label="Suche zurücksetzen"
          >
            <X size={14} />
          </button>
        )}
      </div>


        {children && <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>{children}</div>}
      {/*{children && <div className={styles.filters}>{children}</div>}*/}
    </div>
  )
}
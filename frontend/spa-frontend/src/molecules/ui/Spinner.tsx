import styles from './Spinner.module.css'

const SIZES = { sm: 16, md: 22, lg: 34 } as const

export function Spinner({ size = 'md' }: { size?: keyof typeof SIZES }) {
  return (
    <span
      role="status"
      aria-label="Wird geladen"
      className={styles.spinner}
      style={{ width: SIZES[size], height: SIZES[size] }}
    />
  )
}

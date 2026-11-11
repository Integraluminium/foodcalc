import styles from './Skeleton.module.css'

/**
 * Pulse-Skeletons: Ladezustände in Form der späteren Inhalte statt
 * spontan erscheinender Komponenten. `SkeletonTable` für Data-Grids,
 * `SkeletonCard` für Karten-Stapel.
 */
export function Skeleton({ width, height }: { width?: string; height?: string }) {
  return (
    <span
      className={styles.skeleton}
      style={{ width: width ?? '100%', height: height ?? '0.9rem' }}
    />
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className={styles.table} aria-label="Wird geladen…">
      <div className={styles.headerRow}>
        {Array.from({ length: cols }, (_, index) => (
          <Skeleton key={index} width="70%" height="0.7rem" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className={styles.row}>
          {Array.from({ length: cols }, (_, colIndex) => (
            <Skeleton
              key={colIndex}
              width={colIndex === 0 ? '55%' : '35%'}
              height="0.8rem"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonCards({ count = 2 }: { count?: number }) {
  return (
    <div className={styles.cards}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`card ${styles.cardBlock}`}>
          <div className={styles.cardHeader}>
            <Skeleton width="40%" height="0.9rem" />
            <Skeleton width="20%" height="0.9rem" />
          </div>
          <Skeleton height="0.8rem" />
          <Skeleton height="0.8rem" />
          <Skeleton width="70%" height="0.8rem" />
        </div>
      ))}
    </div>
  )
}

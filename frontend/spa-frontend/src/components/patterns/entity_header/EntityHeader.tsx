import type {ReactNode} from 'react'
import {Badge, type BadgeProps} from '../../ui/badge/Badge.tsx'
import {Skeleton} from '../skeleton/Skeleton.tsx'
import styles from './EntityHeader.module.css'

export interface StatItem {
  key: string
  label: ReactNode
  stats: string
}

export interface EntityHeaderProps {
  title?: ReactNode
  stats?: StatItem[]
  actions?: ReactNode
  comment?: string | null
  badges?: BadgeProps[]
  isPending?: boolean
}

export function EntityHeader({
                               title,
                               stats,
                               actions,
                               comment,
                               badges,
                               isPending = false,
                             }: EntityHeaderProps) {
  if (isPending) {
    return (
      <div className={`card ${styles.header}`} aria-busy="true">
        <div className={styles.headerMain} style={{ flex: 1 }}>
          {title !== undefined && <Skeleton width="45%" height="1.5rem" />}
          <div className={styles.badges}>
            <Skeleton width="72px" height="1.25rem" />
            <Skeleton width="96px" height="1.25rem" />
            <Skeleton width="110px" height="1.25rem" />
          </div>
          <div className={styles.stats}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.stat}>
                <Skeleton width="60%" height="0.75rem" />
                <Skeleton width="45%" height="1.25rem" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`card ${styles.header}`}>
      <div className={styles.headerMain}>
        {title && <h1 className="section-title">{title}</h1>}
        {comment && <p className="muted">{comment}</p>}
        {badges && badges.length > 0 && (
          <div className={styles.badges}>
            {badges.map((badge, index) => (
              <Badge key={badge.title ?? index} {...badge} />
            ))}
          </div>
        )}
        {stats && stats.length > 0 && (
          <div className={styles.stats}>
            {stats.map(({ key, label, stats: value }) => (
              <div key={key} className={styles.stat}>
                <span className="muted">{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
      {actions && <div className={styles.headerActions}>{actions}</div>}
    </div>
  )
}
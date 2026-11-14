import type {ReactNode} from "react";
import {Badge, type BadgeItem} from "../../ui/badge/Badge.tsx";
import styles from './EntityHeader.module.css';

export interface StatItem {
  key: string
  label: ReactNode
  stats: string
}

export interface EntityHeaderProps {
  stats?: StatItem[]
  actions: ReactNode
  comment?: string
  badges?: BadgeItem[]
}

export function EntityHeader({stats, actions, comment, badges}: EntityHeaderProps )
  {
    return (
      <div className={`card ${styles.header}`}>
        <div className={styles.headerMain}>

          {comment && <p className="muted">{comment}</p>}
          {badges && badges.length > 0 && (
            <div className={styles.badges}>
              {badges.map(({label, variant, children}: BadgeItem) => (
                <Badge key={label} variant={variant}>
                  {children}
                </Badge>
              ))}
            </div>
          )}

          <div className={styles.stats}>
            {stats && stats.map(({key, label, stats}:StatItem) => (
              <div key={key} className={styles.stat}>
                <span className="muted">{label}</span>
                <strong>{stats}</strong>
              </div>
            ))}
          </div>
        </div>

        {/*<hr/>*/}
        <div className={styles.headerActions}>
          {actions}
        </div>
      </div>
    )
  }
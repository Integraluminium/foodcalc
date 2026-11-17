import type {ReactNode} from 'react'
import styles from './CardSection.module.css'

export interface CardSectionProps {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  highlight?: boolean
}

export function CardSection({
                              title,
                              subtitle,
                              actions,
                              children,
                              highlight = true,
                            }: CardSectionProps) {
  return (
    <section className={`${styles.section} ${highlight ? "card" : ''}`}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          {title && <h2 className="section-subtitle">{title}</h2>}
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {children}
    </section>
  )
}
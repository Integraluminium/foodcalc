import type {ReactNode} from 'react'
import styles from './Badge.module.css'

export type BadgeVariant = 'success' | 'info' | 'warning' | 'neutral' | 'danger'

export interface BadgeProps {
  children: ReactNode
  icon?: ReactNode
  variant?: BadgeVariant
  title?: string
  className?: string
}

export function Badge({
                        children,
                        icon,
                        variant = 'neutral',
                        title,
                        className,
                      }: BadgeProps) {
  const classes = [styles.badge, styles[variant], className]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} title={title}>
      {icon}
      <span>{children}</span>
    </span>
  )
}
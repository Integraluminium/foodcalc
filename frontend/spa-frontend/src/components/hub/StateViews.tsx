import type { ReactNode } from 'react'
import { t } from '../../i18n'
import { SkeletonTable } from '../ui/Skeleton'
import styles from './StateViews.module.css'

/** Consistent loading / error / empty states for hub lists and sections. */

export function LoadingState() {
  return (
    <div className={styles.state}>
      <SkeletonTable rows={5} cols={4} />
      <span className={styles.visuallyHidden}>{t('state.loading')}</span>
    </div>
  )
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className={styles.state}>
      <p className="secondary">{message ?? t('state.error')}</p>
    </div>
  )
}

export function EmptyState({
  message,
  action,
}: {
  message: string
  action?: ReactNode
}) {
  return (
    <div className={styles.state}>
      <p className="muted">{message}</p>
      {action}
    </div>
  )
}

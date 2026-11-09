import type { ReactNode } from 'react'
import { t } from '../../i18n'
import { Spinner } from '../ui/Spinner'
import styles from './StateViews.module.css'

/** Consistent loading / error / empty states for hub lists and sections. */

export function LoadingState() {
  return (
    <div className={styles.state}>
      <Spinner />
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
